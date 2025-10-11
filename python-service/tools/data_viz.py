from __future__ import annotations

import base64
import io
from pathlib import Path
from typing import Optional

import pandas as pd

try:  # optional dependency; only needed for image rendering
    import matplotlib.pyplot as plt  # type: ignore
except ImportError:  # pragma: no cover - optional dependency missing
    plt = None


def dataframe_to_html(df: pd.DataFrame, *, max_rows: int = 100) -> str:
    display_df = df.head(max_rows)
    return display_df.to_html(classes="dataframe", border=0)


def dataframe_to_image(df: pd.DataFrame, *, title: Optional[str] = None) -> bytes:
    if plt is None:
        raise RuntimeError("matplotlib is required for dataframe_to_image")
    fig, ax = plt.subplots(figsize=(10, 0.4 * len(df.index) + 1))
    ax.axis("off")
    table = ax.table(cellText=df.values, colLabels=df.columns, loc="center")
    table.auto_set_font_size(False)
    table.set_fontsize(8)
    table.scale(1, 1.2)
    if title:
        ax.set_title(title)
    buf = io.BytesIO()
    plt.tight_layout()
    fig.savefig(buf, format="png", dpi=200, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def dataframe_to_data_uri(df: pd.DataFrame, *, title: Optional[str] = None) -> str:
    image_bytes = dataframe_to_image(df, title=title)
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def save_dataframe_image(df: pd.DataFrame, path: Path, *, title: Optional[str] = None) -> Path:
    if plt is None:
        raise RuntimeError("matplotlib is required for save_dataframe_image")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(dataframe_to_image(df, title=title))
    return path


__all__ = [
    "dataframe_to_html",
    "dataframe_to_image",
    "dataframe_to_data_uri",
    "save_dataframe_image",
]
