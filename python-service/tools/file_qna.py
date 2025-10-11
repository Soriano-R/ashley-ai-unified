from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import fitz  # PyMuPDF
import numpy as np
import pandas as pd

from app.config import get_settings
from tools.openai_client import create_embeddings


@dataclass
class DocumentChunk:
    chunk_id: str
    text: str
    metadata: Dict[str, str]
    embedding: Optional[List[float]] = None


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 200) -> List[str]:
    words = text.split()
    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = min(len(words), start + chunk_size)
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = max(0, end - overlap)
    return chunks


def _read_pdf(path: Path) -> str:
    doc = fitz.open(path)
    texts = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(texts)


def _read_csv(path: Path, max_rows: int = 500) -> str:
    df = pd.read_csv(path).head(max_rows)
    return df.to_markdown()


def _read_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _read_code(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


FILE_READERS = {
    ".pdf": _read_pdf,
    ".csv": _read_csv,
    ".txt": _read_txt,
    ".md": _read_txt,
    ".py": _read_code,
    ".js": _read_code,
    ".ts": _read_code,
    ".java": _read_code,
    ".cs": _read_code,
    ".json": _read_code,
    ".yaml": _read_code,
    ".yml": _read_code,
}


class FileQAManager:
    def __init__(self, storage_dir: Path) -> None:
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._session_cache: Dict[str, Dict[str, List[DocumentChunk]]] = {}

    def _session_path(self, session_id: str) -> Path:
        return self.storage_dir / f"{session_id}.json"

    def _load_session(self, session_id: str) -> Dict[str, List[DocumentChunk]]:
        if session_id in self._session_cache:
            return self._session_cache[session_id]
        path = self._session_path(session_id)
        if not path.exists():
            self._session_cache[session_id] = {}
            return self._session_cache[session_id]
        raw = json.loads(path.read_text(encoding="utf-8"))
        docs: Dict[str, List[DocumentChunk]] = {}
        for doc_id, chunks in raw.items():
            docs[doc_id] = [DocumentChunk(**chunk) for chunk in chunks]
        self._session_cache[session_id] = docs
        return docs

    def _save_session(self, session_id: str) -> None:
        docs = self._session_cache.get(session_id, {})
        path = self._session_path(session_id)
        serializable = {
            doc_id: [chunk.__dict__ for chunk in chunks]
            for doc_id, chunks in docs.items()
        }
        path.write_text(json.dumps(serializable, ensure_ascii=False, indent=2), encoding="utf-8")

    def ingest_file(self, session_id: str, file_path: Path) -> Dict[str, any]:
        file_path = Path(file_path)
        suffix = file_path.suffix.lower()
        reader = FILE_READERS.get(suffix)
        if reader is None:
            raise ValueError(f"Unsupported file type: {suffix}")
        text = reader(file_path)
        chunks_text = _chunk_text(text)
        chunk_ids = [f"{file_path.stem}_chunk_{idx}" for idx in range(len(chunks_text))]
        embeddings = create_embeddings(chunks_text)
        chunk_objects = [
            DocumentChunk(
                chunk_id=chunk_id,
                text=chunk_text,
                metadata={
                    "file_name": file_path.name,
                    "source_path": str(file_path),
                    "chunk_index": str(idx),
                },
                embedding=embedding,
            )
            for idx, (chunk_id, chunk_text, embedding) in enumerate(zip(chunk_ids, chunks_text, embeddings))
        ]
        docs = self._load_session(session_id)
        docs[file_path.name] = chunk_objects
        self._session_cache[session_id] = docs
        self._save_session(session_id)
        return {
            "file_name": file_path.name,
            "chunks": len(chunk_objects),
        }

    def list_documents(self, session_id: str) -> List[str]:
        docs = self._load_session(session_id)
        return sorted(docs.keys())

    def document_stats(self, session_id: str) -> Dict[str, int]:
        docs = self._load_session(session_id)
        return {name: len(chunks) for name, chunks in docs.items()}

    def drop_session(self, session_id: str) -> None:
        self._session_cache.pop(session_id, None)
        path = self._session_path(session_id)
        if path.exists():
            path.unlink()

    def query(self, session_id: str, query: str, top_k: int = 4) -> List[DocumentChunk]:
        docs = self._load_session(session_id)
        if not docs:
            return []
        all_chunks: List[DocumentChunk] = [chunk for chunks in docs.values() for chunk in chunks]
        chunks_with_embeddings = [chunk for chunk in all_chunks if chunk.embedding is not None]
        if not chunks_with_embeddings:
            return []
        query_embedding = create_embeddings([query])[0]
        matrix = np.array([chunk.embedding for chunk in chunks_with_embeddings])
        similarities = matrix @ np.array(query_embedding)
        idxs = np.argsort(similarities)[::-1][:top_k]
        selected: List[DocumentChunk] = [chunks_with_embeddings[int(i)] for i in idxs]
        return selected

    def build_context(self, session_id: str, query: str, top_k: int = 4) -> str:
        chunks = self.query(session_id, query, top_k=top_k)
        if not chunks:
            return ""
        lines = ["# Retrieved Context"]
        for chunk in chunks:
            lines.append(f"## {chunk.metadata.get('file_name', 'Document')}")
            lines.append(chunk.text.strip())
            lines.append("")
        return "\n".join(lines)


_manager: Optional[FileQAManager] = None


def get_fileqa_manager() -> FileQAManager:
    global _manager
    if _manager is None:
        settings = get_settings()
        _manager = FileQAManager(settings.data_dir / "file_qna")
    return _manager


__all__ = ["DocumentChunk", "FileQAManager", "get_fileqa_manager"]
