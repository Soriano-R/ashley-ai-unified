from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import get_settings


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
    def __init__(self, dir_path: Optional[Path] = None) -> None:
        if dir_path is None:
            dir_path = get_settings().data_dir / "sessions"
        self.dir = Path(dir_path)
        self.dir.mkdir(parents=True, exist_ok=True)

    def _path(self, session_id: str) -> Path:
        return self.dir / f"{session_id}.json"

    def list(self) -> List[SessionRecord]:
        out: List[SessionRecord] = []
        for file in sorted(self.dir.glob("*.json")):
            try:
                data = json.loads(file.read_text(encoding="utf-8"))
                out.append(SessionRecord(**data))
            except Exception:
                continue
        out.sort(key=lambda r: r.created_at, reverse=True)
        return out

    def create_from_state(self, state) -> SessionRecord:
        session_id = state.session_id or uuid.uuid4().hex[:8]
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
        path = self._path(record.id)
        path.write_text(json.dumps(asdict(record), ensure_ascii=False, indent=2), encoding="utf-8")

    def load(self, session_id: str) -> SessionRecord:
        data = json.loads(self._path(session_id).read_text(encoding="utf-8"))
        return SessionRecord(**data)

    def append_message(self, *, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        record = self.load(session_id) if self._path(session_id).exists() else SessionRecord(
            id=session_id,
            title="Untitled",
            created_at=time.time(),
            persona_names=[],
            messages=[],
        )
        record.messages.append({"role": role, "content": content, **({"metadata": metadata} if metadata else {})})
        self.save(record)

    def update_usage(
        self,
        *,
        session_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
    ) -> None:
        record = self.load(session_id)
        total = prompt_tokens + completion_tokens
        record.usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total,
            "cost_usd": cost_usd,
        }
        self.save(record)

    def rename(self, session_id: str, new_title: str) -> None:
        record = self.load(session_id)
        record.title = new_title or "Untitled"
        self.save(record)

    def delete(self, session_id: str) -> None:
        path = self._path(session_id)
        if path.exists():
            path.unlink()

    def export_markdown(self, session_id: str, out_path: Path) -> None:
        record = self.load(session_id)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        lines: List[str] = [f"# {record.title}"]
        for msg in record.messages:
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "")
            lines.append(f"\n## {role}\n\n{content}")
        out_path.write_text("\n".join(lines), encoding="utf-8")

    def export_pdf(self, session_id: str, out_path: Path) -> None:
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
            text = f"{role}: {content}".strip()
            if not text:
                text = role
            pdf.multi_cell(page_width, 8, txt=text)
        pdf.output(str(out_path))


__all__ = ["SessionStore", "SessionRecord"]
