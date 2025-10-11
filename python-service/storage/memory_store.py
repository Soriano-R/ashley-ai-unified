from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import get_settings


@dataclass
class MemoryEntry:
    session_id: str
    role: str
    content: str
    tags: List[str]


class MemoryStore:
    def __init__(self, root: Optional[Path] = None) -> None:
        settings = get_settings()
        self.root = (root or settings.data_dir) / "memory"
        self.root.mkdir(parents=True, exist_ok=True)
        self.short_path = self.root / "short_term.jsonl"
        if not self.short_path.exists():
            self.short_path.touch()
        self.long_path = self.root / "long_term.jsonl"
        if not self.long_path.exists():
            self.long_path.touch()

    def append_short_term(self, session_id: str, role: str, content: str) -> None:
        rec = {"session_id": session_id, "role": role, "content": content}
        with self.short_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    def get_short_term(self, session_id: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            with self.short_path.open("r", encoding="utf-8") as f:
                for line in f:
                    try:
                        rec = json.loads(line)
                        if rec.get("session_id") == session_id:
                            out.append(rec)
                    except Exception:
                        continue
        except FileNotFoundError:
            return []
        return out[-20:]

    def add_long_term(self, entry: MemoryEntry) -> None:
        with self.long_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(entry), ensure_ascii=False) + "\n")

    def search_long_term(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        hits: List[Dict[str, Any]] = []
        q = query.lower().strip()
        if not q:
            return []
        try:
            with self.long_path.open("r", encoding="utf-8") as f:
                for line in f:
                    try:
                        rec = json.loads(line)
                        if q in rec.get("content", "").lower():
                            hits.append(rec)
                    except Exception:
                        continue
        except FileNotFoundError:
            return []
        return hits[:limit]


_store: Optional[MemoryStore] = None


def get_memory_store() -> MemoryStore:
    global _store
    if _store is None:
        _store = MemoryStore()
    return _store


__all__ = ["MemoryStore", "MemoryEntry", "get_memory_store"]
