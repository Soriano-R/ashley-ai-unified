"""Centralised logging configuration for the Ashley AI backend."""

from __future__ import annotations

import copy
import logging
import logging.config
from functools import lru_cache
from typing import Optional, Union


_DEFAULT_LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s | %(levelname)s | %(name)s:%(lineno)d | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "level": "INFO",
        }
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}


def _coerce_level(level: Union[int, str, None]) -> str:
    if level is None:
        return "INFO"
    if isinstance(level, int):
        return logging.getLevelName(level)
    return str(level).upper()


@lru_cache(maxsize=1)
def configure_logging(level: Union[int, str, None] = None) -> None:
    """Configure application-wide logging exactly once."""
    config = copy.deepcopy(_DEFAULT_LOGGING_CONFIG)
    coerced_level = _coerce_level(level)
    config["handlers"]["console"]["level"] = coerced_level
    config["root"]["level"] = coerced_level
    logging.config.dictConfig(config)


__all__ = ["configure_logging"]
