from __future__ import annotations

import contextlib
import io
import math
import multiprocessing as mp
import statistics
import textwrap
import traceback
from dataclasses import dataclass
from typing import Any, Dict, Optional

SAFE_BUILTINS = {
    "abs": abs,
    "min": min,
    "max": max,
    "sum": sum,
    "range": range,
    "len": len,
    "enumerate": enumerate,
    "map": map,
    "filter": filter,
    "sorted": sorted,
    "round": round,
    "zip": zip,
}

SAFE_GLOBALS = {
    "__builtins__": SAFE_BUILTINS,
    "math": math,
    "statistics": statistics,
}


@dataclass
class CodeExecutionResult:
    stdout: str
    stderr: str
    error: Optional[str]
    timeout: bool
    globals_snapshot: Dict[str, Any]


def _worker(code: str, input_data: Optional[str], queue: mp.Queue) -> None:
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    globals_dict: Dict[str, Any] = dict(SAFE_GLOBALS)
    locals_dict: Dict[str, Any] = {}
    if input_data is not None:
        globals_dict["_input"] = input_data
    try:
        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
            exec(code, globals_dict, locals_dict)
        queue.put(
            {
                "stdout": stdout_buffer.getvalue(),
                "stderr": stderr_buffer.getvalue(),
                "error": None,
                "globals": {k: v for k, v in globals_dict.items() if k not in SAFE_GLOBALS},
            }
        )
    except Exception as exc:
        queue.put(
            {
                "stdout": stdout_buffer.getvalue(),
                "stderr": stderr_buffer.getvalue() + traceback.format_exc(),
                "error": str(exc),
                "globals": {k: v for k, v in globals_dict.items() if k not in SAFE_GLOBALS},
            }
        )


def execute(
    code: str,
    *,
    timeout: int = 5,
    input_data: Optional[str] = None,
    allow_unsafe: bool = False,
) -> CodeExecutionResult:
    if not allow_unsafe:
        prohibited_keywords = {"import os", "import sys", "open(", "__import__", "subprocess", "socket"}
        lowered = code.lower()
        for keyword in prohibited_keywords:
            if keyword in lowered:
                return CodeExecutionResult(
                    stdout="",
                    stderr="Execution blocked by safety policy",
                    error="unsafe_code",
                    timeout=False,
                    globals_snapshot={},
                )
    queue: mp.Queue = mp.Queue()
    proc = mp.Process(target=_worker, args=(code, input_data, queue))
    proc.start()
    proc.join(timeout)
    if proc.is_alive():
        proc.terminate()
        proc.join()
        return CodeExecutionResult(
            stdout="",
            stderr="Execution timed out",
            error="timeout",
            timeout=True,
            globals_snapshot={},
        )
    if queue.empty():
        return CodeExecutionResult(
            stdout="",
            stderr="Unknown execution error",
            error="unknown",
            timeout=False,
            globals_snapshot={},
        )
    payload = queue.get()
    return CodeExecutionResult(
        stdout=payload.get("stdout", ""),
        stderr=payload.get("stderr", ""),
        error=payload.get("error"),
        timeout=False,
        globals_snapshot=payload.get("globals", {}),
    )


def format_result(result: CodeExecutionResult) -> str:
    if result.timeout:
        return "Execution timed out."
    if result.error:
        return textwrap.dedent(
            f"""Execution error: {result.error}\nStdout:\n{result.stdout}\nStderr:\n{result.stderr}"""
        ).strip()
    output = result.stdout.strip()
    stderr = result.stderr.strip()
    if stderr:
        output += f"\nWarnings:\n{stderr}"
    return output or "(no output)"


__all__ = ["execute", "format_result", "CodeExecutionResult"]
