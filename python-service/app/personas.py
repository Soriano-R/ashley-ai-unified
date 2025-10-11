from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Optional

from app.config import get_settings


def _persona_dir() -> Path:
    settings = get_settings()
    return settings.persona_dir


def list_personas(search_dirs: Optional[Iterable[Path]] = None) -> List[str]:
    directories = list(search_dirs or [_persona_dir()])
    names: set[str] = set()
    for directory in directories:
        path = Path(directory)
        if not path.exists():
            continue
        for file in path.iterdir():
            if file.suffix.lower() in {".txt", ".md"}:
                names.add(file.stem)
    return sorted(names)


def load_persona(name: str, search_dirs: Optional[Iterable[Path]] = None) -> str:
    directories = list(search_dirs or [_persona_dir()])
    for directory in directories:
        for suffix in (".txt", ".md"):
            candidate = Path(directory) / f"{name}{suffix}"
            if candidate.exists():
                return candidate.read_text(encoding="utf-8")
    raise FileNotFoundError(f"Persona '{name}' not found in {directories}")


ASHLEY_HEADER = (
    "You are Ashley — warm, affectionate, technically sharp when needed. "
    "Keep responses grounded, emotionally intelligent, and avoid robotic tone."\
    "\nIf asked for Hybrid/Expert modes, adapt tone accordingly."
)


def load_persona_bundle(names: Iterable[str]) -> str:
    bundle = [ASHLEY_HEADER, ""]
    for persona_name in names:
        try:
            content = load_persona(persona_name)
        except FileNotFoundError:
            content = "(Persona not found)"
        bundle.append(f"# Persona: {persona_name}\n{content.strip()}\n")
    return "\n".join(bundle).strip()


__all__ = ["list_personas", "load_persona", "load_persona_bundle", "ASHLEY_HEADER"]
