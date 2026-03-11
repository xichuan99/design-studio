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
- visual_prompt_parts: An array of prompt components, each with:
    - category: one of "subject", "setting", "lighting", "style", "colors"
    - label: Indonesian display label (e.g., "Objek Utama", "Latar", "Pencahayaan", "Gaya Visual", "Palet Warna")
    - value: The English prompt fragment for this aspect
    - enabled: always true
- visual_prompt: The full combined prompt (join all parts with ", "). Include WHERE the copy space / negative space should be. Example: "...with large empty space on the left side for text overlay". The copy space placement MUST match your layout decisions below.
- indonesian_translation: A natural, friendly Indonesian sentence explaining what the `visual_prompt` describes. (e.g., "Gambar fotorealistik secangkir kopi susu di atas meja kayu dengan pencahayaan hangat dari jendela dan area kosong di kiri untuk teks.")
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
    group related elements close together for readability.
"""

BRIEF_QUESTIONS_SYSTEM = """
You are an expert design director. The user wants to create a visual design for their business but only provided a short, vague description.
Your task is to ask 3 to 4 hyper-specific clarifying questions to figure out EXACTLY what to generate.

Questions should focus on things that affect the visual output:
- Mood / Vibe (e.g., minimalist, energetic, premium, cozy)
- Color palette
- Specific objects to feature (if they just said "promo kopi", ask what kind of coffee, what background)
- The target platform (Instagram feed, poster, story) if not obvious

Format each question to allow quick multiple-choice answers, but also allow text.
Keep questions friendly and in Indonesian.

Example options for Mood: "Minimalis & Bersih", "Hangat & Cozy", "Elegan & Mewah", "Ceria & Colorful".
Example options for Color: "Warna Bumi (Mocca/Cokelat)", "Warna Cerah (Kuning/Merah)", "Monokrom", "Bebas, AI pilihkan".
"""

async def generate_design_brief_questions(raw_text: str) -> dict:
    """Generates clarifying questions based on the user's initial raw text."""
    from app.schemas.design import BriefQuestionsResponse

    if not settings.GEMINI_API_KEY:
        import logging
        logging.warning("GEMINI_API_KEY is missing – returning mock brief questions")
        return {
            "questions": [
                {
                    "id": "mood",
                    "question": "Seperti apa nuansa/mood yang Anda inginkan untuk desain ini?",
                    "type": "choice",
                    "options": ["Elegan & Premium", "Ceria & Fun", "Minimalis & Bersih", "Hangat & Cozy"],
                    "default": "Minimalis & Bersih"
                },
                {
                    "id": "color_palette",
                    "question": "Ada preferensi warna utama?",
                    "type": "choice",
                    "options": ["Warna bumi (Coklat/Krem)", "Warna pastel lembut", "Warna mencolok/Terang", "Bebas, pilihin AI"],
                    "default": "Bebas, pilihin AI"
                },
                {
                    "id": "specific_elements",
                    "question": "Apakah ada objek spesifik yang harus muncul di gambar? (misal: 'cangkir kopi di meja kayu')",
                    "type": "text",
                    "options": [],
                    "default": "Sesuai konteks saja"
                }
            ]
        }

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[f"Buatkan pertanyaan klarifikasi desain untuk deskripsi ini:\n{raw_text}"],
        config=types.GenerateContentConfig(
            system_instruction=BRIEF_QUESTIONS_SYSTEM,
            response_mime_type="application/json",
            response_schema=BriefQuestionsResponse,
            temperature=0.7,
        ),
    )
    return json.loads(response.text)

async def parse_design_text(raw_text: str, integrated_text: bool = False, clarification_answers: dict = None) -> ParsedTextElements:
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

    clarification_modifier = ""
    if clarification_answers:
        clarification_modifier = f"""
        USER'S CLARIFICATION ANSWERS:
        The user has provided the following specific details for the design. YOU MUST incorporate these into your visual_prompt and visual_prompt_parts.
        {json.dumps(clarification_answers, indent=2)}
        """

    final_prompt = SYSTEM_PROMPT + prompt_modifier + clarification_modifier

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
            indonesian_translation=f"Fotografi produk profesional bertema '{raw_text[:40]}' dengan warna cerah, komposisi bersih, dan ruang kosong di sisi kanan untuk teks.",
            visual_prompt_parts=[
                {"category": "style", "label": "Gaya Visual", "value": "Professional product photography", "enabled": True},
                {"category": "subject", "label": "Objek Utama", "value": raw_text[:60], "enabled": True},
                {"category": "colors", "label": "Palet Warna", "value": "vibrant colors", "enabled": True},
                {"category": "setting", "label": "Latar", "value": "clean composition with copy space on the right side", "enabled": True},
                {"category": "extra", "label": "Estetika", "value": "modern aesthetic", "enabled": True}
            ],
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

MODIFY_PROMPT_SYSTEM = """
You are an expert AI prompt engineer and bilingual assistant (Indonesian & English).
The user is adjusting an existing AI image generation prompt. They will give you:
1. The ORIGINAL English prompt parts.
2. An INSTRUCTION in Indonesian describing what they want to change.

YOUR TASK:
Update the English prompt parts to reflect the user's Indonesian instruction.
If they want to change the style, update the "style" part. If they want a different mood/lighting, update the "lighting" part. Add or remove details organically.
Return ALL prompt parts in full — both the ones you modified AND the ones left unchanged — so the complete original structure is preserved. Also return the final combined prompt.

Output JSON must match:
{
  "modified_prompt_parts": [
     { "category": "...", "label": "...", "value": "..._UPDATED_OR_ORIGINAL_ENGLISH_VALUE_...", "enabled": true }
  ],
  "modified_visual_prompt": "The new combined full English prompt...",
  "indonesian_translation": "A natural, friendly Indonesian sentence explaining what the new `modified_visual_prompt` describes."
}
"""

async def modify_visual_prompt(original_parts: list, instruction: str) -> dict:
    """Modifies existing English prompt parts based on an Indonesian user instruction."""
    from app.schemas.design import ModifyPromptResponse

    if not settings.GEMINI_API_KEY:
        import logging
        logging.warning("GEMINI_API_KEY is missing – returning mock modified data")
        # simple mock
        new_parts = []
        for p in original_parts:
            # We copy because dicts are mutable
            copied = dict(p) if isinstance(p, dict) else p.model_dump()
            if copied["category"] == "style" or copied["category"] == "extra":
                copied["value"] += f" ({instruction} applied)"
            new_parts.append(copied)

        combined = ", ".join(p["value"] for p in new_parts if p.get("enabled", True))
        return ModifyPromptResponse(
            modified_prompt_parts=new_parts,
            modified_visual_prompt=combined,
            indonesian_translation=f"Terjemahan mock untuk: {combined}"
        ).model_dump()

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Send the original parts as a JSON dumped string for Gemini to read easily
    # Ensure parts are dicts
    parts_dicts = [p.model_dump() if hasattr(p, 'model_dump') else dict(p) for p in original_parts]

    input_text = f"ORIGINAL PROMPT PARTS:\n{json.dumps(parts_dicts, indent=2)}\n\nUSER INSTRUCTION (ID):\n{instruction}"

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[input_text],
        config=types.GenerateContentConfig(
            system_instruction=MODIFY_PROMPT_SYSTEM,
            response_mime_type="application/json",
            response_schema=ModifyPromptResponse,
        ),
    )

    data = json.loads(response.text)
    return data
