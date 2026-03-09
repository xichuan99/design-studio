import json
from google import genai
from google.genai import types
from app.core.config import settings
from app.schemas.design import ParsedTextElements

# client initialization is deferred into the function so pytest can mock/start


SYSTEM_PROMPT = """
You are a professional graphic designer and copywriter for Indonesian small businesses (UMKM).

Given raw promotional text, extract AND design a layout:

TEXT ELEMENTS:
- headline: Main attention-grabbing text (max 5 words, UPPERCASE recommended for bold styles)
- sub_headline: Supporting detail or offer (max 10 words)
- cta: Call to action button text (max 4 words)

VISUAL DESIGN:
- visual_prompt: A detailed image generation prompt (in English) for the background.
  Include WHERE the copy space / negative space should be. Example: "...with large empty space on the left side for text overlay". The copy space placement MUST match your layout decisions below.
- suggested_colors: 2-3 hex colors that complement each other and the design theme.

LAYOUT (proportional coordinates 0.0-1.0 on a 1024x1024 canvas):
- headline_layout: { x, y, font_family, font_size, font_weight, color, align }
- sub_headline_layout: same structure
- cta_layout: same structure

LAYOUT RULES:
1. Place text WHERE the copy space is in the visual_prompt.
2. Use high contrast colors against the expected background.
3. Available fonts: Inter, Poppins, Roboto, Playfair Display, Montserrat, Oswald.
4. Headline: 60-96px. Sub-headline: 32-48px. CTA: 24-36px.
5. Keep text within safe margins (x: 0.1-0.9, y: 0.1-0.9).
6. Group related elements close together for readability.
"""

async def parse_design_text(raw_text: str, integrated_text: bool = False) -> ParsedTextElements:
    """Passes raw text to Gemini and extracts structured JSON elements for graphics."""

    # Append instructions for integrated text if requested
    prompt_modifier = ""
    if integrated_text:
        prompt_modifier = """
        IMPORTANT INTEGRATED TEXT OVERRIDE:
        The user wants the text completely integrated into the image generation itself.
        Instead of asking for 'copy space', your `visual_prompt` MUST explicitly tell the image generator to render the headline and subheadline text natively in the scene.
        Example visual_prompt: "A hyper-realistic 3D render of a neon sign that spells 'MEGA SALE', vibrant cyberpunk street background, bold typography."
        """

    final_prompt = SYSTEM_PROMPT + prompt_modifier

    if not settings.GEMINI_API_KEY:
        # Dev-mode mock: return sample parsed elements so the app is usable without an API key
        import logging
        logging.warning("GEMINI_API_KEY is missing – returning mock parsed data for development")
        words = raw_text.split()
        headline = " ".join(words[:5]) if len(words) >= 5 else raw_text[:40]
        return ParsedTextElements(
            headline=headline.upper(),
            sub_headline=" ".join(words[5:15]) if len(words) > 5 else "Penawaran spesial untuk Anda",
            cta="Pesan Sekarang",
            visual_prompt=f"Professional product photography, {raw_text[:60]}, vibrant colors, clean composition with copy space on the right side, modern aesthetic",
            suggested_colors=["#6C2BEE", "#F59E0B", "#10B981"],
            headline_layout={"x": 0.7, "y": 0.3, "font_family": "Montserrat", "font_size": 72, "font_weight": 700, "color": "#FFFFFF", "align": "center"},
            sub_headline_layout={"x": 0.7, "y": 0.5, "font_family": "Inter", "font_size": 36, "font_weight": 400, "color": "#FFFFFF", "align": "center"},
            cta_layout={"x": 0.7, "y": 0.7, "font_family": "Inter", "font_size": 28, "font_weight": 700, "color": "#F59E0B", "align": "center"},
        )

    # Initialize client lazily to prevent global collection crashes during testing
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # We use Flash for lowest latency, passing schema to force JSON structure natively
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[raw_text],
        config=types.GenerateContentConfig(
            system_instruction=final_prompt,
            response_mime_type="application/json",
            response_schema=ParsedTextElements,
        ),
    )

    # We parse the response text instead of using dynamic decoding structure, though the types are standard JSON
    data = json.loads(response.text)
    return ParsedTextElements(**data)
