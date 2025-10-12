from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from app.config import get_settings
from app.state import Attachment

TECH_KEYWORDS = {
    "refactor",
    "big o",
    "complexity",
    "optimize",
    "benchmark",
    "architecture",
    "kubernetes",
    "neural",
    "machine learning",
    "deploy",
    "sql",
    "query",
    "regex",
    "debug",
}

CODE_PATTERNS = [
    re.compile(r"```"),
    re.compile(r"def "),
    re.compile(r"class "),
    re.compile(r"import "),
]


@dataclass
class RoutingContext:
    text: str
    persona_names: List[str]
    attachments: List[Attachment]
    history_message_count: int
    override_model: Optional[str] = None
    force_vision: bool = False
    force_lightweight: bool = False
    temperature: float = 0.7


@dataclass
class ModelChoice:
    model: str
    reason: str
    tools: List[str]


def _contains_code(text: str) -> bool:
    if any(pattern.search(text) for pattern in CODE_PATTERNS):
        return True
    return ";" in text and "{" in text


def select_model(context: RoutingContext) -> ModelChoice:
    settings = get_settings()
    if context.override_model:
        return ModelChoice(
            model=context.override_model,
            reason="User override",
            tools=_derive_tools(context, context.override_model),
        )
    text_lower = context.text.lower()
    needs_vision = context.force_vision or any(att.type == "image" for att in context.attachments)
    contains_code = _contains_code(text_lower)
    contains_tech = any(keyword in text_lower for keyword in TECH_KEYWORDS)
    long_input = len(text_lower) > 200 or context.history_message_count > 20
    advanced_persona = any(name.lower() in {"ml_ai_prompt", "hybrid", "csharp_dotnet_prompt"} for name in context.persona_names)

    # Assign model based on persona name
    persona_map = {
        "Ashley": settings.default_model,
        "Python Expert": "deepseek-coder",
        "NSFW": "undiopenhermes",
        "Platypus": "platypus2-13b-gptq",
        "OpenHermes": "openhermes-2.5-mistral-7b-gptq",
        "NousHermes": "nous-hermes-2-mistral-7b-gptq",
        "ChronosHermes": "chronos-hermes-13b-gptq",
        "UndiPlatypus": "undiplatypus2-13b-gptq"
    }
    for persona in context.persona_names:
        if persona in persona_map:
            model = persona_map[persona]
            reason = f"Persona-based routing: {persona}"
            tools = _derive_tools(context, model)
            return ModelChoice(model=model, reason=reason, tools=tools)

    if needs_vision:
        model = settings.vision_model
        reason = "Vision request"
    elif context.force_lightweight:
        model = settings.default_model
        reason = "Forced lightweight mode"
    elif contains_code or contains_tech or advanced_persona:
        model = settings.gpt5_model or "gpt-4o"
        reason = "Technical content detected"
    elif long_input:
        model = "gpt-4o"
        reason = "Long input or history"
    else:
        model = settings.default_model
        reason = "Default routing"

    tools = _derive_tools(context, model)
    return ModelChoice(model=model, reason=reason, tools=tools)


def _derive_tools(context: RoutingContext, model: str) -> List[str]:
    tools: List[str] = []
    if any(att.type in {"pdf", "csv", "txt", "code"} for att in context.attachments):
        tools.append("file_qna")
    if any(att.type == "image" for att in context.attachments):
        tools.append("vision")
    if _contains_code(context.text.lower()):
        tools.append("code")
    if len(context.text) > 280:
        tools.append("search")
    return tools


__all__ = ["RoutingContext", "ModelChoice", "select_model"]
