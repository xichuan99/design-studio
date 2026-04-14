def clean_llm_json_response(text: str) -> str:
    """
    Cleans LLM JSON output by removing markdown fences and extra whitespace.
    Handles ```json, ``` and stray whitespace.
    """
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()
"""Base client module for interacting with Gemini API.
Extracted to prevent circular imports.
"""

from google import genai
from google.genai import types
from app.core.config import settings
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

MAX_ERROR_BODY_LOG_CHARS = 4000


def _truncate_for_log(text: Optional[str], max_chars: int = MAX_ERROR_BODY_LOG_CHARS) -> str:
    if not text:
        return "<empty>"
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars]}...[truncated {len(text) - max_chars} chars]"


def _log_failed_provider_response(provider: str, model_id: str, response: httpx.Response, reason: str) -> None:
    try:
        response_text = response.text
    except Exception as read_err:
        response_text = f"<unable to read response text: {read_err}>"

    logger.error(
        "%s call failed (%s): %s | status=%s | body=%s",
        provider,
        model_id,
        reason,
        response.status_code,
        _truncate_for_log(response_text),
    )


def _apply_openrouter_generation_defaults(
    model_id: str,
    payload: dict,
    config: Optional[types.GenerateContentConfig],
) -> None:
    max_output_tokens = getattr(config, "max_output_tokens", None) if config else None
    if max_output_tokens is not None:
        payload["max_tokens"] = max_output_tokens
        return

    # OpenRouter may forward an oversized default to MiniMax.
    # Keep structured JSON tasks on a safe ceiling unless a caller overrides it.
    if model_id.startswith("minimax/"):
        payload["max_tokens"] = 4000

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
                "image_url": {
                    "url": f"data:{mime_type};base64,{b64_data}",
                    "detail": "auto"
                }
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

    _apply_openrouter_generation_defaults(model_id, payload, config)

    # Try to map response_mime_type to response_format if possible
    # Minimax does not support response_format param, skip for minimax
    if config and getattr(config, "response_mime_type", None) == "application/json" and not model_id.startswith("minimax/"):
        payload["response_format"] = {"type": "json_object"}

    response = None
    response_failure_logged = False
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

            if response.status_code != 200:
                _log_failed_provider_response("OpenRouter", model_id, response, "non-200 response")
                response_failure_logged = True

            response.raise_for_status()

            # Try to clean up LLM output if response is not valid JSON
            try:
                res_data = response.json()
            except ValueError:
                # Try to extract and clean the text, then parse
                try:
                    raw = response.text
                    cleaned = clean_llm_json_response(raw)
                    import json
                    res_data = json.loads(cleaned)
                    logger.warning("OpenRouter returned non-standard JSON, cleaned and parsed successfully.")
                except Exception as e2:
                    _log_failed_provider_response("OpenRouter", model_id, response, f"invalid JSON response and cleaning failed: {e2}")
                    response_failure_logged = True
                    raise

            # Defensive: if error field present, treat as error even if status 200
            if "error" in res_data:
                error_msg = res_data["error"].get("message") or str(res_data["error"])
                _log_failed_provider_response("OpenRouter", model_id, response, f"error payload: {error_msg}")
                response_failure_logged = True
                raise RuntimeError(f"OpenRouter error: {error_msg}")

            choices = res_data.get("choices")
            if not isinstance(choices, list) or not choices:
                _log_failed_provider_response("OpenRouter", model_id, response, "missing or empty 'choices' in response")
                response_failure_logged = True
                raise KeyError("choices")

            first_choice = choices[0]
            if not isinstance(first_choice, dict) or "message" not in first_choice:
                _log_failed_provider_response("OpenRouter", model_id, response, "missing 'message' in first choice")
                response_failure_logged = True
                raise KeyError("message")

            # Mocking a Gemini-like response object so we don't have to rewrite every caller
            from types import SimpleNamespace
            content_text = first_choice["message"].get("content", "")

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
        if response is not None and not response_failure_logged:
            _log_failed_provider_response("OpenRouter", model_id, response, f"exception: {type(e).__name__}")
        elif response is None:
            logger.error(f"OpenRouter call failed ({model_id}) before receiving response: {str(e)}")
        raise

