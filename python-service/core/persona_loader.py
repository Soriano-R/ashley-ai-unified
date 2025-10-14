from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Union

from app.config import get_settings


PersonaDirArg = Optional[Sequence[Union[str, Path]]]


def _candidate_dirs(search_dirs: PersonaDirArg = None) -> List[Path]:
    """
    Resolve the directories that should be searched for persona prompt files.

    If `search_dirs` is provided, it is taken as authoritative. Otherwise we fall
    back to the configured persona directory under python-service/personas.
    """
    if search_dirs:
        return [Path(d).expanduser().resolve() for d in search_dirs]
    settings = get_settings()
    return [settings.persona_dir]


def find_persona_path(name: str, search_dirs: PersonaDirArg = None) -> Path:
    exts = (".txt", ".md")
    for directory in _candidate_dirs(search_dirs):
        for ext in exts:
            candidate = directory / f"{name}{ext}"
            if candidate.exists():
                return candidate
    raise FileNotFoundError(
        f"Persona '{name}' not found. Looked in {[str(d) for d in _candidate_dirs(search_dirs)]}."
    )


def load_persona(name: str, search_dirs: PersonaDirArg = None) -> str:
    persona_path = find_persona_path(name, search_dirs)
    return persona_path.read_text(encoding="utf-8")


def list_personas(search_dirs: PersonaDirArg = None) -> List[str]:
    names = set()
    for directory in _candidate_dirs(search_dirs):
        if not directory.exists():
            continue
        for file in directory.iterdir():
            if file.is_file() and file.suffix.lower() in {".txt", ".md"}:
                names.add(file.stem)
    return sorted(names)


ASHLEY_HEADER = (
    "You are Ashley — warm, affectionate, and sharp. "
    "Keep it real, keep it close; technical when needed, never robotic.\n\n"
)


def load_persona_bundle(names: Union[str, Iterable[str]]) -> str:
    """
    Load one or more personas and return a single string with the Ashley header on top.
    """
    if isinstance(names, str):
        names = [names]

    bundle = ASHLEY_HEADER
    for persona_name in names:
        try:
            bundle += f"# {persona_name}\n" + load_persona(persona_name) + "\n\n"
        except FileNotFoundError:
            bundle += f"# {persona_name}\n(Persona not found)\n\n"

    return bundle.strip()
