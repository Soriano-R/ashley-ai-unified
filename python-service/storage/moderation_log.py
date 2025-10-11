from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, List

from app.config import get_settings


def _log_path() -> Path:
    settings = get_settings()
    path = settings.data_dir / "moderation_log.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.touch()
    return path


def log_event(*, session_id: str, category: str, action: str, text_snippet: str, detail: Dict[str, Any]) -> None:
    entry = {
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "session_id": session_id,
        "category": category,
        "action": action,
        "text_snippet": text_snippet,
        "detail": detail,
    }
    path = _log_path()
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


class ModerationLog:
    def __init__(self) -> None:
        self.path = _log_path()

    def list(self, limit: int = 200) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        try:
            with self.path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rows.append(json.loads(line))
                    except Exception:
                        continue
        except FileNotFoundError:
            return []
        return rows[-limit:]


def get_moderation_log() -> ModerationLog:
    return ModerationLog()


__all__ = ["log_event", "get_moderation_log", "ModerationLog"]
