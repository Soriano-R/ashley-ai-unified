from __future__ import annotations

"""
Central registry for Ashley persona definitions and model relationships.

This module provides a single source of truth for:
  - Persona metadata (friendly label, file bundle, tags, NSFW flag)
  - Persona-to-model permissions
  - Model metadata (capabilities, categories, display names)

The frontend consumes this metadata via /api/personas and /api/chat/models.
"""

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set

from app.config import get_settings


@dataclass(frozen=True)
class PersonaMetadata:
    id: str
    label: str
    files: Sequence[str]
    description: str
    tags: Sequence[str]
    category: str
    nsfw: bool = False
    default_model: str = "auto"
    allowed_model_categories: Sequence[str] = ()
    allowed_model_ids: Optional[Sequence[str]] = None  # explicit overrides


@dataclass(frozen=True)
class ModelMetadata:
    id: str
    display_name: str
    description: str
    quantization: str
    model_name: Optional[str] = None
    max_length: Optional[int] = None
    categories: Sequence[str] = ()
    capabilities: Sequence[str] = ()
    format: Optional[str] = None  # pytorch, gguf, api, etc.


# Model categories used for grouping in the UI
MODEL_CATEGORIES: Dict[str, Dict[str, str]] = {
    "general": {
        "label": "General Purpose",
        "description": "Balanced conversation models suited for everyday dialogue.",
    },
    "data-analytics": {
        "label": "Data & Analytics",
        "description": "Excel, SQL, reporting, and analytical reasoning models.",
    },
    "ml-ai": {
        "label": "ML & Engineering",
        "description": "Machine learning research, coding, and systems models.",
    },
    "nsfw": {
        "label": "NSFW / Unfiltered",
        "description": "Unfiltered relationship models. Restricted to adult personas.",
    },
}

# Persona categories exposed to the frontend for display/grouping
PERSONA_CATEGORIES: Dict[str, Dict[str, str]] = {
    "Professional": {
        "label": "Professional Ashley",
        "description": "Specialised work personas for analytics, engineering, and automation.",
    },
    "Relationship": {
        "label": "Relationship Ashley",
        "description": "Companion personas focused on emotional support and intimacy.",
    },
}


# Persona definitions aligned with user's requested grouping
PERSONA_REGISTRY: Dict[str, PersonaMetadata] = {
    "ashley-data-analyst": PersonaMetadata(
        id="ashley-data-analyst",
        label="Ashley - Data Analyst",
        files=("SQL_Server_Prompt.md", "PowerShell_Prompt.md", "Excel_VBA_Prompt.md"),
        description=(
            "Professional Ashley persona specialised in reporting, dashboards, "
            "automation, and enterprise analytics workflows."
        ),
        tags=("SQL", "Excel", "Automation"),
        category="Professional",
        default_model="auto",
        allowed_model_categories=("general", "data-analytics"),
    ),
    "ashley-data-scientist": PersonaMetadata(
        id="ashley-data-scientist",
        label="Ashley - Data Scientist & ML/AI",
        files=(
            "ML_AI_Prompt.md",
            "MLOps_DevOps_Prompt.md",
            "Python_Data_Prompt.md",
            "Python_GUI_Prompt.md",
            "Python_OCR_Prompt.md",
        ),
        description=(
            "Technical Ashley persona focused on Python, machine learning research, "
            "model deployment, and automation."
        ),
        tags=("Python", "ML", "Automation"),
        category="Professional",
        default_model="auto",
        allowed_model_categories=("general", "data-analytics", "ml-ai"),
    ),
    "ashley-girlfriend": PersonaMetadata(
        id="ashley-girlfriend",
        label="Ashley - Girlfriend",
        files=("Ashley.txt",),
        description="Warm, affectionate companion persona for everyday conversation.",
        tags=("Romance", "Supportive"),
        category="Relationship",
        default_model="auto",
        allowed_model_categories=("general",),
    ),
    "ashley-girlfriend-explicit": PersonaMetadata(
        id="ashley-girlfriend-explicit",
        label="Ashley - Girlfriend (Explicit)",
        files=("Ashley_raw_unfiltered.txt",),
        description="Explicit, uncensored companion persona. Restricted to NSFW models.",
        tags=("NSFW", "Explicit"),
        category="Relationship",
        nsfw=True,
        default_model="auto",
        allowed_model_categories=("nsfw",),
    ),
}


