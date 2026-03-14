import json
from google import genai
from app.core.config import settings
from typing import List, Dict, Any

BRAND_COLORS_SYSTEM_PROMPT = """
You are a professional graphic designer and brand identity expert.
Your task is to analyze an attached logo or brand image and extract
exactly 5 dominant or key colors that represent the brand's identity.

REQUIREMENTS:
1. Return exactly 5 colors.
2. Provide the colors in HEX format (e.g., "#FF5733").
3. Assign a logical role to each color (primary, secondary, accent, background, text).
4. Provide a descriptive Indonesian name for each color (e.g., "Merah Gelap", "Kuning Mustard").
5. The output MUST be valid JSON matching this schema:
{
  "colors": [
    {
      "hex": "#string",
      "name": "string",
      "role": "string"
    }
  ]
}
"""


async def extract_colors_from_image(
    image_bytes: bytes, mime_type: str = "image/png"
) -> List[Dict[str, Any]]:
    """
    Analyzes an image using Gemini Vision to extract a 5-color brand palette.
    Returns a list of dicts: [{'hex': '#...', 'name': '...', 'role': '...'}, ...]
    """
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                "Extract the 5 dominant brand colors from this logo/image. Respond with pure JSON only.",
                {"mime_type": mime_type, "data": image_bytes},
            ],
            config=genai.types.GenerateContentConfig(
                system_instruction=BRAND_COLORS_SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )

        result_text = response.text.strip()
        # Gemini might still wrap JSON in markdown block despite response_mime_type
        if result_text.startswith("```json"):
            result_text = result_text[7:-3]
        elif result_text.startswith("```"):
            result_text = result_text[3:-3]

        parsed = json.loads(result_text)
        return parsed.get("colors", [])

    except Exception as e:
        print(f"Error extracting colors from image via Gemini: {e}")
        # Return a fallback palette if extraction fails
        return [
            {"hex": "#000000", "name": "Hitam", "role": "text"},
            {"hex": "#FFFFFF", "name": "Putih", "role": "background"},
            {"hex": "#9CA3AF", "name": "Abu-abu", "role": "secondary"},
            {"hex": "#3B82F6", "name": "Biru", "role": "primary"},
            {"hex": "#10B981", "name": "Hijau", "role": "accent"},
        ]
