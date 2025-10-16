from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .database import get_connection, json_dumps, json_loads


@dataclass
class MemoryEntry:
    session_id: str
    role: str
    content: str
    tags: List[str]


class MemoryStore:
    def append_short_term(self, session_id: str, role: str, content: str) -> None:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO memory_short (session_id, role, content) VALUES (?, ?, ?)",
                (session_id, role, content),
            )

    def get_short_term(self, session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT session_id, role, content, created_at
                FROM memory_short
                WHERE session_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (session_id, limit),
            ).fetchall()
        return [dict(row) for row in reversed(rows)]

    def add_long_term(self, entry: MemoryEntry) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO memory_long (session_id, role, content, tags_json)
                VALUES (?, ?, ?, ?)
                """,
                (entry.session_id, entry.role, entry.content, json_dumps(entry.tags)),
            )

    def search_long_term(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        q = f"%{query.strip().lower()}%"
        if not query.strip():
            return []
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT session_id, role, content, tags_json, created_at
                FROM memory_long
                WHERE lower(content) LIKE ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (q, limit),
            ).fetchall()
        results: List[Dict[str, Any]] = []
        for row in rows:
            results.append(
                {
                    "session_id": row["session_id"],
                    "role": row["role"],
                    "content": row["content"],
                    "tags": json_loads(row["tags_json"]) or [],
                    "created_at": row["created_at"],
                }
            )
        return results


_store: Optional[MemoryStore] = None


def get_memory_store() -> MemoryStore:
    global _store
    if _store is None:
        _store = MemoryStore()
    return _store


__all__ = ["MemoryStore", "MemoryEntry", "get_memory_store"]
