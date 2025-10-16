from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, Optional

from app.config import get_settings


_DB_LOCK = threading.RLock()
_CONNECTION: Optional[sqlite3.Connection] = None


def _database_path() -> Path:
    settings = get_settings()
    db_path = settings.data_dir / "ashley_ai.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


def _ensure_connection() -> sqlite3.Connection:
    global _CONNECTION
    if _CONNECTION is None:
        path = _database_path()
        _CONNECTION = sqlite3.connect(str(path), check_same_thread=False)
        _CONNECTION.row_factory = sqlite3.Row
        _CONNECTION.execute("PRAGMA journal_mode=WAL;")
        _CONNECTION.execute("PRAGMA foreign_keys=ON;")
        _initialise_schema(_CONNECTION)
    return _CONNECTION


def _initialise_schema(conn: sqlite3.Connection) -> None:
    with conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at REAL NOT NULL,
                persona_names TEXT NOT NULL,
                settings_json TEXT
            );

            CREATE TABLE IF NOT EXISTS session_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata_json TEXT,
                created_at REAL DEFAULT (strftime('%s','now'))
            );

            CREATE TABLE IF NOT EXISTS session_usage (
                session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                total_tokens INTEGER,
                cost_usd REAL
            );

            CREATE TABLE IF NOT EXISTS memory_short (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at REAL DEFAULT (strftime('%s','now'))
            );

            CREATE TABLE IF NOT EXISTS memory_long (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tags_json TEXT,
                created_at REAL DEFAULT (strftime('%s','now'))
            );

            CREATE TABLE IF NOT EXISTS memory_vectors (
                memory_id INTEGER PRIMARY KEY REFERENCES memory_long(id) ON DELETE CASCADE,
                vector BLOB NOT NULL
            );
            """
        )


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    conn = _ensure_connection()
    with _DB_LOCK:
        yield conn


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False)


def json_loads(data: Optional[str]) -> Any:
    if not data:
        return None
    return json.loads(data)


__all__ = ["get_connection", "json_dumps", "json_loads"]
