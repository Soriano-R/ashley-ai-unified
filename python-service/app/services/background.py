from __future__ import annotations

import asyncio
import concurrent.futures
import functools
import os
import threading
from typing import Any, Callable


_EXECUTOR: concurrent.futures.ThreadPoolExecutor | None = None
_LOCK = threading.Lock()


def _get_executor() -> concurrent.futures.ThreadPoolExecutor:
    global _EXECUTOR
    with _LOCK:
        if _EXECUTOR is None:
            workers = int(os.getenv("BACKGROUND_WORKERS", "4"))
            _EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=workers, thread_name_prefix="ashley-bg")
        return _EXECUTOR


def run_sync(func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    executor = _get_executor()
    future = executor.submit(func, *args, **kwargs)
    return future.result()


async def run_async(func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    loop = asyncio.get_running_loop()
    executor = _get_executor()
    bound = functools.partial(func, *args, **kwargs)
    return await loop.run_in_executor(executor, bound)


__all__ = ["run_sync", "run_async"]
