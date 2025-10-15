from __future__ import annotations

import logging
from typing import Dict, Generator, List, Optional

from app.config import ModerationAction, get_settings
from app.moderation import ModerationResult, evaluate_text, get_moderation_controller
from app.personas import load_persona_bundle
from app.router import RoutingContext, build_routing_context, select_model
from app.state import Attachment, ChatState
from storage.memory_store import MemoryEntry, get_memory_store
from storage.session_store import SessionStore
from storage.usage_tracker import get_usage_tracker
from tools.file_qna import get_fileqa_manager
from tools.openai_client import StreamChunk, StreamResult, complete_response, stream_response
from tools.tokenizer import safe_truncate_messages
from tools.search import web_search
from tools.code_executor import execute as exec_code, format_result as format_code_result
from tools.data_viz import dataframe_to_html

logger = logging.getLogger(__name__)


class ModerationError(RuntimeError):
    def __init__(self, result: ModerationResult) -> None:
        self.result = result
        super().__init__(result.reason or "Request blocked by moderation policy")


class ChatOrchestrator:
    def __init__(self) -> None:
        self.settings = get_settings()
        controller = get_moderation_controller()
        self.moderation_controller = controller
        self.memory_store = get_memory_store()
        self.fileqa_manager = get_fileqa_manager()
        self.usage_tracker = get_usage_tracker()
        sessions_dir = controller.settings.data_dir / "sessions"
        self.session_store = SessionStore(sessions_dir)
        self.max_prompt_tokens = min(6000, self.settings.max_output_tokens * 4)

    def _build_context(self, session_id: str, user_text: str, tools: List[str]) -> str:
        if "file_qna" in tools:
            return self.fileqa_manager.build_context(session_id, user_text)
        return ""

    def _tool_context(self, state: ChatState, user_text: str, tools: List[str]) -> str:
        sections: List[str] = []
        trimmed = user_text.strip()
        if "search" in tools:
            query = None
            if trimmed.startswith("/search"):
                query = trimmed[len("/search") :].strip() or user_text
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
                        lines.append(f"- {item.title}: {item.snippet} ({item.url})")
                    sections.append("\n".join(lines))
        if "code" in tools and trimmed.startswith("!run"):
            code = trimmed[len("!run") :].strip()
            if not code and "```" in user_text:
                start = user_text.find("```") + 3
                end = user_text.rfind("```")
                code = user_text[start:end].strip()
            if code:
                result = exec_code(code)
                code_output = format_code_result(result)
                section_lines = ["# Code Execution", "```text", code_output, "```"]
                for name, value in result.globals_snapshot.items():
                    try:
                        import pandas as pd  # type: ignore

                        if isinstance(value, pd.DataFrame):
                            section_lines.append(f"## DataFrame: {name}")
                            section_lines.append(dataframe_to_html(value))
                    except Exception:  # pragma: no cover - optional dependency
                        continue
                sections.append("\n".join(section_lines))
        return "\n\n".join(sections)

    def _memory_context(self, state: ChatState, user_text: str) -> str:
        if not state.memory_enabled:
            return ""
        short_term = self.memory_store.get_short_term(state.session_id)
        lines = []
        if short_term:
            lines.append("# Short Term Memory")
            for item in short_term[-5:]:
                lines.append(f"- {item['role']}: {item['content']}")
        search_hits = self.memory_store.search_long_term(user_text)
        if search_hits:
            lines.append("# Long Term Memory")
            for hit in search_hits:
                lines.append(f"- {hit['content']}")
        return "\n".join(lines)

    def _prepare_messages(
        self,
        state: ChatState,
        user_text: str,
        context_text: str,
        memory_text: str,
        model: str,
    ) -> List[Dict]:
        persona_context = load_persona_bundle(state.persona_names)
        history_plain = [
            {"role": msg.get("role", "user"), "content": msg.get("content", "")}
            for msg in state.messages
        ]
        history_plain.append({"role": "user", "content": user_text})
        truncated = safe_truncate_messages(history_plain, model, self.max_prompt_tokens)
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

    def _handle_moderation(self, state: ChatState, user_text: str) -> ModerationResult:
        if not state.moderation_enabled:
            return ModerationResult(ModerationAction.ALLOW, False, {}, {})
        result = evaluate_text(state.session_id, user_text)
        if result.action == ModerationAction.BLOCK:
            raise ModerationError(result)
        return result

    def stream_reply(
        self,
        state: ChatState,
        user_text: str,
        attachments: Optional[List[Attachment]] = None,
    ) -> Generator[str, None, Dict[str, any]]:
        attachments = attachments or []
        state.attachments.extend(attachments)
        state.last_error = None
        moderation_result = self._handle_moderation(state, user_text)

        history_message_count = len(state.messages)
        routing_context = build_routing_context(
            text=user_text,
            persona_names=state.persona_names,
            attachments=state.attachments,
            history_message_count=history_message_count,
            override_model=state.model_override,
            force_vision=any(att.type == "image" for att in attachments),
            temperature=state.temperature,
        )
        model_choice = select_model(routing_context)
        state.active_model = model_choice.model
        logger.info(
            "Routing request | session=%s model=%s tools=%s chars=%s",
            state.session_id,
            model_choice.model,
            model_choice.tools,
            len(user_text),
        )

        context_text = self._build_context(state.session_id, user_text, model_choice.tools)
        tool_text = self._tool_context(state, user_text, model_choice.tools)
        if tool_text:
            context_text = (context_text + "\n\n" + tool_text).strip() if context_text else tool_text
        trimmed = user_text.strip()
        if trimmed.startswith("/search"):
            user_payload = trimmed[len("/search") :].strip() or user_text
        elif trimmed.startswith("!run"):
            user_payload = "Please review the execution output provided in the tool context and respond accordingly."
        else:
            user_payload = user_text

        memory_text = self._memory_context(state, user_payload)

        # Append user message to state and persistence before streaming
        attachment_payload = [att.__dict__ for att in attachments]
        state.add_message(
            "user",
            user_text,
            attachments=attachment_payload,
            model=model_choice.model,
            tools=model_choice.tools,
        )
        self.session_store.append_message(
            session_id=state.session_id,
            role="user",
            content=user_text,
            metadata={"attachments": attachment_payload, "model": model_choice.model},
        )
        if state.memory_enabled:
            self.memory_store.append_short_term(state.session_id, "user", user_text)

        messages = self._prepare_messages(state, user_payload, context_text, memory_text, model_choice.model)

        def _finalize_response(assistant_text: str, result: StreamResult) -> Dict[str, any]:
            state.add_message(
                "assistant", assistant_text, model=model_choice.model, tools=model_choice.tools
            )
            self.session_store.append_message(
                session_id=state.session_id,
                role="assistant",
                content=assistant_text,
                metadata={"model": model_choice.model, "tools": model_choice.tools},
            )
            if state.memory_enabled:
                self.memory_store.append_short_term(state.session_id, "assistant", assistant_text)
                if len(state.messages) % 8 == 0 and assistant_text:
                    summary = assistant_text[:200]
                    entry = MemoryEntry(
                        session_id=state.session_id,
                        role="assistant",
                        content=summary,
                        tags=list(state.persona_names),
                    )
                    self.memory_store.add_long_term(entry)

            usage = result.usage
            cost = usage.cost_usd(model_choice.model)
            state.token_usage.update(usage.prompt_tokens, usage.completion_tokens, cost)
            self.usage_tracker.update(
                session_id=state.session_id,
                model=model_choice.model,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens,
                cost_usd=cost,
            )
            self.session_store.update_usage(
                session_id=state.session_id,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens,
                cost_usd=cost,
            )

            state.last_error = None
            return {
                "model": model_choice.model,
                "moderation": moderation_result.action.value,
                "tools": model_choice.tools,
                "usage": {
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "cost_usd": cost,
                },
            }

        def _generator() -> Generator[str, None, Dict[str, any]]:
            try:
                stream = stream_response(
                    input_messages=messages,
                    model=model_choice.model,
                    temperature=state.temperature,
                    max_output_tokens=self.settings.max_output_tokens,
                    top_p=state.top_p,
                    presence_penalty=state.presence_penalty,
                    frequency_penalty=state.frequency_penalty,
                )
            except Exception as exc:
                logger.warning(
                    "Streaming failed, falling back to sync response | session=%s error=%s",
                    state.session_id,
                    exc,
                    exc_info=True,
                )
                try:
                    result = complete_response(
                        input_messages=messages,
                        model=model_choice.model,
                        temperature=state.temperature,
                        max_output_tokens=self.settings.max_output_tokens,
                        top_p=state.top_p,
                        presence_penalty=state.presence_penalty,
                        frequency_penalty=state.frequency_penalty,
                    )
                except Exception as final_exc:
                    state.last_error = str(final_exc)
                    logger.error(
                        "Responses API call failed | session=%s error=%s",
                        state.session_id,
                        final_exc,
                        exc_info=True,
                    )
                    raise
                assistant_text = result.text
                if assistant_text:
                    yield assistant_text
                return _finalize_response(assistant_text, result)

            aggregated: List[str] = []
            try:
                while True:
                    chunk: StreamChunk = next(stream)
                    aggregated.append(chunk.text)
                    yield chunk.text
            except StopIteration as stop:
                stream_result_payload = stop.value
                assistant_text = "".join(aggregated)
                return _finalize_response(assistant_text, stream_result_payload)

        return _generator()

    def stream_response(self, state: ChatState, user_text: str):
        """Compatibility method for UI - delegates to stream_reply"""
        return self.stream_reply(state, user_text)


_orchestrator: Optional[ChatOrchestrator] = None


def get_orchestrator() -> ChatOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = ChatOrchestrator()
    return _orchestrator


__all__ = ["ChatOrchestrator", "get_orchestrator", "ModerationError"]
