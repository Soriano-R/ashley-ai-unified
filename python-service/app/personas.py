from __future__ import annotations

from pathlib import Path
from typing import Iterable, List

from app.persona_registry import (
    PERSONA_REGISTRY,
    persona_metadata_dict,
    persona_files,
)


ASHLEY_HEADER = (
    "You are Ashley — warm, affectionate, technically sharp when needed. "
    "Keep responses grounded, emotionally intelligent, and avoid robotic tone."
    "\nIf asked for professional personas, adapt expertise accordingly."
)


def list_personas() -> List[str]:
    """Return available persona identifiers."""
    return sorted(PERSONA_REGISTRY.keys())


def persona_details() -> List[dict]:
    """Return serialisable persona metadata for API responses."""
    return [persona_metadata_dict(meta) for meta in PERSONA_REGISTRY.values()]


def load_persona_bundle(names: Iterable[str]) -> str:
    """Load and concatenate persona prompt files for the requested personas."""
    bundle = [ASHLEY_HEADER, ""]
    for persona_id in names:
        meta = PERSONA_REGISTRY.get(persona_id)
        if not meta:
            bundle.append(f"# Persona: {persona_id}\n(Persona not found)\n")
            continue
        persona_content = []
        for file_path in persona_files(persona_id):
            try:
                persona_content.append(Path(file_path).read_text(encoding="utf-8").strip())
            except FileNotFoundError:
                persona_content.append(f"(Persona prompt file missing: {file_path})")
        bundle.append(f"# Persona: {meta.label}\n" + "\n\n".join(persona_content) + "\n")
    return "\n".join(bundle).strip()


__all__ = ["list_personas", "persona_details", "load_persona_bundle", "ASHLEY_HEADER"]
