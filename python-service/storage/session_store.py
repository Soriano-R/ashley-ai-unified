from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

from app.state import ChatState
from .database import get_connection, json_dumps, json_loads


@dataclass
class SessionRecord:
    id: str
    title: str
    created_at: float
    persona_names: List[str]
    messages: List[Dict[str, Any]]
    usage: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None


class SessionStore:
    """SQLite-backed session persistence."""

    def ensure_session(self, state: ChatState) -> None:
        settings_blob = {
            "model": state.active_model,
            "temperature": state.temperature,
            "top_p": state.top_p,
            "memory_enabled": state.memory_enabled,
        }
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO sessions (id, title, created_at, persona_names, settings_json)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    persona_names=excluded.persona_names,
                    settings_json=excluded.settings_json
                """,
                (
                    state.session_id,
                    state.title or "Untitled",
                    time.time(),
                    json_dumps(list(state.persona_names)),
                    json_dumps(settings_blob),
                ),
            )

    def list(self) -> List[SessionRecord]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT id, title, created_at, persona_names, settings_json FROM sessions ORDER BY created_at DESC"
            ).fetchall()

        records: List[SessionRecord] = []
        for row in rows:
            session_id = row["id"]
            messages = self._load_messages(session_id)
            usage = self._load_usage(session_id)
            records.append(
                SessionRecord(
                    id=session_id,
                    title=row["title"],
                    created_at=row["created_at"],
                    persona_names=json.loads(row["persona_names"]),
                    messages=messages,
                    usage=usage,
                    settings=json_loads(row["settings_json"]),
                )
            )
        return records

    def create_from_state(self, state: ChatState) -> SessionRecord:
        session_id = state.session_id or uuid.uuid4().hex
        record = SessionRecord(
            id=session_id,
            title=state.title or "Untitled",
            created_at=time.time(),
            persona_names=list(state.persona_names),
            messages=list(state.messages),
            usage=None,
            settings={
                "model": state.active_model,
                "temperature": state.temperature,
                "top_p": state.top_p,
                "memory_enabled": state.memory_enabled,
            },
        )
        self.save(record)
        return record

    def save(self, record: SessionRecord) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO sessions (id, title, created_at, persona_names, settings_json)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    created_at=excluded.created_at,
                    persona_names=excluded.persona_names,
                    settings_json=excluded.settings_json
                """,
                (
                    record.id,
                    record.title,
                    record.created_at,
                    json_dumps(record.persona_names),
                    json_dumps(record.settings),
                ),
            )
            conn.execute("DELETE FROM session_messages WHERE session_id = ?", (record.id,))
            conn.executemany(
                """
                INSERT INTO session_messages (session_id, role, content, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    (
                        record.id,
                        msg.get("role", "user"),
                        msg.get("content", ""),
                        json_dumps(msg.get("metadata")),
                        msg.get("timestamp", time.time()),
                    )
                    for msg in record.messages
                ],
            )
            if record.usage:
                self.update_usage(
                    session_id=record.id,
                    prompt_tokens=record.usage.get("prompt_tokens", 0),
                    completion_tokens=record.usage.get("completion_tokens", 0),
                    cost_usd=record.usage.get("cost_usd", 0.0),
                )

    def load(self, session_id: str) -> SessionRecord:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT id, title, created_at, persona_names, settings_json FROM sessions WHERE id = ?",
                (session_id,),
            ).fetchone()

        if row is None:
            raise FileNotFoundError(f"Session {session_id} not found")

        messages = self._load_messages(session_id)
        usage = self._load_usage(session_id)
        return SessionRecord(
            id=row["id"],
            title=row["title"],
            created_at=row["created_at"],
            persona_names=json.loads(row["persona_names"]),
            messages=messages,
            usage=usage,
            settings=json_loads(row["settings_json"]),
        )

    def append_message(
        self,
        *,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self._ensure_session(session_id)
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO session_messages (session_id, role, content, metadata_json)
                VALUES (?, ?, ?, ?)
                """,
                (session_id, role, content, json_dumps(metadata)),
            )

    def update_usage(
        self,
        *,
        session_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
    ) -> None:
        total = prompt_tokens + completion_tokens
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO session_usage (session_id, prompt_tokens, completion_tokens, total_tokens, cost_usd)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    prompt_tokens=excluded.prompt_tokens,
                    completion_tokens=excluded.completion_tokens,
                    total_tokens=excluded.total_tokens,
                    cost_usd=excluded.cost_usd
                """,
                (session_id, prompt_tokens, completion_tokens, total, cost_usd),
            )

    def rename(self, session_id: str, new_title: str) -> None:
        with get_connection() as conn:
            conn.execute("UPDATE sessions SET title = ? WHERE id = ?", (new_title or "Untitled", session_id))

    def delete(self, session_id: str) -> None:
        with get_connection() as conn:
            conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

    def export_markdown(self, session_id: str, out_path) -> None:
        record = self.load(session_id)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        lines: List[str] = [f"# {record.title}"]
        for msg in record.messages:
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "")
            lines.append(f"\n## {role}\n\n{content}")
        out_path.write_text("\n".join(lines), encoding="utf-8")

    def export_pdf(self, session_id: str, out_path) -> None:
        from fpdf import FPDF  # type: ignore

        record = self.load(session_id)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        try:
            pdf.set_font("Arial", size=12)
        except Exception:
            pdf.set_font("Helvetica", size=12)
        page_width = pdf.w - 2 * pdf.l_margin
        pdf.multi_cell(page_width, 10, txt=record.title)
        for msg in record.messages:
            role = msg.get("role", "user").upper()
            content = msg.get("content", "")
            text = f"{role}: {content}".strip() or role
            pdf.multi_cell(page_width, 8, txt=text)
        pdf.output(str(out_path))

    # Internal helpers -------------------------------------------------

    def _load_messages(self, session_id: str) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT role, content, metadata_json, created_at FROM session_messages WHERE session_id = ? ORDER BY id",
                (session_id,),
            ).fetchall()
        messages: List[Dict[str, Any]] = []
        for row in rows:
            metadata = json_loads(row["metadata_json"])
            message = {
                "role": row["role"],
                "content": row["content"],
                "timestamp": row["created_at"],
            }
            if metadata:
                message["metadata"] = metadata
            messages.append(message)
        return messages

    def _load_usage(self, session_id: str) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT prompt_tokens, completion_tokens, total_tokens, cost_usd FROM session_usage WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "prompt_tokens": row["prompt_tokens"],
            "completion_tokens": row["completion_tokens"],
            "total_tokens": row["total_tokens"],
            "cost_usd": row["cost_usd"],
        }

    def _ensure_session(self, session_id: str) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO sessions (id, title, created_at, persona_names)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
                """,
                (session_id, "Untitled", time.time(), json_dumps([])),
            )


__all__ = ["SessionStore", "SessionRecord"]