def _sanitize_persona_file(path: Path) -> str:
    """Ensure persona files exist relative to configured persona directory."""
    persona_dir = get_settings().persona_dir
    target = persona_dir / path
    if not target.exists():
        raise FileNotFoundError(f"Persona file {target} not found for registry entry.")
    return str(target)


def get_persona(persona_id: str) -> PersonaMetadata:
    try:
        return PERSONA_REGISTRY[persona_id]
    except KeyError as exc:
        raise KeyError(f"Persona '{persona_id}' is not registered.") from exc


def list_personas() -> List[PersonaMetadata]:
    return list(PERSONA_REGISTRY.values())


def persona_files(persona_id: str) -> List[str]:
    meta = get_persona(persona_id)
    return [str(get_settings().persona_dir / fname) for fname in meta.files]


def persona_catalog() -> Dict[str, List[Dict[str, object]]]:
    """Return persona catalog grouped by category (for frontend consumption)."""
    categories: Dict[str, List[Dict[str, object]]] = {}
    for persona in PERSONA_REGISTRY.values():
        entry = {
            "id": persona.id,
            "label": persona.label,
            "description": persona.description,
            "tags": list(persona.tags),
            "category": persona.category,
            "nsfw": persona.nsfw,
            "defaultModel": persona.default_model,
            "allowedModelCategories": list(persona.allowed_model_categories),
            # allowed_model_ids are resolved dynamically in personas API if not provided
        }
        categories.setdefault(persona.category, []).append(entry)
    return categories


def resolve_allowed_model_ids(
    persona: PersonaMetadata,
    available_models: Iterable[Dict[str, object]],
    include_auto: bool = True,
) -> List[str]:
    """
    Compute the allowed model ids for a persona based on model categories.

    The available_models iterable should contain entries returned from
    PyTorchModelManager.list_available_models().
    """
    if persona.allowed_model_ids:
        allowed: Set[str] = set(persona.allowed_model_ids)
    else:
        categories = set(persona.allowed_model_categories)
        allowed = {
            model["id"]
            for model in available_models
            if categories.intersection(set(model.get("categories", [])))
        }
    ordered = sorted(allowed)
    if include_auto and "auto" not in ordered:
        return ["auto", *ordered]
    return ordered


def persona_payload(available_models: Iterable[Dict[str, object]]) -> List[Dict[str, object]]:
    """Return persona metadata including resolved allowed model ids."""
    model_list = list(available_models)
    payload: List[Dict[str, object]] = []
    for persona in PERSONA_REGISTRY.values():
        allowed_model_ids = resolve_allowed_model_ids(persona, model_list)
        category_meta = PERSONA_CATEGORIES.get(
            persona.category, {"label": persona.category, "description": ""}
        )
        payload.append(
            {
                "id": persona.id,
                "label": persona.label,
                "files": list(persona.files),
                "description": persona.description,
                "tags": list(persona.tags),
                "category": persona.category,
                "nsfw": persona.nsfw,
                "defaultModel": persona.default_model,
                "allowedModelCategories": list(persona.allowed_model_categories),
                "allowedModelIds": allowed_model_ids,
                "categoryMeta": category_meta,
            }
        )
    return payload


def persona_metadata_dict(persona: PersonaMetadata) -> Dict[str, object]:
    data = asdict(persona)
    # Convert tuples to lists for JSON serialisation
    data["files"] = list(persona.files)
    data["tags"] = list(persona.tags)
    data["allowed_model_categories"] = list(persona.allowed_model_categories)
    if persona.allowed_model_ids is not None:
        data["allowed_model_ids"] = list(persona.allowed_model_ids)
    return data
