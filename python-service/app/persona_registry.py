from __future__ import annotations

"""
Persona registry loader for Ashley AI.

Personas are defined in an external JSON catalogue located in the personas directory.
This module provides cached access to persona metadata, convenience helpers for the
FastAPI layer, and utilities to add or modify personas at runtime.
"""

import json
import logging
import threading
from copy import deepcopy
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Mapping, Optional, Sequence, Set, Tuple

from app.config import get_settings


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PersonaMetadata:
    id: str
    label: str
    files: Tuple[str, ...]
    description: str
    tags: Tuple[str, ...]
    category: str
    nsfw: bool = False
    default_model: str = "auto"
    allowed_model_categories: Tuple[str, ...] = ()
    allowed_model_ids: Optional[Tuple[str, ...]] = None


@dataclass
class _PersonaCatalog:
    personas: Dict[str, PersonaMetadata]
    categories: Dict[str, Dict[str, str]]
    mtime: float


logger = logging.getLogger(__name__)

_catalog_lock = threading.Lock()
_catalog_cache: Optional[_PersonaCatalog] = None


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


def _invalidate_persona_loader_cache() -> None:
    """Try to clear cached persona bundles after catalogue changes."""
    try:
        from app import personas as persona_loader

        clear_fn = getattr(persona_loader, "clear_persona_cache", None)
        if callable(clear_fn):
            clear_fn()
    except Exception:  # pragma: no cover - cache invalidation best-effort
        logger.debug("Unable to clear persona loader cache", exc_info=True)


def _catalog_path() -> Path:
    settings = get_settings()
    settings.persona_dir.mkdir(parents=True, exist_ok=True)
    return settings.persona_dir / "persona_catalog.json"


def _normalise_persona_entry(entry: Dict[str, object]) -> PersonaMetadata:
    required_fields = {
        "id",
        "label",
        "files",
        "description",
        "tags",
        "category",
        "nsfw",
        "default_model",
        "allowed_model_categories",
    }
    missing = required_fields.difference(entry.keys())
    if missing:
        raise ValueError(f"Persona definition {entry.get('id')} missing fields: {sorted(missing)}")

    allowed_ids = entry.get("allowed_model_ids")
    if allowed_ids:
        allowed_ids_tuple: Optional[Tuple[str, ...]] = tuple(str(item) for item in allowed_ids)
    else:
        allowed_ids_tuple = None

    return PersonaMetadata(
        id=str(entry["id"]),
        label=str(entry["label"]),
        files=tuple(str(path) for path in entry.get("files", [])),
        description=str(entry.get("description", "")),
        tags=tuple(str(tag) for tag in entry.get("tags", [])),
        category=str(entry.get("category", "General")),
        nsfw=bool(entry.get("nsfw", False)),
        default_model=str(entry.get("default_model", "auto")),
        allowed_model_categories=tuple(str(cat) for cat in entry.get("allowed_model_categories", [])),
        allowed_model_ids=allowed_ids_tuple,
    )


def _load_catalog_from_disk() -> _PersonaCatalog:
    path = _catalog_path()
    if not path.exists():
        raise FileNotFoundError(
            f"Persona catalog file not found at {path}. "
            "Create persona_catalog.json to define personas."
        )

    raw = json.loads(path.read_text(encoding="utf-8"))

    personas = {
        entry["id"]: _normalise_persona_entry(entry)
        for entry in raw.get("personas", [])
    }

    categories = raw.get("categories", {})
    if not isinstance(categories, dict):
        raise ValueError("persona_catalog.json 'categories' must be an object.")

    mtime = path.stat().st_mtime
    return _PersonaCatalog(personas=personas, categories=categories, mtime=mtime)


def _write_catalog_to_disk(personas: Dict[str, PersonaMetadata], categories: Dict[str, Dict[str, str]]) -> None:
    path = _catalog_path()

    serialisable_personas = []
    for persona in sorted(personas.values(), key=lambda p: p.id):
        payload = asdict(persona)
        payload["files"] = sorted(payload["files"])
        payload["tags"] = sorted(payload["tags"])
        payload["allowed_model_categories"] = sorted(payload["allowed_model_categories"])
        if payload["allowed_model_ids"] is not None:
            payload["allowed_model_ids"] = sorted(payload["allowed_model_ids"])
        serialisable_personas.append(payload)

    serialisable_catalog = {
        "categories": categories,
        "personas": serialisable_personas,
    }
    path.write_text(json.dumps(serialisable_catalog, indent=2) + "\n", encoding="utf-8")


def _get_catalog(force_reload: bool = False) -> _PersonaCatalog:
    global _catalog_cache
    path = _catalog_path()
    mtime = path.stat().st_mtime if path.exists() else 0

    with _catalog_lock:
        if (
            force_reload
            or _catalog_cache is None
            or _catalog_cache.mtime != mtime
        ):
            _catalog_cache = _load_catalog_from_disk()
        return _catalog_cache


def refresh_persona_cache(force: bool = True) -> None:
    """Reload persona definitions from disk."""
    _get_catalog(force_reload=force)
    if force:
        _invalidate_persona_loader_cache()


# ---------------------------------------------------------------------------
# Public mappings for compatibility
# ---------------------------------------------------------------------------


class _PersonaRegistryMapping(Mapping[str, PersonaMetadata]):
    def __getitem__(self, key: str) -> PersonaMetadata:
        catalog = _get_catalog()
        return catalog.personas[key]

    def __iter__(self) -> Iterator[str]:
        catalog = _get_catalog()
        return iter(catalog.personas)

    def __len__(self) -> int:
        return len(_get_catalog().personas)

    def get(self, key: str, default: Optional[PersonaMetadata] = None) -> Optional[PersonaMetadata]:
        return _get_catalog().personas.get(key, default)

    def values(self):
        return _get_catalog().personas.values()

    def items(self):
        return _get_catalog().personas.items()


