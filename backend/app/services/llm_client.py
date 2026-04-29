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


"""Base client module for interacting with OpenRouter-compatible APIs.
Extracted to prevent circular imports.
"""

from google import genai
from google.genai import types
from app.core.config import settings
from app.services.llm_json_utils import parse_llm_json
import logging
import httpx
import re
from typing import Optional

logger = logging.getLogger(__name__)

MAX_ERROR_BODY_LOG_CHARS = 4000
PROVIDER_OUTAGE_STATUS_CODES = {500, 502, 503, 504, 520, 521, 522, 523, 524}


class LLMRateLimitError(Exception):
    def __init__(self, model_id: str, retry_after_seconds: int, message: str):
        self.model_id = model_id
        self.retry_after_seconds = retry_after_seconds
        super().__init__(message)


def _extract_http_status_code(exc: Exception) -> Optional[int]:
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    direct_status = getattr(exc, "status_code", None)
    if isinstance(direct_status, int):
        return direct_status

    return None


def _extract_retry_after_seconds(exc: Exception) -> int:
    response = getattr(exc, "response", None)
    if response is not None:
        retry_after_header = response.headers.get("Retry-After")
        if retry_after_header:
            try:
                return max(1, int(float(retry_after_header.strip())))
            except Exception:
                pass

    message = str(exc)
    message_lower = message.lower()

    patterns = [
        r"retry in\s*(\d+(?:\.\d+)?)\s*s",
        r"retrydelay['\"\s:]+(\d+(?:\.\d+)?)\s*s",
        r"retry after\s*(\d+(?:\.\d+)?)\s*s",
    ]

    for pattern in patterns:
        match = re.search(pattern, message_lower)
        if match:
            try:
                return max(1, int(float(match.group(1))))
            except Exception:
                continue

    return 30


def _is_rate_limit_error(exc: Exception) -> bool:
    status_code = _extract_http_status_code(exc)
    if status_code == 429:
        return True

    msg = str(exc).lower()
    return any(
        token in msg
        for token in [" 429", "rate limit", "rate-limited", "resource_exhausted", "quota exceeded"]
    )


def _is_provider_availability_error(exc: Exception) -> bool:
    status_code = _extract_http_status_code(exc)
    if status_code in PROVIDER_OUTAGE_STATUS_CODES:
        return True

    if isinstance(
        exc,
        (
            httpx.ConnectError,
            httpx.ConnectTimeout,
            httpx.ReadTimeout,
            httpx.WriteTimeout,
            httpx.PoolTimeout,
            httpx.RemoteProtocolError,
            httpx.NetworkError,
        ),
    ):
        return True

    msg = str(exc).lower()
    return any(
        token in msg
        for token in [
            "temporarily unavailable",
            "connection reset",
            "connection refused",
            "connection aborted",
            "dns",
            "timed out",
            "timeout",
            "service unavailable",
        ]
    )


