from __future__ import annotations

from dataclasses import dataclass
import hashlib
from typing import Any, Dict, List, Optional

import numpy as np

from .database import get_connection, json_dumps, json_loads

try:  # pragma: no cover - optional dependency
    import faiss  # type: ignore

    _FAISS_AVAILABLE = True
except Exception:  # pragma: no cover
    faiss = None
    _FAISS_AVAILABLE = False


_VECTOR_DIM = 256


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
            conn.execute(
                """
                DELETE FROM memory_short
                WHERE session_id = ? AND id NOT IN (
                    SELECT id FROM memory_short WHERE session_id = ? ORDER BY id DESC LIMIT 50
                )
                """,
                (session_id, session_id),
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
        vector = _embed_text(entry.content)
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO memory_long (session_id, role, content, tags_json)
                VALUES (?, ?, ?, ?)
                """,
                (entry.session_id, entry.role, entry.content, json_dumps(entry.tags)),
            )
            memory_id = cursor.lastrowid
            conn.execute(
                "INSERT OR REPLACE INTO memory_vectors (memory_id, vector) VALUES (?, ?)",
                (memory_id, vector.tobytes()),
            )
            conn.execute(
                """
                DELETE FROM memory_long
                WHERE session_id = ?
                AND id NOT IN (
                    SELECT id FROM memory_long WHERE session_id = ? ORDER BY id DESC LIMIT 200
                )
                """,
                (entry.session_id, entry.session_id),
            )
            conn.execute(
                "DELETE FROM memory_vectors WHERE memory_id NOT IN (SELECT id FROM memory_long)"
            )

    def search_long_term(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        cleaned = query.strip()
        if not cleaned:
            return []

        query_vector = _embed_text(cleaned)

        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT ml.id, ml.session_id, ml.role, ml.content, ml.tags_json, ml.created_at, mv.vector
                FROM memory_long AS ml
                JOIN memory_vectors AS mv ON mv.memory_id = ml.id
                """,
            ).fetchall()

        if not rows:
            return []

        vectors = np.stack([np.frombuffer(row["vector"], dtype=np.float32) for row in rows])

        if _FAISS_AVAILABLE and vectors.size:
            index = faiss.IndexFlatIP(_VECTOR_DIM)
            index.add(vectors)
            scores, indices = index.search(query_vector.reshape(1, -1), min(limit, len(rows)))
            order = [int(idx) for idx in indices[0] if idx >= 0][:limit]
        else:
            sims = vectors @ query_vector
            order = np.argsort(-sims)[:limit].tolist()

        results: List[Dict[str, Any]] = []
        for idx in order:
            row = rows[int(idx)]
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


def _embed_text(text: str) -> np.ndarray:
    tokens = text.lower().split()
    vec = np.zeros(_VECTOR_DIM, dtype=np.float32)
    if not tokens:
        return vec

    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=16).digest()
        index = int.from_bytes(digest[:4], "little") % _VECTOR_DIM
        vec[index] += 1.0

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec
