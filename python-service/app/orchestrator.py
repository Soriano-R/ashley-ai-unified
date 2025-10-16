from __future__ import annotations

import logging
from typing import Dict, Generator, List, Optional

from app.config import get_settings
from app.moderation import ModerationResult
from app.router import build_routing_context, select_model
from app.services.context_builder import ContextBuilder
from app.services.moderation_service import ModerationService
from app.state import Attachment, ChatState
from storage.memory_store import MemoryEntry, get_memory_store
from storage.session_store import SessionStore
from storage.usage_tracker import get_usage_tracker
from tools.file_qna import get_fileqa_manager
from tools.openai_client import StreamChunk, StreamResult, complete_response, stream_response

logger = logging.getLogger(__name__)


class ModerationError(RuntimeError):
    def __init__(self, result: ModerationResult) -> None:
        self.result = result
        super().__init__(result.reason or "Request blocked by moderation policy")


class ChatOrchestrator:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.moderation_service = ModerationService()
        self.memory_store = get_memory_store()
        self.fileqa_manager = get_fileqa_manager()
        self.usage_tracker = get_usage_tracker()
        self.session_store = SessionStore()
        self.max_prompt_tokens = min(6000, self.settings.max_output_tokens * 4)
        self.context_builder = ContextBuilder(self.memory_store, self.fileqa_manager)

    def stream_reply(
        self,
        state: ChatState,
        user_text: str,
        attachments: Optional[List[Attachment]] = None,
    ) -> Generator[str, None, Dict[str, any]]:
        attachments = attachments or []
        state.attachments.extend(attachments)
        state.last_error = None
        moderation_outcome = self.moderation_service.evaluate(state, user_text)
        if moderation_outcome.blocked:
            raise ModerationError(moderation_outcome.result)
        moderation_result = moderation_outcome.result

        # Ensure session metadata persisted before processing
        self.session_store.ensure_session(state)

        history_message_count = len(state.messages)
        routing_context = build_routing_context(
            text=user_text,
            persona_names=state.persona_names,
            attachments=state.attachments,
            history_message_count=history_message_count,
            override_model=state.model_override,
            force_vision=any(att.type == "image" for att in attachments),
            temperature=state.temperature,
        )
        # Persona-based model override
        persona_model_map = {
            "Ashley_NSFW": "llama-3.1-8b-instruct",
            "Ashley_SFW": "gpt-4o-mini",
            # Add more persona-model mappings as needed
        }
        for persona in state.persona_names:
            if persona in persona_model_map:
                state.model_override = persona_model_map[persona]
                break  # Use first matching persona
        else:
            state.model_override = None  # No override if no mapping found

        model_choice = select_model(routing_context)
        state.active_model = model_choice.model
        logger.info(
            "Routing request | session=%s model=%s tools=%s chars=%s",
            state.session_id,
            model_choice.model,
            model_choice.tools,
            len(user_text),
        )

        context_text = self.context_builder.build_file_context(
            state.session_id,
            user_text,
            list(model_choice.tools),
        )
        tool_text = self.context_builder.build_tool_context(state, user_text, list(model_choice.tools))
        if tool_text:
            context_text = (context_text + "\n\n" + tool_text).strip() if context_text else tool_text
        trimmed = user_text.strip()
        if trimmed.startswith("/search"):
            user_payload = trimmed[len("/search") :].strip() or user_text
        elif trimmed.startswith("!run"):
            user_payload = "Please review the execution output provided in the tool context and respond accordingly."
        else:
            user_payload = user_text

        memory_text = self.context_builder.build_memory_context(state, user_payload)

        # Append user message to state and persistence before streaming
        attachment_payload = [att.__dict__ for att in attachments]
        state.add_message(
            "user",
            user_text,
            attachments=attachment_payload,
            model=model_choice.model,
            tools=model_choice.tools,
        )
        self.session_store.append_message(
            session_id=state.session_id,
            role="user",
            content=user_text,
            metadata={"attachments": attachment_payload, "model": model_choice.model},
        )
        if state.memory_enabled:
            self.memory_store.append_short_term(state.session_id, "user", user_text)

        messages = self.context_builder.prepare_messages(
            state,
            user_payload,
            context_text,
            memory_text,
            model_choice.model,
            self.max_prompt_tokens,
        )

        def _finalize_response(assistant_text: str, result: StreamResult) -> Dict[str, any]:
            state.add_message(
                "assistant", assistant_text, model=model_choice.model, tools=model_choice.tools
            )
            self.session_store.append_message(
                session_id=state.session_id,
                role="assistant",
                content=assistant_text,
                metadata={"model": model_choice.model, "tools": model_choice.tools},
            )
            if state.memory_enabled:
                self.memory_store.append_short_term(state.session_id, "assistant", assistant_text)
                if len(state.messages) % 8 == 0 and assistant_text:
                    summary = assistant_text[:200]
                    entry = MemoryEntry(
                        session_id=state.session_id,
                        role="assistant",
                        content=summary,
                        tags=list(state.persona_names),
                    )
                    self.memory_store.add_long_term(entry)

            usage = result.usage
            cost = usage.cost_usd(model_choice.model)
            state.token_usage.update(usage.prompt_tokens, usage.completion_tokens, cost)
            self.usage_tracker.update(
                session_id=state.session_id,
                model=model_choice.model,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens,
                cost_usd=cost,
            )
            self.session_store.update_usage(
                session_id=state.session_id,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens,
                cost_usd=cost,
            )

            state.last_error = None
            return {
                "model": model_choice.model,
                "moderation": moderation_result.action.value,
                "tools": model_choice.tools,
                "usage": {
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "cost_usd": cost,
                },
            }

        def _generator() -> Generator[str, None, Dict[str, any]]:
            try:
                stream = stream_response(
                    input_messages=messages,
                    model=model_choice.model,
                    temperature=state.temperature,
                    max_output_tokens=self.settings.max_output_tokens,
                    top_p=state.top_p,
                    presence_penalty=state.presence_penalty,
                    frequency_penalty=state.frequency_penalty,
                )
            except Exception as exc:
                logger.warning(
                    "Streaming failed, falling back to sync response | session=%s error=%s",
                    state.session_id,
                    exc,
                    exc_info=True,
                )
                try:
                    result = complete_response(
                        input_messages=messages,
                        model=model_choice.model,
                        temperature=state.temperature,
                        max_output_tokens=self.settings.max_output_tokens,
                        top_p=state.top_p,
                        presence_penalty=state.presence_penalty,
                        frequency_penalty=state.frequency_penalty,
                    )
                except Exception as final_exc:
                    state.last_error = str(final_exc)
                    logger.error(
                        "Responses API call failed | session=%s error=%s",
                        state.session_id,
                        final_exc,
                        exc_info=True,
                    )
                    raise
                assistant_text = result.text
                if assistant_text:
                    yield assistant_text
                return _finalize_response(assistant_text, result)

            aggregated: List[str] = []
            try:
                while True:
                    chunk: StreamChunk = next(stream)
                    aggregated.append(chunk.text)
                    yield chunk.text
            except StopIteration as stop:
                stream_result_payload = stop.value
                assistant_text = "".join(aggregated)
                return _finalize_response(assistant_text, stream_result_payload)

        return _generator()

    def stream_response(self, state: ChatState, user_text: str):
        """Compatibility method for UI - delegates to stream_reply"""
        return self.stream_reply(state, user_text)


_orchestrator: Optional[ChatOrchestrator] = None


def get_orchestrator() -> ChatOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = ChatOrchestrator()
    return _orchestrator


__all__ = ["ChatOrchestrator", "get_orchestrator", "ModerationError"]
