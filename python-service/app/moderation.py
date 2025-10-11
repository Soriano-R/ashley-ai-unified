from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Dict, Optional

from app.config import ModerationPolicy, get_settings
from storage.moderation_log import log_event
from tools.openai_client import create_moderation


@dataclass
class ModerationResult:
    action: str
    flagged: bool
    categories: Dict[str, bool]
    scores: Dict[str, float]
    reason: Optional[str] = None


class ModerationController:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.policy_path = self.settings.data_dir / "moderation_policy.json"
        self.policy = self._load_policy()

    def _load_policy(self) -> ModerationPolicy:
        if self.policy_path.exists():
            try:
                raw = json.loads(self.policy_path.read_text(encoding="utf-8"))
                return ModerationPolicy(
                    default_action=raw.get("default_action", self.settings.moderation_policy.default_action),
                    categories=raw.get("categories", self.settings.moderation_policy.categories),
                )
            except Exception:
                pass
        return self.settings.moderation_policy

    def _save_policy(self) -> None:
        self.policy_path.write_text(
            json.dumps(
                {
                    "default_action": self.policy.default_action,
                    "categories": self.policy.categories,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    def set_category_action(self, category: str, action: str) -> None:
        self.policy.categories[category] = action
        self._save_policy()

    def set_default_action(self, action: str) -> None:
        self.policy = ModerationPolicy(default_action=action, categories=self.policy.categories)
        self._save_policy()

    def evaluate(self, session_id: str, text: str) -> ModerationResult:
        if not text.strip():
            return ModerationResult("allow", False, {}, {})
        openai_result = create_moderation(text)
        categories = openai_result.get("categories", {})
        category_scores = openai_result.get("category_scores", {})
        flagged_categories = {cat: flagged for cat, flagged in categories.items() if flagged}
        flagged = any(flagged_categories.values())
        action = "allow"
        reason = None
        allow_override = False
        for category, is_flagged in flagged_categories.items():
            if not is_flagged:
                continue
            policy_action = self.policy.categories.get(category, self.policy.default_action)
            if policy_action == "block":
                action = "block"
                reason = f"Blocked by policy: {category}"
                break
            if policy_action == "monitor" and action != "block":
                action = "monitor"
                reason = f"Monitoring category: {category}"
            if policy_action == "allow":
                allow_override = True
        if action == "allow" and flagged and not allow_override:
            action = self.policy.default_action
            reason = reason or f"Default action applied ({self.policy.default_action})"
        if action != "allow":
            log_event(
                session_id=session_id,
                category=",".join(flagged_categories.keys()) or "unknown",
                action=action,
                text_snippet=text[:280],
                detail={"scores": category_scores},
            )
        return ModerationResult(action, flagged, categories, category_scores, reason)


_controller: Optional[ModerationController] = None


def get_moderation_controller() -> ModerationController:
    global _controller
    if _controller is None:
        _controller = ModerationController()
    return _controller


def evaluate_text(session_id: str, text: str) -> ModerationResult:
    controller = get_moderation_controller()
    return controller.evaluate(session_id, text)


__all__ = ["ModerationResult", "ModerationController", "get_moderation_controller", "evaluate_text"]
