from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional

from app.personas import load_persona_bundle
from app.state import Attachment, ChatState
from storage.memory_store import MemoryStore
from tools.code_executor import execute as exec_code, format_result as format_code_result
from tools.data_viz import dataframe_to_html
from tools.file_qna import FileQAManager
from tools.search import web_search
from tools.tokenizer import safe_truncate_messages

logger = logging.getLogger(__name__)

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")


def sanitize_tool_output(text: str, max_chars: int = 2000) -> str:
    """Clamp length and remove control characters / dangerous tags."""
    cleaned = _CONTROL_CHARS.sub("", text)
    cleaned = cleaned.replace("<script", "&lt;script")
    if len(cleaned) > max_chars:
        cleaned = cleaned[: max_chars - 3] + "..."
    return cleaned


class ContextBuilder:
    def __init__(self, memory_store: MemoryStore, fileqa_manager: FileQAManager) -> None:
        self.memory_store = memory_store
        self.fileqa_manager = fileqa_manager

    def build_file_context(self, session_id: str, user_text: str, tools: List[str]) -> str:
        if "file_qna" in tools:
            try:
                return self.fileqa_manager.build_context(session_id, user_text)
            except Exception as exc:
                logger.warning("File Q&A context failed: %s", exc, exc_info=True)
        return ""

    def build_tool_context(self, state: ChatState, user_text: str, tools: List[str]) -> str:
        sections: List[str] = []
        trimmed = user_text.strip()

        if "search" in tools:
            query = None
            if trimmed.startswith("/search"):
                query = trimmed[len("/search"):].strip() or user_text
            elif len(user_text) > 220:
                query = user_text
            if query:
                try:
                    results = web_search(query, provider=state.search_provider, max_results=4)
                except Exception as exc:  # pragma: no cover - network failure path
                    logger.warning("Search failed: %s", exc)
                    results = []
                if results:
                    lines = ["# Web Search", f"Query: {query}"]
                    for item in results:
                        snippet = sanitize_tool_output(item.snippet, 480)
                        lines.append(f"- {item.title}: {snippet} ({item.url})")
                    sections.append("\n".join(lines))

        if "code" in tools and trimmed.startswith("!run"):
            code = trimmed[len("!run"):].strip()
            if not code and "```" in user_text:
                start = user_text.find("```") + 3
                end = user_text.rfind("```")
                code = user_text[start:end].strip()
            if code:
                try:
                    result = exec_code(code)
                    code_output = format_code_result(result)
                    code_output = sanitize_tool_output(code_output, 2000)
                except Exception as exc:
                    logger.error("Code execution failed: %s", exc, exc_info=True)
                    result = None
                    code_output = sanitize_tool_output(str(exc), 512)
                section_lines = ["# Code Execution", "```text", code_output, "```"]
                snapshot = getattr(result, "globals_snapshot", {}) if result else {}
                for name, value in snapshot.items():
                    try:
                        import pandas as pd  # type: ignore

                        if isinstance(value, pd.DataFrame):
                            section_lines.append(f"## DataFrame: {name}")
                            section_lines.append(dataframe_to_html(value))
                    except Exception:  # pragma: no cover - optional dependency
                        continue
                sections.append("\n".join(section_lines))

        return "\n\n".join(sections) if sections else ""

    def build_memory_context(self, state: ChatState, user_payload: str) -> str:
        if not state.memory_enabled:
            return ""
        lines: List[str] = []
        short_term = self.memory_store.get_short_term(state.session_id)
        if short_term:
            lines.append("# Short Term Memory")
            for item in short_term[-5:]:
                lines.append(f"- {item['role']}: {item['content']}")
        search_hits = self.memory_store.search_long_term(user_payload)
        if search_hits:
            lines.append("# Long Term Memory")
            for hit in search_hits:
                lines.append(f"- {hit['content']}")
        return "\n".join(lines)

    def prepare_messages(
        self,
        state: ChatState,
        user_text: str,
        context_text: str,
        memory_text: str,
        model: str,
        max_prompt_tokens: int,
    ) -> List[Dict]:
        persona_context = load_persona_bundle(state.persona_names)
        history_plain = [
            {"role": msg.get("role", "user"), "content": msg.get("content", "")}
            for msg in state.messages
        ]
        history_plain.append({"role": "user", "content": user_text})
        truncated = safe_truncate_messages(history_plain, model, max_prompt_tokens)

        formatted: List[Dict] = [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": persona_context}],
            }
        ]
        if context_text:
            formatted.append(
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": context_text}],
                }
            )
        if memory_text:
            formatted.append(
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": memory_text}],
                }
            )
        for message in truncated:
            role = message.get("role", "user")
            content_type = "output_text" if role == "assistant" else "input_text"
            formatted.append(
                {
                    "role": role,
                    "content": [{"type": content_type, "text": message.get("content", "")}],
                }
            )
        return formatted


__all__ = ["ContextBuilder"]
