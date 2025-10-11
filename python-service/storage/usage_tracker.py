from __future__ import annotations

import calendar
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

from app.config import get_settings


def _usage_path() -> Path:
    p = get_settings().data_dir / "usage.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        p.write_text("{}", encoding="utf-8")
    return p


class UsageTracker:
    def __init__(self) -> None:
        self.path = _usage_path()

    def _load(self) -> Dict[str, Dict[str, float]]:
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save(self, data: Dict[str, Dict[str, float]]) -> None:
        self.path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def update(
        self,
        *,
        session_id: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
    ) -> None:
        data = self._load()
        month_key = time.strftime("%Y-%m")
        agg = data.setdefault(month_key, {"prompt_tokens": 0, "completion_tokens": 0, "cost_usd": 0.0})
        agg["prompt_tokens"] += int(prompt_tokens)
        agg["completion_tokens"] += int(completion_tokens)
        agg["cost_usd"] += float(cost_usd)
        self._save(data)

    def get_month_usage(self, month_key: Optional[str] = None) -> str:
        data = self._load()
        key = month_key or time.strftime("%Y-%m")
        agg = data.get(key, {"prompt_tokens": 0, "completion_tokens": 0, "cost_usd": 0.0})
        return (
            f"Prompt: {int(agg['prompt_tokens'])} | Completion: {int(agg['completion_tokens'])} | Cost: ${float(agg['cost_usd']):.4f}"
        )


_tracker: Optional[UsageTracker] = None  # type: ignore


def get_usage_tracker() -> UsageTracker:
    global _tracker
    if _tracker is None:
        _tracker = UsageTracker()
    return _tracker


__all__ = ["UsageTracker", "get_usage_tracker"]