def _extract_error_message(error_val) -> str:
    if isinstance(error_val, dict):
        return error_val.get("message") or str(error_val)
    return str(error_val)


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
    Returns a configured OpenRouter-proxied Gemini client.
    """
    retry_config = types.HttpOptions(
        retry_options=types.HttpRetryOptions(
            attempts=1,
            initial_delay=1.0,
            max_delay=5.0,
        ),
        timeout=20000,
    )

    return genai.Client(
        api_key=settings.OPENROUTER_API_KEY,
        http_options=retry_config
    )

def get_direct_gemini_client() -> genai.Client:
    """
    Returns a direct Google Gemini client (bypassing OpenRouter).
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set for direct fallback")

    retry_config = types.HttpOptions(
        retry_options=types.HttpRetryOptions(
            attempts=2, # Allow 1 retry for direct stable provider
            initial_delay=1.0,
            max_delay=5.0,
        ),
        timeout=30000,
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
        # But for text-only, it's safer to use a string to satisfy JSON mode validation
        has_image = any(item.get("type") == "image_url" for item in user_content_items)
        if not has_image:
            text_content = "\n\n".join(item["text"] for item in user_content_items if item.get("type") == "text")
            messages.append({"role": "user", "content": text_content})
        else:
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
                    res_data = parse_llm_json(cleaned)
                    logger.warning("OpenRouter returned non-standard JSON, cleaned and parsed successfully.")
                except Exception as e2:
                    _log_failed_provider_response("OpenRouter", model_id, response, f"invalid JSON response and cleaning failed: {e2}")
                    response_failure_logged = True
                    raise

            choices = res_data.get("choices")
            if not isinstance(choices, list) or not choices:
                error_val = res_data.get("error")
                error_msg = _extract_error_message(error_val) if error_val is not None else None
                log_reason = "missing or empty 'choices' in response"
                if error_msg:
                    log_reason += f" | error: {error_msg}"
                _log_failed_provider_response("OpenRouter", model_id, response, log_reason)
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
            try:
                res_data = response.json()
                error_val = res_data.get("error")
                error_msg = _extract_error_message(error_val) if error_val is not None else None
            except Exception:
                error_msg = None
            log_reason = f"exception: {type(e).__name__}"
            if error_msg:
                log_reason += f" | error: {error_msg}"
            _log_failed_provider_response("OpenRouter", model_id, response, log_reason)
        elif response is None:
            logger.error(f"OpenRouter call failed ({model_id}) before receiving response: {str(e)}")
        raise

def call_gemini_with_fallback(
    client: genai.Client,
    primary_model: str,
    fallback_model: str,
    contents: list,
    config: types.GenerateContentConfig,
):
    """
    Calls the primary model and retries with fallback when needed.
    Supports OpenRouter and Direct Gemini based on model prefix.
    """
    def _do_call(model_id: str, is_fallback: bool = False):
        label = "FALLBACK" if is_fallback else "PRIMARY"

        if model_id.startswith("openrouter/"):
            actual_id = model_id.replace("openrouter/", "", 1)
            logger.info(f"🧠 [DEV INFO] Resolving prompt via {label} LLM (OpenRouter): {actual_id}")
            return call_openrouter(model_id=actual_id, contents=contents, config=config)

        elif model_id.startswith("google/"):
            actual_id = model_id.replace("google/", "", 1)
            logger.info(f"🧠 [DEV INFO] Resolving prompt via {label} LLM (Direct Gemini): {actual_id}")
            direct_client = get_direct_gemini_client()
            return direct_client.models.generate_content(model=actual_id, contents=contents, config=config)

        else:
            # Legacy/default handling (usually OpenRouter via the passed client)
            logger.info(f"🧠 [DEV INFO] Resolving prompt via {label} LLM (Default Client): {model_id}")
            return client.models.generate_content(model=model_id, contents=contents, config=config)

    try:
        return _do_call(primary_model)
    except Exception as e:
        if _is_rate_limit_error(e):
            retry_after_seconds = _extract_retry_after_seconds(e)
            logger.warning(
                "Primary LLM (%s) is rate-limited. Preserving primary-first policy and skipping fallback. retry_after_seconds=%s",
                primary_model,
                retry_after_seconds,
            )
            raise LLMRateLimitError(
                model_id=primary_model,
                retry_after_seconds=retry_after_seconds,
                message=f"Primary model rate-limited: {primary_model}",
            ) from e

        if not _is_provider_availability_error(e):
            logger.error(
                "Primary LLM (%s) failed with non-availability error: %s. Skipping fallback.",
                primary_model,
                str(e),
            )
            raise e

        logger.error(
            "Primary LLM (%s) failed due provider availability issue: %s. Moving to Fallback (%s).",
            primary_model,
            str(e),
            fallback_model,
        )

        try:
            return _do_call(fallback_model, is_fallback=True)
        except Exception as e_fb:
            # Emergency direct fallback to ensure stability if OpenRouter (primary/fallback) is down
            emergency_model = "google/gemini-2.5-flash"
            if fallback_model != emergency_model:
                logger.warning(f"Secondary Fallback ({fallback_model}) also failed. Attempting EMERGENCY direct fallback: {emergency_model}")
                try:
                    return _do_call(emergency_model, is_fallback=True)
                except Exception as e_em:
                    logger.critical(f"CRITICAL: All LLM providers including EMERGENCY failed! {str(e_em)}")
                    raise e_em

            logger.critical(f"All LLM providers failed! Last error: {str(e_fb)}")
            raise e_fb
