"""Base client module for interacting with Gemini API.
Extracted to prevent circular imports.
"""

from google import genai
from google.genai import types
from google.genai.errors import APIError
from app.core.config import settings
import logging

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
            attempts=2,  # Only try twice (initial + 1 retry) max
            initial_delay=1.0,
            max_delay=5.0,
        ),
        timeout=55000, # 55 seconds timeout for httpx
    )
    
    return genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=retry_config
    )

def call_gemini_with_fallback(
    client: genai.Client,
    primary_model: str,
    fallback_model: str,
    contents: list,
    config: types.GenerateContentConfig,
):
    """
    Calls the Gemini API with a primary model. 
    If a 503 Service Unavailable error occurs, it automatically retries with a fallback model.
    """
    try:
        return client.models.generate_content(
            model=primary_model,
            contents=contents,
            config=config,
        )
    except APIError as e:
        if e.code == 503:
            logger.warning(
                f"Model {primary_model} is currently overloaded (503). "
                f"Falling back to {fallback_model}."
            )
            return client.models.generate_content(
                model=fallback_model,
                contents=contents,
                config=config,
            )
        raise e
