from __future__ import annotations

import gradio as gr

from ui.layout import build_interface
import logging

# Reduce noisy h11/uvicorn warnings like "Invalid HTTP request received." by elevating
# the uvicorn error logger to ERROR. This keeps the server functional while removing
# repeated, non-actionable warnings from the console/logs.
logging.getLogger("uvicorn.error").setLevel(logging.ERROR)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def launch() -> gr.Blocks:
    interface = build_interface()
    return interface


if __name__ == "__main__":
    demo = launch()
    demo.launch()