def call_xai(model_id: str, contents: list, config: types.GenerateContentConfig = None):
    """Calls xAI (Grok) API with an OpenAI-compatible interface."""
    if not settings.XAI_API_KEY:
        logger.error("XAI_API_KEY not found in settings.")
        return None

    # Extract system instruction if present in config
    system_instr = getattr(config, "system_instruction", None)
    messages = _convert_to_openai_messages(contents, system_instr)

    payload = {
        "model": model_id,
        "messages": messages,
    }

    # Handle response format if it is JSON
    if config and getattr(config, "response_mime_type", None) == "application/json":
        payload["response_format"] = {"type": "json_object"}

    response = None
    response_failure_logged = False
    try:
        logger.info(f"🧠 [DEV INFO] Resolving prompt via xAI (Grok): {model_id}")
        with httpx.Client(timeout=120.0) as client: # Longer timeout for image generation
            response = client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.XAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload
            )

            if response.status_code != 200:
                _log_failed_provider_response("xAI", model_id, response, "non-200 response")
                response_failure_logged = True

            response.raise_for_status()
            try:
                res_data = response.json()
            except ValueError:
                _log_failed_provider_response("xAI", model_id, response, "invalid JSON response")
                response_failure_logged = True
                raise

            choices = res_data.get("choices")
            if not isinstance(choices, list) or not choices:
                _log_failed_provider_response("xAI", model_id, response, "missing or empty 'choices' in response")
                response_failure_logged = True
                raise KeyError("choices")

            first_choice = choices[0]
            if not isinstance(first_choice, dict) or "message" not in first_choice:
                _log_failed_provider_response("xAI", model_id, response, "missing 'message' in first choice")
                response_failure_logged = True
                raise KeyError("message")

            from types import SimpleNamespace

            # Special handling for grok-imagine models which might return something else?
            # Actually, standard completions return choices[0].message.content
            # If it returns an image, it might be different, but xAI docs usually say it's compatible.
            # Let's assume standard for now, and check if content is image data.

            content_text = first_choice["message"].get("content", "")

            # Log token usage
            usage = res_data.get("usage", {})
            total_tokens = usage.get("total_tokens", "unknown")
            logger.info(f"🪙 [DEV INFO] xAI Tokens Used: {total_tokens}")

            mock_res = SimpleNamespace(
                text=content_text,
                candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(text=content_text)]))]
            )
            return mock_res
    except Exception as e:
        if response is not None and not response_failure_logged:
            _log_failed_provider_response("xAI", model_id, response, f"exception: {type(e).__name__}")
        elif response is None:
            logger.error(f"xAI call failed ({model_id}) before receiving response: {str(e)}")
        raise

def generate_image_xai(model_id: str, prompt: str, aspect_ratio: str = "1:1"):
    """Calls xAI (Grok) Image Generation API."""
    if not settings.XAI_API_KEY:
        logger.error("XAI_API_KEY not found in settings.")
        return None

    payload = {
        "model": model_id,
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
    }
    # xAI grok-imagine-image expects aspect_ratio (e.g., "1:1", "16:9", "9:16")
    # Remove any 'size' parameter, only send aspect_ratio

    response = None
    response_failure_logged = False
    try:
        logger.info(f"🎨 [DEV INFO] Generating image via xAI: {model_id}")
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                "https://api.x.ai/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {settings.XAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload
            )

            if response.status_code != 200:
                _log_failed_provider_response("xAI image", model_id, response, "non-200 response")
                response_failure_logged = True

            response.raise_for_status()
            try:
                res_data = response.json()
            except ValueError:
                _log_failed_provider_response("xAI image", model_id, response, "invalid JSON response")
                response_failure_logged = True
                raise

            # xAI returns URL or b64. Let's assume standard OpenAI format: data[0].url or data[0].b64_json
            from types import SimpleNamespace

            image_list = res_data.get("data")
            if not isinstance(image_list, list) or not image_list:
                _log_failed_provider_response("xAI image", model_id, response, "missing or empty 'data' in response")
                response_failure_logged = True
                raise KeyError("data")

            image_data = image_list[0]
            url = image_data.get("url")
            b64 = image_data.get("b64_json")

            # Create a mock response that banner_service can consume
            # banner_service expects img.image.image_bytes if it's local, or a URL

            if b64:
                import base64
                image_bytes = base64.b64decode(b64)
                mock_res = SimpleNamespace(
                    generated_images=[SimpleNamespace(image=SimpleNamespace(image_bytes=image_bytes))]
                )
            else:
                # If it's a URL, we'll return it in a way the service can handle
                # Actually banner_service handles URL from Fal, but bytes from Gemini.
                # I'll return a SimpleNamespace that mimics the Gemini one if bytes are available,
                # or just the URL.
                mock_res = SimpleNamespace(
                    url=url,
                    generated_images=[SimpleNamespace(image=SimpleNamespace(url=url, image_bytes=None))]
                )
            return mock_res

    except Exception as e:
        if response is not None and not response_failure_logged:
            _log_failed_provider_response("xAI image", model_id, response, f"exception: {type(e).__name__}")
        elif response is None:
            logger.error(f"xAI image generation failed ({model_id}) before receiving response: {str(e)}")
        raise

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
    if primary_model.startswith("openrouter/"):
        actual_model = primary_model.replace("openrouter/", "", 1)
        logger.info(f"🧠 [DEV INFO] Resolving prompt via PRIMARY LLM (OpenRouter direct routing): {actual_model}")
        try:
            return call_openrouter(
                model_id=actual_model,
                contents=contents,
                config=config
            )
        except Exception as e:
            logger.error(f"OpenRouter primary failed: {str(e)}. Moving to OpenRouter fallback ({fallback_model}).")
    elif primary_model.startswith("xai/"):
        actual_model = primary_model.replace("xai/", "", 1)
        logger.info(f"🧠 [DEV INFO] Resolving prompt via PRIMARY LLM (xAI direct routing): {actual_model}")
        try:
            return call_xai(
                model_id=actual_model,
                contents=contents,
                config=config
            )
        except Exception as e:
            logger.error(f"xAI primary failed: {str(e)}. Moving to OpenRouter fallback ({fallback_model}).")
    else:
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
        # Ensure prefix is stripped for the final fallback as well
        actual_fallback_model = fallback_model
        if fallback_model.startswith("openrouter/"):
            actual_fallback_model = fallback_model.replace("openrouter/", "", 1)

        return call_openrouter(
            model_id=actual_fallback_model,
            contents=contents,
            config=config
        )
    except Exception as e3:
        logger.critical(f"All LLM providers failed! Last error: {str(e3)}")
        raise e3
