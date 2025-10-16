from __future__ import annotations

from dataclasses import dataclass

from app.config import ModerationAction
from app.moderation import ModerationResult, evaluate_text, get_moderation_controller
from app.state import ChatState


@dataclass
class ModerationOutcome:
    result: ModerationResult
    blocked: bool


class ModerationService:
    def __init__(self) -> None:
        self.controller = get_moderation_controller()

    def evaluate(self, state: ChatState, text: str) -> ModerationOutcome:
        if not state.moderation_enabled:
            allow = ModerationResult(ModerationAction.ALLOW, False, {}, {})
            return ModerationOutcome(result=allow, blocked=False)

        result = evaluate_text(state.session_id, text)
        blocked = result.action == ModerationAction.BLOCK
        return ModerationOutcome(result=result, blocked=blocked)


__all__ = ["ModerationService", "ModerationOutcome"]
