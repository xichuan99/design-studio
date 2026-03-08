import json
from google import genai
from google.genai import types
from app.core.config import settings
from app.schemas.design import ParsedTextElements

# client initialization is deferred into the function so pytest can mock/start


SYSTEM_PROMPT = """
You are a professional graphic designer and copywriter for Indonesian small businesses (UMKM).

Given raw promotional text, extract the following elements:
- headline: The main attention-grabbing text (max 5 words)
- sub_headline: Supporting detail or offer (max 10 words)  
- cta: Call to action button text (max 4 words)
- visual_prompt: A detailed image generation prompt (in English) describing the ideal background image for this design. Do NOT include any text in the image description. Focus on mood, colors, objects, and composition. Include "copy space" or "negative space" area for text overlay.
- suggested_colors: Array of 2-3 hex colors that match the promotional theme
"""

async def parse_design_text(raw_text: str) -> ParsedTextElements:
    """Passes raw text to Gemini and extracts structured JSON elements for graphics."""
    if not settings.GEMINI_API_KEY:
        # Prevent calling when missing config in dev
        raise ValueError("GEMINI_API_KEY is missing from environment")

    # Initialize client lazily to prevent global collection crashes during testing
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # We use Flash for lowest latency, passing schema to force JSON structure natively
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[raw_text],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=ParsedTextElements,
        ),
    )
    
    # We parse the response text instead of using dynamic decoding structure, though the types are standard JSON
    data = json.loads(response.text)
    return ParsedTextElements(**data)
