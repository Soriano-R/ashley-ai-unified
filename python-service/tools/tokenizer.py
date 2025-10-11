from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Sequence

import tiktoken

_MODEL_COSTS = {
    "gpt-5": {"prompt": 120.0, "completion": 120.0},  # placeholder cost per 1M tokens ($)
    "gpt-4o": {"prompt": 5.0, "completion": 15.0},
    "gpt-4o-mini": {"prompt": 0.5, "completion": 1.5},
    "gpt-3.5-turbo": {"prompt": 1.0, "completion": 2.0},
}


@dataclass
class TokenCount:
    prompt_tokens: int
    completion_tokens: int = 0

    @property
    def total(self) -> int:
        return self.prompt_tokens + self.completion_tokens

    def cost_usd(self, model: str) -> float:
        cost_info = _MODEL_COSTS.get(model, _MODEL_COSTS.get("gpt-4o-mini"))
        prompt_cost_per_m = cost_info["prompt"]
        completion_cost_per_m = cost_info["completion"]
        return (
            (self.prompt_tokens / 1_000_000) * prompt_cost_per_m
            + (self.completion_tokens / 1_000_000) * completion_cost_per_m
        )


@lru_cache(maxsize=32)
def get_encoder(model: str) -> tiktoken.Encoding:
    try:
        return tiktoken.encoding_for_model(model)
    except KeyError:
        return tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str, model: str) -> int:
    encoder = get_encoder(model)
    return len(encoder.encode(text))


def count_message_tokens(messages: Sequence[dict], model: str) -> int:
    encoder = get_encoder(model)
    total = 0
    for message in messages:
        content = message.get("content", "")
        total += len(encoder.encode(content)) + 3
    return total + 3


def truncate_text(text: str, model: str, max_tokens: int) -> str:
    encoder = get_encoder(model)
    tokens = encoder.encode(text)
    if len(tokens) <= max_tokens:
        return text
    truncated_tokens = tokens[:max_tokens]
    return encoder.decode(truncated_tokens)


def safe_truncate_messages(
    messages: List[dict],
    model: str,
    max_prompt_tokens: int,
) -> List[dict]:
    encoder = get_encoder(model)
    total_tokens = 0
    truncated: List[dict] = []
    # iterate backwards to keep the most recent context intact
    for message in reversed(messages):
        content = message.get("content", "")
        message_tokens = len(encoder.encode(content)) + 3
        if total_tokens + message_tokens > max_prompt_tokens:
            remaining = max_prompt_tokens - total_tokens - 3
            if remaining > 0:
                truncated_content = encoder.decode(encoder.encode(content)[-remaining:])
                truncated.append({**message, "content": truncated_content})
                total_tokens += remaining + 3
            break
        truncated.append(message)
        total_tokens += message_tokens
    truncated.reverse()
    return truncated


def tokens_to_chars(token_count: int, avg_chars_per_token: float = 3.6) -> int:
    return math.ceil(token_count * avg_chars_per_token)


__all__ = [
    "TokenCount",
    "count_tokens",
    "count_message_tokens",
    "truncate_text",
    "safe_truncate_messages",
    "tokens_to_chars",
]
