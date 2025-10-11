from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import get_settings
from tools.openai_client import edit_image as _edit_image
from tools.openai_client import generate_image as _generate_image


def _images_dir() -> Path:
    settings = get_settings()
    directory = settings.assets_dir / "generated"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def generate_image(prompt: str, *, model: Optional[str] = None, size: str = "1024x1024") -> str:
    """Generate image and return path as string"""
    image_bytes = _generate_image(prompt, model=model, size=size)
    filename = f"gen_{datetime.utcnow().strftime('%Y%m%d_%H%M%S%f')}.png"
    path = _images_dir() / filename
    path.write_bytes(image_bytes)
    return str(path)


def edit_image(
    base_path: str,
    prompt: str,
    mask_path: Optional[str] = None,
    *,
    model: Optional[str] = None,
    size: str = "1024x1024",
) -> str:
    """Edit image and return path as string"""
    base_path_obj = Path(base_path)
    image_bytes = base_path_obj.read_bytes()
    mask_bytes = Path(mask_path).read_bytes() if mask_path else None
    edited_bytes = _edit_image(image_bytes=image_bytes, mask_bytes=mask_bytes, prompt=prompt, model=model, size=size)
    filename = f"edit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S%f')}.png"
    path = _images_dir() / filename
    path.write_bytes(edited_bytes)
    return str(path)


__all__ = ["generate_image", "edit_image"]