class _PersonaCategoriesMapping(Mapping[str, Dict[str, str]]):
    def __getitem__(self, key: str) -> Dict[str, str]:
        categories = _get_catalog().categories
        return deepcopy(categories[key])

    def __iter__(self) -> Iterator[str]:
        return iter(_get_catalog().categories)

    def __len__(self) -> int:
        return len(_get_catalog().categories)

    def get(self, key: str, default: Optional[Dict[str, str]] = None) -> Optional[Dict[str, str]]:
        categories = _get_catalog().categories
        value = categories.get(key)
        return deepcopy(value) if value else default


PERSONA_REGISTRY: Mapping[str, PersonaMetadata] = _PersonaRegistryMapping()
PERSONA_CATEGORIES: Mapping[str, Dict[str, str]] = _PersonaCategoriesMapping()


# Model categories used for grouping in the UI (remains static for now).
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


# ---------------------------------------------------------------------------
# Persona accessors
# ---------------------------------------------------------------------------


def get_persona(persona_id: str) -> PersonaMetadata:
    catalog = _get_catalog()
    try:
        return catalog.personas[persona_id]
    except KeyError as exc:
        raise KeyError(f"Persona '{persona_id}' is not registered.") from exc


def list_personas() -> List[PersonaMetadata]:
    return list(_get_catalog().personas.values())


def list_persona_ids() -> List[str]:
    return sorted(_get_catalog().personas.keys())


def get_persona_categories() -> Dict[str, Dict[str, str]]:
    return deepcopy(_get_catalog().categories)


def persona_files(persona_id: str) -> List[str]:
    persona = get_persona(persona_id)
    persona_dir = get_settings().persona_dir
    return [str(persona_dir / filename) for filename in persona.files]


def persona_metadata_dict(persona: PersonaMetadata) -> Dict[str, object]:
    data = asdict(persona)
    data["files"] = list(persona.files)
    data["tags"] = list(persona.tags)
    data["allowed_model_categories"] = list(persona.allowed_model_categories)
    if persona.allowed_model_ids is not None:
        data["allowed_model_ids"] = list(persona.allowed_model_ids)
    return data


def resolve_allowed_model_ids(
    persona: PersonaMetadata,
    available_models: Iterable[Dict[str, object]],
    include_auto: bool = True,
) -> List[str]:
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
    model_list = list(available_models)
    payload: List[Dict[str, object]] = []
    catalog = _get_catalog()
    categories = catalog.categories

    for persona in catalog.personas.values():
        allowed_model_ids = resolve_allowed_model_ids(persona, model_list)
        category_meta = categories.get(persona.category, {"label": persona.category, "description": ""})
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


# ---------------------------------------------------------------------------
# Runtime mutation helpers
# ---------------------------------------------------------------------------


def upsert_persona(definition: Dict[str, object], persist: bool = True) -> PersonaMetadata:
    """Add or update a persona definition. Optionally persist to disk."""
    new_meta = _normalise_persona_entry(definition)

    with _catalog_lock:
        catalog = _get_catalog()
        personas = dict(catalog.personas)
        categories = deepcopy(catalog.categories)

        personas[new_meta.id] = new_meta
        categories.setdefault(
            new_meta.category,
            {"label": new_meta.category, "description": ""},
        )

        if persist:
            _write_catalog_to_disk(personas, categories)
            refresh_persona_cache(force=True)
        else:
            global _catalog_cache
            _catalog_cache = _PersonaCatalog(
                personas=personas,
                categories=categories,
                mtime=_catalog_path().stat().st_mtime,
            )
    _invalidate_persona_loader_cache()
    return new_meta


def remove_persona(persona_id: str, persist: bool = True) -> None:
    """Remove a persona definition from the catalogue."""
    with _catalog_lock:
        catalog = _get_catalog()
        if persona_id not in catalog.personas:
            raise KeyError(f"Persona '{persona_id}' does not exist.")
        personas = dict(catalog.personas)
        categories = deepcopy(catalog.categories)
        persona = personas.pop(persona_id)

        if persist:
            _write_catalog_to_disk(personas, categories)
            refresh_persona_cache(force=True)
        else:
            global _catalog_cache
            _catalog_cache = _PersonaCatalog(
                personas=personas,
                categories=categories,
                mtime=_catalog_path().stat().st_mtime,
            )

    # Optionally clean up empty categories (only when persisting)
    if persist:
        catalog_after = _get_catalog()
        category_personas = [p for p in catalog_after.personas.values() if p.category == persona.category]
        if not category_personas:
            categories = deepcopy(catalog_after.categories)
            categories.pop(persona.category, None)
            _write_catalog_to_disk(dict(catalog_after.personas), categories)
            refresh_persona_cache(force=True)
    else:
        _invalidate_persona_loader_cache()


__all__ = [
    "PersonaMetadata",
    "PERSONA_REGISTRY",
    "PERSONA_CATEGORIES",
    "MODEL_CATEGORIES",
    "get_persona",
    "list_personas",
    "list_persona_ids",
    "get_persona_categories",
    "persona_files",
    "persona_metadata_dict",
    "resolve_allowed_model_ids",
    "persona_payload",
    "refresh_persona_cache",
    "upsert_persona",
    "remove_persona",
]
