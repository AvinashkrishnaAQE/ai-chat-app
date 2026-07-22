import os
from typing import AsyncGenerator
import litellm
from app.core.config import settings

os.environ["OPENROUTER_API_KEY"] = settings.OPENROUTER_API_KEY

# Curated subset — verify against https://openrouter.ai/models if any of these
# 404, and swap the slug. This list is just data, not architecture.
MODEL_CATALOG = [
    {"id": "anthropic/claude-3.5-sonnet", "label": "Claude 3.5 Sonnet"},
    {"id": "openai/gpt-4o", "label": "GPT-4o"},
    {"id": "openai/gpt-4o-mini", "label": "GPT-4o Mini"},
    {"id": "meta-llama/llama-3.1-70b-instruct", "label": "Llama 3.1 70B"},
    {"id": "google/gemini-pro-1.5", "label": "Gemini 1.5 Pro"},
]

DEFAULT_MODEL = MODEL_CATALOG[0]["id"]

_VALID_MODEL_IDS = {m["id"] for m in MODEL_CATALOG}


def is_valid_model(model_id: str) -> bool:
    return model_id in _VALID_MODEL_IDS


class LLMError(Exception):
    """Raised with a message safe to show the end user."""
    def __init__(self, message: str):
        self.message = message


async def stream_completion(
    model_id: str, conversation_history: list[dict]
) -> AsyncGenerator[str, None]:
    """
    conversation_history: list of {"role": "user"|"assistant", "content": str},
    oldest first — the caller is responsible for trimming to a sane context window.
    """
    try:
        response = await litellm.acompletion(
            model=f"openrouter/{model_id}",
            messages=conversation_history,
            stream=True,
            max_tokens=2048,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    except litellm.exceptions.RateLimitError:
        raise LLMError("The model provider is rate-limiting requests right now. Please try again shortly.")
    except litellm.exceptions.ContextWindowExceededError:
        raise LLMError("This conversation is too long for the selected model. Try starting a new chat.")
    except litellm.exceptions.AuthenticationError:
        raise LLMError("Server misconfiguration: the LLM provider rejected the API key.")
    except litellm.exceptions.APIConnectionError:
        raise LLMError("Couldn't reach the model provider. Please try again.")
    except Exception:
        raise LLMError("Something went wrong generating a response. Please try again.")