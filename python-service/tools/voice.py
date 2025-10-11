from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from app.config import get_settings
from tools.openai_client import synthesize_speech as _synthesize_speech
from tools.openai_client import transcribe_audio as _transcribe_audio

AVAILABLE_VOICES: List[str] = [
    "alloy",
    "verse",
    "aria",
    "sol",
    "vivid",
    "luna",
]


def transcribe(audio_path: str, *, model: Optional[str] = None) -> str:
    """Transcribe audio file from path"""
    if isinstance(audio_path, str):
        audio_path = Path(audio_path)
    return _transcribe_audio(audio_path.read_bytes(), model=model)


def transcribe_file(path: Path, *, model: Optional[str] = None) -> str:
    return transcribe(str(path), model=model)


def synthesize(text: str, *, voice: Optional[str] = None, speed: float = 1.0) -> bytes:
    settings = get_settings()
    voice_name = voice or settings.tts_voice_default
    return _synthesize_speech(text, voice=voice_name, speed=speed)


def synthesize_to_file(text: str, voice: str = "alloy", *, target_path: Optional[Path] = None, speed: float = 1.0) -> str:
    """Synthesize text to audio file and return the path"""
    settings = get_settings()
    audio_dir = settings.assets_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    if target_path is None:
        from datetime import datetime
        filename = f"tts_{datetime.utcnow().strftime('%Y%m%d_%H%M%S%f')}.mp3"
        target_path = audio_dir / filename
    
    audio = synthesize(text, voice=voice, speed=speed)
    target_path.write_bytes(audio)
    return str(target_path)


def list_voices() -> List[str]:
    settings = get_settings()
    default_voice = settings.tts_voice_default
    voices = sorted(set(AVAILABLE_VOICES + [default_voice]))
    return voices


__all__ = ["transcribe", "transcribe_file", "synthesize", "synthesize_to_file", "list_voices"]
