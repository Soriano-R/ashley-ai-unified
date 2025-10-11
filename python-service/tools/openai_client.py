from __future__ import annotations

import base64
from contextlib import contextmanager
from dataclasses import dataclass
from io import BytesIO
from typing import Dict, Generator, Iterable, List, Optional

from openai import OpenAI

from app.config import get_settings
from tools.tokenizer import TokenCount


_client: Optional[OpenAI] = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        api_key = settings.require_openai_key()
        _client = OpenAI(api_key=api_key, organization=settings.openai_organization)
    return _client


@dataclass
class StreamChunk:
    text: str
    event_type: str


@dataclass
class StreamResult:
    text: str
    usage: TokenCount
    response_id: str


@contextmanager
def _response_stream(**kwargs):
    client = get_client()
    with client.responses.stream(**kwargs) as stream:
        yield stream


def _usage_to_dict(usage: Optional[object]) -> Dict[str, int]:
    if usage is None:
        return {}
    if isinstance(usage, dict):
        return usage
    if hasattr(usage, "model_dump"):
        return usage.model_dump()
    # Fallback for objects with attributes
    result: Dict[str, int] = {}
    for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
        value = getattr(usage, key, None)
        if value is not None:
            result[key] = value
    return result


def stream_response(
    *,
    input_messages: List[Dict],
    model: str,
    temperature: float,
    max_output_tokens: int,
    top_p: float = 1.0,
    presence_penalty: float = 0.0,
    frequency_penalty: float = 0.0,
    tools: Optional[List[Dict]] = None,
) -> Generator[StreamChunk, None, StreamResult]:
    kwargs: Dict = {
        "model": model,
        "input": input_messages,
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
        "top_p": top_p,
    }
    # The Responses API (v1) currently ignores presence/frequency penalties; we retain
    # the parameters for backwards compatibility but avoid sending unsupported args.
    if tools:
        kwargs["tools"] = tools

    with _response_stream(**kwargs) as stream:
        full_text: List[str] = []
        for event in stream:
            if event.type == "response.output_text.delta":
                delta = event.delta or ""
                full_text.append(delta)
                yield StreamChunk(text=delta, event_type=event.type)
            elif event.type == "response.completed":
                break
            elif event.type == "response.error":
                raise RuntimeError(event.error.get("message", "Unknown OpenAI stream error"))
        final = stream.get_final_response()
    usage = _usage_to_dict(final.usage)
    token_count = TokenCount(
        prompt_tokens=usage.get("prompt_tokens", 0),
        completion_tokens=usage.get("completion_tokens", 0),
    )
    return StreamResult(
        text="".join(full_text),
        usage=token_count,
        response_id=final.id,
    )


def create_moderation(text: str) -> Dict:
    client = get_client()
    response = client.moderations.create(model="omni-moderation-latest", input=text)
    result = response.results[0]
    if hasattr(result, "model_dump"):
        return result.model_dump()
    if isinstance(result, dict):
        return result
    # Fallback for objects exposing __dict__
    try:
        return dict(result)
    except Exception:
        return {
            "categories": getattr(result, "categories", {}),
            "category_scores": getattr(result, "category_scores", {}),
            "flagged": getattr(result, "flagged", False),
        }


def generate_image(prompt: str, model: Optional[str] = None, size: str = "1024x1024") -> bytes:
    settings = get_settings()
    client = get_client()
    response = client.images.generate(
        model=model or settings.dalle_model,
        prompt=prompt,
        size=size,
    )
    b64 = response.data[0].b64_json
    return base64.b64decode(b64)


def edit_image(
    image_bytes: bytes,
    prompt: str,
    mask_bytes: Optional[bytes] = None,
    model: Optional[str] = None,
    size: str = "1024x1024",
) -> bytes:
    settings = get_settings()
    client = get_client()
    image_file = BytesIO(image_bytes)
    image_file.name = "image.png"
    mask_file = None
    if mask_bytes:
        mask_file = BytesIO(mask_bytes)
        mask_file.name = "mask.png"
    response = client.images.edit(
        model=model or settings.dalle_model,
        image=image_file,
        mask=mask_file,
        prompt=prompt,
        size=size,
    )
    return base64.b64decode(response.data[0].b64_json)


def transcribe_audio(audio_bytes: bytes, model: Optional[str] = None) -> str:
    settings = get_settings()
    client = get_client()
    audio_file = BytesIO(audio_bytes)
    header = audio_bytes[:4]
    if header.startswith(b"RIFF"):
        audio_file.name = "audio.wav"
    elif header[:3] == b"ID3" or header[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}:
        audio_file.name = "audio.mp3"
    else:
        audio_file.name = "audio.wav"
    transcript = client.audio.transcriptions.create(
        model=model or settings.whisper_model,
        file=audio_file,
    )
    return transcript.text


def synthesize_speech(
    text: str,
    voice: Optional[str] = None,
    speed: float = 1.0,
) -> bytes:
    settings = get_settings()
    client = get_client()
    response = client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice=voice or settings.tts_voice_default,
        input=text,
        speed=speed,
    )
    return response.read()


def create_embeddings(texts: Iterable[str], model: Optional[str] = None) -> List[List[float]]:
    client = get_client()
    settings = get_settings()
    response = client.embeddings.create(
        model=model or settings.embeddings_model,
        input=list(texts),
    )
    return [item.embedding for item in response.data]


def vision_response(
    prompt: str,
    image_bytes: Optional[bytes] = None,
    image_url: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.7,
) -> str:
    settings = get_settings()
    client = get_client()
    content = [{"type": "input_text", "text": prompt}]
    if image_bytes is not None:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        content.append({"type": "input_image", "image_base64": b64})
    elif image_url:
        content.append({"type": "input_image", "image_url": image_url})
    response = client.responses.create(
        model=model or settings.vision_model,
        input=[{"role": "user", "content": content}],
        temperature=temperature,
    )
    return response.output_text


def complete_response(
    *,
    input_messages: List[Dict],
    model: str,
    temperature: float,
    max_output_tokens: int,
    top_p: float = 1.0,
    presence_penalty: float = 0.0,
    frequency_penalty: float = 0.0,
    tools: Optional[List[Dict]] = None,
) -> StreamResult:
    client = get_client()
    kwargs: Dict = {
        "model": model,
        "input": input_messages,
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
        "top_p": top_p,
    }
    # Presence/frequency penalties are not yet supported by the Responses API.
    if tools:
        kwargs["tools"] = tools

    response = client.responses.create(**kwargs)
    usage = _usage_to_dict(response.usage)
    token_count = TokenCount(
        prompt_tokens=usage.get("prompt_tokens", 0),
        completion_tokens=usage.get("completion_tokens", 0),
    )
    return StreamResult(text=response.output_text, usage=token_count, response_id=response.id)


__all__ = [
    "get_client",
    "stream_response",
    "complete_response",
    "StreamChunk",
    "StreamResult",
    "create_moderation",
    "generate_image",
    "edit_image",
    "transcribe_audio",
    "synthesize_speech",
    "create_embeddings",
    "vision_response",
]
