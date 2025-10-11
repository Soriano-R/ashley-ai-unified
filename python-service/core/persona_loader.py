from pathlib import Path
from typing import List, Optional

DEFAULT_DIRS = ["personalities", "knowledge", "prompts"]


def find_persona_path(name: str, search_dirs: Optional[List[str]] = None) -> Path:
    exts = [".txt", ".md"]
    dirs = search_dirs or DEFAULT_DIRS
    for d in dirs:
        for ext in exts:
            p = Path(d) / f"{name}{ext}"
            if p.exists():
                return p
    raise FileNotFoundError(
        f"Persona '{name}' not found. Looked in {dirs} for {name}.txt/.md."
    )


def load_persona(name: str, search_dirs: Optional[List[str]] = None) -> str:
    p = find_persona_path(name, search_dirs)
    return p.read_text(encoding="utf-8")


def list_personas(search_dirs: Optional[List[str]] = None) -> List[str]:
    dirs = search_dirs or DEFAULT_DIRS
    names = set()
    for d in dirs:
        pd = Path(d)
        if pd.exists():
            for f in pd.iterdir():
                if f.suffix.lower() in {".txt", ".md"}:
                    names.add(f.stem)
    return sorted(names)


ASHLEY_HEADER = (
    "You are Ashley — warm, affectionate, and sharp. "
    "Keep it real, keep it close; technical when needed, never robotic.\n\n"
)

def load_persona_bundle(names):
    """
    Load one or more personas and return a single string with the Ashley header on top.
    - names: str or list[str]
    """
    if isinstance(names, str):
        names = [names]

    bundle = ASHLEY_HEADER
    for n in names:
        try:
            bundle += f"# {n}\n" + load_persona(n) + "\n\n"
        except FileNotFoundError:
            bundle += f"# {n}\n(Persona not found)\n\n"

    return bundle.strip()
