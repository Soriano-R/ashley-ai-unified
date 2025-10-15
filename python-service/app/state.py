from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

from app.config import get_settings


@dataclass
class Attachment:
    name: str
    type: str  # e.g., "pdf", "csv", "image", "audio", "code"
    path: Optional[str] = None
    url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0

    def update(self, prompt: int, completion: int, cost: float) -> None:
        self.prompt_tokens += prompt
        self.completion_tokens += completion
        self.total_tokens += prompt + completion
        self.cost_usd += cost


@dataclass
class RateLimitStatus:
    available: bool = True
    retry_after: float = 0.0
    last_reset_ts: float = field(default_factory=time.time)
    remaining_requests: int = 999

    def consume(self) -> None:
        if self.remaining_requests > 0:
            self.remaining_requests -= 1

    def reset(self, quota: int) -> None:
        self.remaining_requests = quota
        self.last_reset_ts = time.time()
        self.available = True
        self.retry_after = 0.0


@dataclass
class ChatState:
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    title: str = "New Chat"
    persona_names: List[str] = field(default_factory=lambda: ["Ashley"])
    model_override: Optional[str] = None
    active_model: str = field(default_factory=lambda: get_settings().default_model)
    temperature: float = field(default_factory=lambda: get_settings().temperature_default)
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    messages: List[Dict[str, Any]] = field(default_factory=list)
    attachments: List[Attachment] = field(default_factory=list)
    memory_enabled: bool = field(default_factory=lambda: get_settings().feature_flags.enable_memory)
    short_term_memory: List[Dict[str, str]] = field(default_factory=list)
    long_term_memory_keys: List[str] = field(default_factory=list)
    token_usage: TokenUsage = field(default_factory=TokenUsage)
    moderation_enabled: bool = True
    last_error: Optional[str] = None
    rate_limit: RateLimitStatus = field(default_factory=RateLimitStatus)
    monthly_usage_soft_cap_usd: Optional[float] = None
    search_provider: str = "auto"
    voice_voice: str = field(default_factory=lambda: get_settings().tts_voice_default)
    voice_speed: float = 1.0

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["attachments"] = [asdict(a) for a in self.attachments]
        data["token_usage"] = asdict(self.token_usage)
        data["rate_limit"] = asdict(self.rate_limit)
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ChatState":
        state = cls()
        for key, value in data.items():
            if key == "attachments":
                state.attachments = [Attachment(**att) for att in value]
            elif key == "token_usage":
                state.token_usage = TokenUsage(**value)
            elif key == "rate_limit":
                state.rate_limit = RateLimitStatus(**value)
            else:
                setattr(state, key, value)
        return state

    def add_message(self, role: str, content: str, **metadata: Any) -> None:
        entry = {
            "role": role,
            "content": content,
            "timestamp": time.time(),
            "metadata": metadata,
        }
        self.messages.append(entry)

    def reset_for_new_chat(self) -> None:
        self.session_id = uuid.uuid4().hex
        self.title = "New Chat"
        self.messages.clear()
        self.attachments.clear()
        self.short_term_memory.clear()
        self.long_term_memory_keys.clear()
        self.token_usage = TokenUsage()
        self.last_error = None
        self.model_override = None
        self.active_model = get_settings().default_model


def create_chat_state(**overrides: Any) -> ChatState:
    state = ChatState()
    for key, value in overrides.items():
        setattr(state, key, value)
    return state


__all__ = [
    "Attachment",
    "ChatState",
    "TokenUsage",
    "RateLimitStatus",
    "create_chat_state",
]
