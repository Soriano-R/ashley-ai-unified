from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional

from dotenv import load_dotenv
from enum import Enum
from pydantic import BaseModel, BaseSettings, Field, validator, root_validator

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT_DIR / ".env"
HF_ENV_PATH = Path("/data") / ".env"

for path in (ENV_PATH, HF_ENV_PATH):
    if path.exists():
        load_dotenv(path)

load_dotenv()  # fallback to default search in case nothing matched above


def _bool_env(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    lowered = val.strip().lower()
    if lowered in {"1", "true", "yes", "on", "enable", "enabled"}:
        return True
    if lowered in {"0", "false", "no", "off", "disable", "disabled"}:
        return False
    return default


class ModerationAction(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    FLAG = "flag"

    @classmethod
    def from_value(cls, value: str) -> "ModerationAction":
        normalised = value.strip().lower()
        if normalised == "monitor":
            normalised = "flag"
        try:
            return cls(normalised)
        except ValueError as exc:
            raise ValueError(f"Unsupported moderation action '{value}'. Expected one of: {', '.join(a.value for a in cls)}") from exc


class RateLimitConfig(BaseModel):
    requests_per_minute: int = Field(60, ge=1)
    cooldown_seconds: int = Field(5, ge=0)

    class Config:
        frozen = True


class ModerationPolicy(BaseModel):
    default_action: ModerationAction = ModerationAction.FLAG
    categories: Dict[str, ModerationAction] = Field(
        default_factory=lambda: {
            "sexual": ModerationAction.FLAG,
            "violence": ModerationAction.FLAG,
            "hate": ModerationAction.BLOCK,
            "self-harm": ModerationAction.FLAG,
            "harassment": ModerationAction.FLAG,
            "self-harm_instructions": ModerationAction.BLOCK,
            "hate_threatening": ModerationAction.BLOCK,
            "self-harm_intent": ModerationAction.BLOCK,
            "sexual_minors": ModerationAction.BLOCK,
            "violence_graphic": ModerationAction.FLAG,
            "malware": ModerationAction.BLOCK,
            "political": ModerationAction.ALLOW,
            "medical": ModerationAction.FLAG,
        }
    )

    class Config:
        frozen = True

    @validator("categories", pre=True)
    def _coerce_category_actions(cls, value: Dict[str, object]) -> Dict[str, ModerationAction]:
        coerced: Dict[str, ModerationAction] = {}
        for category, action in (value or {}).items():
            if isinstance(action, ModerationAction):
                coerced[category] = action
            else:
                coerced[category] = ModerationAction.from_value(str(action))
        return coerced

    @validator("default_action", pre=True)
    def _coerce_default_action(cls, value: object) -> ModerationAction:
        if isinstance(value, ModerationAction):
            return value
        return ModerationAction.from_value(str(value))


class FeatureFlags(BaseModel):
    enable_voice: bool = True
    enable_search: bool = True
    enable_code_execution: bool = True
    enable_auto_archive: bool = False
    enable_memory: bool = True
    enable_vision: bool = True
    enable_dalle: bool = True
    enable_admin_dashboard: bool = True

    class Config:
        frozen = True


class Settings(BaseSettings):
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_organization: Optional[str] = Field(default=None, env="OPENAI_ORGANIZATION")
    default_model: str = Field(default="gpt-4o-mini", env="DEFAULT_MODEL")
    fallback_model: str = Field(default="gpt-3.5-turbo", env="FALLBACK_MODEL")
    gpt5_model: str = Field(default="gpt-5", env="GPT5_MODEL")
    vision_model: str = Field(default="gpt-4o-mini", env="VISION_MODEL")
    dalle_model: str = Field(default="dall-e-3", env="DALLE_MODEL")
    whisper_model: str = Field(default="gpt-4o-mini-transcribe", env="WHISPER_MODEL")
    tts_voice_default: str = Field(default="alloy", env="TTS_VOICE")
    embeddings_model: str = Field(default="text-embedding-3-small", env="EMBEDDINGS_MODEL")
    temperature_default: float = Field(default=0.7, env="TEMPERATURE_DEFAULT")
    max_output_tokens: int = Field(default=1024, env="MAX_OUTPUT_TOKENS")
    persona_dir: Path = Field(default_factory=lambda: ROOT_DIR / "personas", env="PERSONA_DIR")
    assets_dir: Path = Field(default_factory=lambda: ROOT_DIR / "assets", env="ASSETS_DIR")
    storage_dir: Path = Field(default_factory=lambda: ROOT_DIR / "storage", env="STORAGE_DIR")
    data_dir: Path = Field(default_factory=lambda: ROOT_DIR / "storage" / "data")
    moderation_policy: ModerationPolicy = Field(default_factory=ModerationPolicy)
    rate_limit: RateLimitConfig = Field(default_factory=RateLimitConfig)
    feature_flags: FeatureFlags = Field(default_factory=FeatureFlags)
    admin_passphrase: Optional[str] = Field(default=None, env="ADMIN_PASSPHRASE")
    hf_dataset_repo: Optional[str] = Field(default=None, env="HF_DATASET_REPO")
    tavily_api_key: Optional[str] = Field(default=None, env="TAVILY_API_KEY")
    serpapi_api_key: Optional[str] = Field(default=None, env="SERPAPI_API_KEY")

    class Config:
        files = [str(path) for path in (ENV_PATH, HF_ENV_PATH) if path.exists()]
        env_file = files or None
        env_file_encoding = "utf-8"
        case_sensitive = False

    @root_validator(pre=True)
    def _derive_nested_models(cls, values: Dict[str, object]) -> Dict[str, object]:
        if "feature_flags" not in values:
            values["feature_flags"] = FeatureFlags(
                enable_voice=_bool_env("ENABLE_VOICE", True),
                enable_search=_bool_env("ENABLE_SEARCH", True),
                enable_code_execution=_bool_env("ENABLE_CODE_EXECUTION", True),
                enable_auto_archive=_bool_env("ENABLE_AUTO_ARCHIVE", False),
                enable_memory=_bool_env("ENABLE_MEMORY", True),
                enable_vision=_bool_env("ENABLE_VISION", True),
                enable_dalle=_bool_env("ENABLE_DALLE", True),
                enable_admin_dashboard=_bool_env("ENABLE_ADMIN_DASHBOARD", True),
            )

        default_action = os.getenv("MODERATION_DEFAULT_ACTION")
        if default_action and "moderation_policy" not in values:
            values["moderation_policy"] = ModerationPolicy(default_action=default_action.strip().lower())

        if "rate_limit" not in values:
            from os import getenv

            def _int_env(name: str, default: int) -> int:
                try:
                    return int(getenv(name, default))
                except ValueError:
                    return default

            values["rate_limit"] = RateLimitConfig(
                requests_per_minute=_int_env("REQUESTS_PER_MINUTE", 60),
                cooldown_seconds=_int_env("COOLDOWN_SECONDS", 5),
            )

        return values

    @validator("persona_dir", "assets_dir", "storage_dir", pre=True, always=True)
    def _ensure_directory(cls, value: object) -> Path:
        path = Path(value) if value is not None else ROOT_DIR / "storage"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @validator("data_dir", pre=True, always=True)
    def _ensure_data_dir(cls, value: object, values: Dict[str, object]) -> Path:
        storage: Path = values.get("storage_dir") or ROOT_DIR / "storage"
        path = Path(value) if value is not None else storage / "data"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def require_openai_key(self) -> str:
        if not self.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Please add it to your environment or Hugging Face secrets."
            )
        return self.openai_api_key


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


__all__ = [
    "Settings",
    "FeatureFlags",
    "RateLimitConfig",
    "ModerationPolicy",
    "ModerationAction",
    "get_settings",
]
