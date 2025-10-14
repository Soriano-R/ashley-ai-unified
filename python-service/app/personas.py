from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable, List, Tuple
import threading

from app.persona_registry import (
    PERSONA_REGISTRY,
    get_persona,
    list_persona_ids,
    persona_metadata_dict,
    persona_files,
)


ASHLEY_HEADER = (
    "You are Ashley — warm, affectionate, technically sharp when needed. "
    "Keep responses grounded, emotionally intelligent, and avoid robotic tone."
    "\nIf asked for professional personas, adapt expertise accordingly."
)

_persona_file_cache: Dict[str, Tuple[float, str]] = {}
_cache_lock = threading.Lock()


def clear_persona_cache() -> None:
    """Clears cached persona prompt contents."""
    with _cache_lock:
        _persona_file_cache.clear()


def _read_persona_file(path: str) -> str:
    file_path = Path(path)
    mtime = file_path.stat().st_mtime if file_path.exists() else None
    with _cache_lock:
        cached = _persona_file_cache.get(path)
        if cached and cached[0] == mtime:
            return cached[1]
    content = file_path.read_text(encoding="utf-8").strip()
    with _cache_lock:
        _persona_file_cache[path] = (mtime, content)
    return content


def list_personas() -> List[str]:
    """Return available persona identifiers."""
    return list_persona_ids()


def persona_details() -> List[dict]:
    """Return serialisable persona metadata for API responses."""
    return [persona_metadata_dict(meta) for meta in PERSONA_REGISTRY.values()]


def load_persona_bundle(names: Iterable[str]) -> str:
    """Load and concatenate persona prompt files for the requested personas."""
    bundle = [ASHLEY_HEADER, ""]
    for persona_id in names:
        meta = PERSONA_REGISTRY.get(persona_id) or get_persona(persona_id)
        if not meta:
            bundle.append(f"# Persona: {persona_id}\n(Persona not found)\n")
            continue
        persona_content = []
        for file_path in persona_files(persona_id):
            try:
                persona_content.append(_read_persona_file(file_path))
            except FileNotFoundError:
                persona_content.append(f"(Persona prompt file missing: {file_path})")
        bundle.append(f"# Persona: {meta.label}\n" + "\n\n".join(persona_content) + "\n")
    return "\n".join(bundle).strip()


__all__ = [
    "list_personas",
    "persona_details",
    "load_persona_bundle",
    "clear_persona_cache",
    "ASHLEY_HEADER",
]
