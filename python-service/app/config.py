from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT_DIR / ".env"
HF_ENV_PATH = Path("/data") / ".env"

for path in (ENV_PATH, HF_ENV_PATH):
    if path.exists():
        load_dotenv(path)

load_dotenv()  # fallback to default search in case nothing matched above


_DEF_BOOL_TRUE = {"1", "true", "yes", "on", "enable", "enabled"}
_DEF_BOOL_FALSE = {"0", "false", "no", "off", "disable", "disabled"}


def _bool_env(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    lowered = val.strip().lower()
    if lowered in _DEF_BOOL_TRUE:
        return True
    if lowered in _DEF_BOOL_FALSE:
        return False
    return default


def _int_env(name: str, default: int) -> int:
    val = os.getenv(name)
    if val is None:
        return default
    try:
        return int(val)
    except ValueError:
        return default


@dataclass(frozen=True)
class RateLimitConfig:
    requests_per_minute: int = 60
    cooldown_seconds: int = 5


@dataclass(frozen=True)
class ModerationPolicy:
    default_action: str = "monitor"
    categories: Dict[str, str] = field(
        default_factory=lambda: {
            "sexual": "monitor",
            "violence": "monitor",
            "hate": "block",
            "self-harm": "monitor",
            "harassment": "monitor",
            "self-harm_instructions": "block",
            "hate_threatening": "block",
            "self-harm_intent": "block",
            "sexual_minors": "block",
            "violence_graphic": "monitor",
            "malware": "block",
            "political": "allow",
            "medical": "monitor",
        }
    )


@dataclass(frozen=True)
class FeatureFlags:
    enable_voice: bool = False
    enable_search: bool = True
    enable_code_execution: bool = True
    enable_auto_archive: bool = False
    enable_memory: bool = True
    enable_vision: bool = True
    enable_dalle: bool = True
    enable_admin_dashboard: bool = True


@dataclass(frozen=True)
class Settings:
    openai_api_key: Optional[str]
    openai_organization: Optional[str]
    default_model: str = "gpt-4o-mini"
    fallback_model: str = "gpt-3.5-turbo"
    gpt5_model: str = "gpt-5"
    vision_model: str = "gpt-4o-mini"
    dalle_model: str = "dall-e-3"
    whisper_model: str = "gpt-4o-mini-transcribe"
    tts_voice_default: str = "alloy"
    embeddings_model: str = "text-embedding-3-small"
    temperature_default: float = 0.7
    max_output_tokens: int = 1024
    persona_dir: Path = ROOT_DIR / "personas"
    assets_dir: Path = ROOT_DIR / "assets"
    storage_dir: Path = ROOT_DIR / "storage"
    data_dir: Path = ROOT_DIR / "storage" / "data"
    moderation_policy: ModerationPolicy = ModerationPolicy()
    rate_limit: RateLimitConfig = RateLimitConfig()
    feature_flags: FeatureFlags = FeatureFlags()
    admin_passphrase: Optional[str] = None
    hf_dataset_repo: Optional[str] = None
    tavily_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None

    def require_openai_key(self) -> str:
        if not self.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Please add it to your environment or Hugging Face secrets."
            )
        return self.openai_api_key


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    feature_flags = FeatureFlags(
        enable_voice=_bool_env("ENABLE_VOICE", True),
        enable_search=_bool_env("ENABLE_SEARCH", True),
        enable_code_execution=_bool_env("ENABLE_CODE_EXECUTION", True),
        enable_auto_archive=_bool_env("ENABLE_AUTO_ARCHIVE", False),
        enable_memory=_bool_env("ENABLE_MEMORY", True),
        enable_vision=_bool_env("ENABLE_VISION", True),
        enable_dalle=_bool_env("ENABLE_DALLE", True),
        enable_admin_dashboard=_bool_env("ENABLE_ADMIN_DASHBOARD", True),
    )

    moderation_policy = ModerationPolicy()
    default_action = os.getenv("MODERATION_DEFAULT_ACTION")
    if default_action:
        moderation_policy = ModerationPolicy(default_action=default_action.strip().lower())

    storage_dir = Path(os.getenv("STORAGE_DIR", str(ROOT_DIR / "storage")))
    data_dir = storage_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    persona_dir = Path(os.getenv("PERSONA_DIR", str(ROOT_DIR / "personas")))
    persona_dir.mkdir(parents=True, exist_ok=True)

    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_organization=os.getenv("OPENAI_ORGANIZATION"),
        default_model=os.getenv("DEFAULT_MODEL", "gpt-4o-mini"),
        fallback_model=os.getenv("FALLBACK_MODEL", "gpt-3.5-turbo"),
        gpt5_model=os.getenv("GPT5_MODEL", "gpt-5"),
        vision_model=os.getenv("VISION_MODEL", "gpt-4o"),
        dalle_model=os.getenv("DALLE_MODEL", "dall-e-3"),
        whisper_model=os.getenv("WHISPER_MODEL", "gpt-4o-mini-transcribe"),
        tts_voice_default=os.getenv("TTS_VOICE", "alloy"),
        embeddings_model=os.getenv("EMBEDDINGS_MODEL", "text-embedding-3-small"),
        temperature_default=float(os.getenv("TEMPERATURE_DEFAULT", 0.7)),
        max_output_tokens=int(os.getenv("MAX_OUTPUT_TOKENS", 1024)),
        persona_dir=persona_dir,
        assets_dir=Path(os.getenv("ASSETS_DIR", str(ROOT_DIR / "assets"))),
        storage_dir=storage_dir,
        data_dir=data_dir,
        moderation_policy=moderation_policy,
        rate_limit=RateLimitConfig(
            requests_per_minute=_int_env("REQUESTS_PER_MINUTE", 60),
            cooldown_seconds=_int_env("COOLDOWN_SECONDS", 5),
        ),
        feature_flags=feature_flags,
        admin_passphrase=os.getenv("ADMIN_PASSPHRASE"),
        hf_dataset_repo=os.getenv("HF_DATASET_REPO"),
        tavily_api_key=os.getenv("TAVILY_API_KEY"),
        serpapi_api_key=os.getenv("SERPAPI_API_KEY"),
    )


__all__ = ["Settings", "get_settings"]
