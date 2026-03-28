"""Base client module for interacting with Gemini API.
Extracted to prevent circular imports.
"""

from google import genai
from google.genai import types
from app.core.config import settings
import logging
import httpx

logger = logging.getLogger(__name__)

def get_genai_client() -> genai.Client:
    """
    Returns a configured Gemini client with finite retry settings.
    This prevents the app from hanging indefinitely during High Demand (503) errors.
    """
    if not settings.GEMINI_API_KEY:
        # Client will fail on generation, but initializing might not if mocked elsewhere
        pass

    retry_config = types.HttpOptions(
        retry_options=types.HttpRetryOptions(
            attempts=1,  # Fail fast! Only try once, do not retry
            initial_delay=1.0,
            max_delay=5.0,
        ),
        timeout=20000, # 20 seconds timeout for httpx (fail fast on high demand)
    )

    return genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=retry_config
    )

def _convert_to_openai_messages(contents, system_instruction=None):
    import base64
    messages = []
    if system_instruction:
        # Check if system_instruction is a string or a more complex object
        sys_text = system_instruction
        if hasattr(system_instruction, "parts"):
             sys_text = " ".join([p.text for p in system_instruction.parts if hasattr(p, "text")])
        messages.append({"role": "system", "content": sys_text})

    user_content_items = []
    
    for content in contents:
        if isinstance(content, str):
            user_content_items.append({"type": "text", "text": content})
        elif hasattr(content, "inline_data") and content.inline_data:
            # Handle image data part
            b64_data = base64.b64encode(content.inline_data.data).decode("utf-8")
            mime_type = content.inline_data.mime_type
            user_content_items.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{b64_data}"}
            })
        elif hasattr(content, "role"):
            # It's a structured History object for multi-turn chats
            role = "user" if content.role == "user" else "assistant"
            text = " ".join([p.text for p in getattr(content, "parts", []) if hasattr(p, "text")])
            messages.append({"role": role, "content": text})
            
    # Append any collected user parts into one user message payload
    if user_content_items:
        # Openrouter can accept array of dicts for multimodal
        messages.append({"role": "user", "content": user_content_items})
        
    return messages

def call_openrouter(model_id: str, contents: list, config: types.GenerateContentConfig = None):
    """Calls OpenRouter with an OpenAI-compatible interface."""
    if not settings.OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not found in settings.")
        return None

    # Extract system instruction if present in config
    system_instr = getattr(config, "system_instruction", None)
    messages = _convert_to_openai_messages(contents, system_instr)

    payload = {
        "model": model_id,
        "messages": messages,
    }

    # Try to map response_mime_type to response_format if possible
    if config and getattr(config, "response_mime_type", None) == "application/json":
        payload["response_format"] = {"type": "json_object"}

    try:
        logger.info(f"🧠 [DEV INFO] Resolving prompt via FALLBACK LLM: {model_id} (OpenRouter)")
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://design-studio.dev", # Optional
                },
                json=payload
            )
            response.raise_for_status()
            res_data = response.json()

            # Mocking a Gemini-like response object so we don't have to rewrite every caller
            from types import SimpleNamespace
            content_text = res_data["choices"][0]["message"]["content"]

            # Log token usage
            usage = res_data.get("usage", {})
            total_tokens = usage.get("total_tokens", "unknown")
            logger.info(f"🪙 [DEV INFO] OpenRouter Tokens Used: {total_tokens}")

            # We wrap it in a structure that resembles Gemini's response
            # gemini_res.text works
            mock_res = SimpleNamespace(
                text=content_text,
                candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(text=content_text)]))]
            )
            return mock_res
    except Exception as e:
        logger.error(f"OpenRouter call failed ({model_id}): {str(e)}")
        raise e

def call_gemini_with_fallback(
    client: genai.Client,
    primary_model: str,
    fallback_model: str,
    contents: list,
    config: types.GenerateContentConfig,
):
    """
    Calls the Gemini API with a primary model.
    If 503 occur (overload), it automatically retries with the fallback model via OpenRouter.
    Simplified to 2 layers: Native Gemini -> OpenRouter.
    """
    try:
        # Layer 1: Gemini Primary (Native)
        logger.info(f"🧠 [DEV INFO] Resolving prompt via PRIMARY LLM: {primary_model}")
        response = client.models.generate_content(
            model=primary_model,
            contents=contents,
            config=config,
        )
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            tokens = getattr(response.usage_metadata, "total_token_count", "unknown")
            logger.info(f"🪙 [DEV INFO] Gemini Tokens Used: {tokens}")
        return response
    except Exception as e:
        # Check for 503 Service Unavailable or other transient errors
        is_503 = hasattr(e, "code") and e.code == 503

        if is_503:
            logger.warning(
                f"Gemini {primary_model} overloaded (503). "
                f"Falling back to OpenRouter ({fallback_model})."
            )
        else:
            logger.error(f"Gemini primary failed: {str(e)}. Moving to OpenRouter ({fallback_model}).")

    # Layer 2: OpenRouter (e.g. Qwen 3.5 9B) as last resort
    logger.warning(f"Attempting final fallback via OpenRouter ({fallback_model})")
    try:
        return call_openrouter(
            model_id=fallback_model,
            contents=contents,
            config=config
        )
    except Exception as e3:
        logger.critical(f"All LLM providers failed! Last error: {str(e3)}")
        raise e3
