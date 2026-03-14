import json
from typing import Optional
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

COPYWRITING_BRIEF_SYSTEM = """
Kamu adalah copywriter profesional. User ingin membuat teks promosi
tapi hanya memberikan deskripsi singkat.

Buatkan 3-4 pertanyaan klarifikasi SPESIFIK untuk menghasilkan copy
yang lebih tepat sasaran. Pertanyaan harus mencakup:

1. Target pelanggan (siapa yang mau dijangkau?)
2. Promo/penawaran khusus (diskon, gratis ongkir, limited edition?)
3. Keunggulan utama produk (apa yang membedakan dari kompetitor?)
4. Tone/gaya bahasa yang diinginkan

Format setiap pertanyaan sebagai objek JSON dengan `type` "choice" atau "text".
Bahasa Indonesia, friendly.
"""

COPYWRITING_SYSTEM_PROMPT = """
Kamu adalah copywriter profesional Indonesia.
Diberikan deskripsi produk dan info tambahan, buatkan persis 3 variasi teks promosi pendek.

Variasi 1 — FOMO (Fear of Missing Out / Urgensi):
  Hook urgensi, batas waktu, kelangkaan stok.

Variasi 2 — Benefit (Manfaat Utama):
  Highlight manfaat nyata yang dirasakan pembeli.

Variasi 3 — Social Proof (Bukti Sosial):
  Kesan terpercaya, banyak dipakai, kualitas terjamin.

RULES:
- headline max 6 kata, UPPERCASE
- subline max 15 kata
- cta max 4 kata
- Bahasa Indonesia
- Output HARUS JSON valid format:
  {{
    "variations": [
      {{
        "style": "FOMO",
        "headline": "...",
        "subline": "...",
        "cta": "...",
        "full_text": "[headline]\\n[subline]\\n[cta]"
      }},
      ...
    ]
  }}

{tone_instruction}
{brand_instruction}
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

async def generate_copywriting_questions(raw_text: str) -> dict:
    """Generates clarifying questions specifically for copywriting using Gemini."""
    from app.schemas.design import BriefQuestionsResponse
    if not settings.GEMINI_API_KEY:
        import logging
        logging.warning("GEMINI_API_KEY is missing – returning mock copywriting questions")
        return {
            "questions": [
                {
                    "id": "target_audience",
                    "question": "Siapakah target pelanggan utama Anda?",
                    "type": "choice",
                    "options": ["Anak Muda / Gen Z", "Ibu Rumah Tangga", "Profesional / Pekerja", "Umum"],
                    "default": "Umum"
                },
                {
                    "id": "promo_detail",
                    "question": "Apakah ada promo atau diskon khusus yang ingin ditonjolkan?",
                    "type": "text",
                    "options": [],
                    "default": ""
                },
                {
                    "id": "key_benefit",
                    "question": "Apa keunggulan utama dari produk Anda dibandingkan yang lain?",
                    "type": "choice",
                    "options": ["Harga Terjangkau", "Kualitas Premium", "Cepat / Instan", "Estetik / Kekinian"],
                    "default": "Kualitas Premium"
                }
            ]
        }

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[f"Buatkan pertanyaan klarifikasi copywriting untuk deskripsi ini:\n{raw_text}"],
        config=types.GenerateContentConfig(
            system_instruction=COPYWRITING_BRIEF_SYSTEM,
            response_mime_type="application/json",
            response_schema=BriefQuestionsResponse.model_json_schema(),
            temperature=0.7,
        ),
    )

    try:
        parsed = BriefQuestionsResponse.model_validate_json(response.text)
        return parsed.model_dump()
    except Exception as e:
        import logging
        logging.exception("Error extracting copywriting questions via LLM")
        raise e

UNIFIED_BRIEF_SYSTEM = """
Kamu adalah AI Creative Director. Tugasmu adalah menanyakan 3-4 pertanyaan klarifikasi SPESIFIK
berdasarkan deskripsi singkat user untuk menghasilkan teks promosi (copywriting) DAN arahan visual (desain) sekaligus.

Pertanyaan harus mencakup aspek-aspek berikut secara natural:
1. Target pelanggan & Tone bahasa (kombinasi)
2. Nuansa visual / Mood desain (elegan, ceria, dll)
3. Detail promo / Keunggulan utama produk
4. Objek spesifik di gambar (opsional, jika perlu dipertegas)

Format setiap pertanyaan sebagai objek JSON dengan `type` "choice" atau "text".
Gunakan Bahasa Indonesia yang friendly dan profesional.
Pastikan opsi "choice" relevan dengan konteks deskripsi user.
"""

async def generate_unified_brief_questions(raw_text: str) -> dict:
    """Generates combined clarifying questions for both design and copywriting."""
    from app.schemas.design import BriefQuestionsResponse
    if not settings.GEMINI_API_KEY:
        import logging
        logging.warning("GEMINI_API_KEY is missing – returning mock unified questions")
        return {
            "questions": [
                {
                    "id": "audience_tone",
                    "question": "Siapakah target audiens Anda & gaya bahasa apa yang cocok?",
                    "type": "choice",
                    "options": ["Anak Muda (Kasual & Santai)", "Profesional (Formal & Elegan)", "Ibu Rumah Tangga (Ramah & Hangat)", "Umum (Persuasif)"],
                    "default": "Umum (Persuasif)"
                },
                {
                    "id": "design_mood",
                    "question": "Nuansa visual seperti apa yang Anda bayangkan untuk desainnya?",
                    "type": "choice",
                    "options": ["Elegan & Mewah", "Ceria & Colorful", "Minimalis & Modern", "Estetik & Kalem"],
                    "default": "Minimalis & Modern"
                },
                {
                    "id": "promo_benefit",
                    "question": "Apa keunggulan utama atau promo khusus yang ingin ditonjolkan?",
                    "type": "text",
                    "options": [],
                    "default": ""
                },
                {
                    "id": "specific_objects",
                    "question": "Apakah ada objek tertentu yang wajib ada di gambar? (misal: 'gelas es kopi di meja')",
                    "type": "text",
                    "options": [],
                    "default": ""
                }
            ]
        }

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[f"Buatkan pertanyaan klarifikasi desain & copywriting untuk deskripsi ini:\n{raw_text}"],
        config=types.GenerateContentConfig(
            system_instruction=UNIFIED_BRIEF_SYSTEM,
            response_mime_type="application/json",
            response_schema=BriefQuestionsResponse.model_json_schema(),
            temperature=0.7,
        ),
    )

    try:
        parsed = BriefQuestionsResponse.model_validate_json(response.text)
        return parsed.model_dump()
    except Exception as e:
        import logging
        logging.exception("Error extracting unified questions via LLM")
        raise e


async def generate_ai_copywriting(
    product_description: str,
    tone: str = "persuasive",
    brand_name: Optional[str] = None,
    clarification_answers: Optional[dict] = None
) -> dict:
    """Generates 3 variations of copywriting using Gemini."""
    from app.schemas.design import CopywritingResponse

    tone_map = {
        "casual": "TONE: Gunakan bahasa yang santai, gaul, akrab, bisa pakai emoticon jika relevan.",
        "professional": "TONE: Gunakan bahasa yang formal, profesional, terpercaya, dan elegan.",
        "persuasive": "TONE: Gunakan teknik copywriting persuasif, menonjolkan urgensi, dan sangat meyakinkan pembaca untuk langsung bertindak.",
        "funny": "TONE: Gunakan gaya bahasa yang lucu, nyeleneh, out-of-the-box, menarik perhatian."
    }
    tone_instruction = tone_map.get(tone, tone_map["persuasive"])

    brand_instruction = f"BRAND: Tolong sisipkan nama brand '{brand_name}' secara natural di salah satu bagian (Headline, Subline, atau CTA)." if brand_name else "BRAND: Tidak ada nama brand khusus yang disertakan."

    system_prompt_formatted = COPYWRITING_SYSTEM_PROMPT.format(
        tone_instruction=tone_instruction,
        brand_instruction=brand_instruction
    )

    prompt_payload = f"Deskripsi Produk:\n{product_description}\n\n"
    if clarification_answers:
        prompt_payload += "Info Tambahan (Jawaban Klarifikasi):\n"
        for key, value in clarification_answers.items():
            prompt_payload += f"- {key}: {value}\n"

    if not settings.GEMINI_API_KEY:
        import logging
        logging.warning("GEMINI_API_KEY is missing – returning mock copywriting")
        headline = "PROMO DISKON HARI INI"
        subline = f"Dapatkan {product_description[:20]} dengan harga spesial."
        cta = "BELI SEKARANG"
        return {
            "variations": [
                {
                    "style": "FOMO",
                    "headline": headline,
                    "subline": subline,
                    "cta": cta,
                    "full_text": f"{headline}\n{subline}\n{cta}"
                },
                {
                    "style": "Benefit",
                    "headline": "KUALITAS TERJAMIN UNTUK ANDA",
                    "subline": "Rasakan manfaat perlindungan optimal tiap hari.",
                    "cta": "COBA SEKARANG",
                    "full_text": "KUALITAS TERJAMIN UNTUK ANDA\nRasakan manfaat perlindungan optimal tiap hari.\nCOBA SEKARANG"
                },
                {
                    "style": "Social Proof",
                    "headline": "RIBUAN ORANG SUDAH BUKTIKAN",
                    "subline": "Pilihan nomor 1 pelanggan di Indonesia.",
                    "cta": "ORDER SEKARANG",
                    "full_text": "RIBUAN ORANG SUDAH BUKTIKAN\nPilihan nomor 1 pelanggan di Indonesia.\nORDER SEKARANG"
                }
            ]
        }

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[prompt_payload],
        config=types.GenerateContentConfig(
            system_instruction=system_prompt_formatted,
            response_mime_type="application/json",
            response_schema=CopywritingResponse.model_json_schema(),
            temperature=0.8,
        ),
    )

    try:
        parsed = CopywritingResponse.model_validate_json(response.text)
        return parsed.model_dump()
    except Exception as e:
        import logging
        logging.exception("Error extracting copywriting via LLM")
        raise e

async def parse_design_text(
    raw_text: str,
    integrated_text: bool = False,
    clarification_answers: Optional[dict] = None,
    brand_colors: Optional[list[str]] = None
) -> ParsedTextElements:
    """Parses raw text into structured design elements and a visual prompt."""

    prompt_modifier = ""
    if integrated_text:
        prompt_modifier = """
        IMPORTANT INTEGRATED TEXT OVERRIDE:
        The user wants the text completely integrated into the image generation itself.
        Instead of asking for 'copy space', your `visual_prompt` MUST explicitly tell the image generator to render the headline text natively in the scene.
        - headline can be up to 8 words for reliable AI text rendering
        - sub_headline and CTA text SHOULD also be rendered in the image with proper visual hierarchy
        - Headline should be the largest, most prominent text. Sub-headline smaller. CTA as a button-like or badge-like element.
        - Use scene context for natural text (neon sign, chalkboard, banner, poster on wall)
        Example visual_prompt: "A hyper-realistic 3D render of a neon sign that spells 'MEGA SALE', vibrant cyberpunk street background, bold typography."
        """

    clarification_modifier = ""
    if clarification_answers:
        clarification_modifier = f"""
        USER'S CLARIFICATION ANSWERS:
        The user has provided the following specific details for the design. YOU MUST incorporate these into your visual_prompt and visual_prompt_parts.
        {json.dumps(clarification_answers, indent=2)}
        """

    brand_colors_modifier = ""
    if brand_colors:
        brand_colors_modifier = f"""
        BRAND COLORS:
        The user has an active Brand Kit. You MUST use these exact colors for the suggested_colors and coordinate the layout elements to use these colors:
        {json.dumps(brand_colors)}
        In the visual_prompt_parts 'colors' category, explicitly mention these hex codes or their nearest color name equivalents.
        """

    final_prompt = SYSTEM_PROMPT + prompt_modifier + clarification_modifier + brand_colors_modifier

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
1. The ORIGINAL full combined English prompt.
2. The ORIGINAL English prompt parts.
3. An INSTRUCTION in Indonesian describing what they want to change.

YOUR TASK:
Update the English prompt parts to reflect the user's Indonesian instruction.
If they want to change the style, update the "style" part. If they want a different mood/lighting, update the "lighting" part. Add or remove details organically.

CRITICAL RULES FOR PRESERVING DETAIL:
- Each part's `value` MUST contain AT LEAST as much descriptive detail as the original.
- Do NOT summarize, abbreviate, or remove details unless the user explicitly asks.
- You MUST preserve ALL layout instructions (like "copy space on the right side", "empty area for text overlay") from the original prompt. If you modify the setting, ensure the copy space instruction remains.
- Return ALL prompt parts in full — both the ones you modified AND the ones left unchanged.

Output JSON must match:
{
  "modified_prompt_parts": [
     { "category": "...", "label": "...", "value": "..._UPDATED_OR_ORIGINAL_ENGLISH_VALUE_...", "enabled": true }
  ],
  "modified_visual_prompt": "The new combined full English prompt. Make sure it explicitly includes ALL details and copy space instructions from the parts.",
  "indonesian_translation": "A natural, friendly Indonesian sentence explaining what the new `modified_visual_prompt` describes."
}
"""

async def modify_visual_prompt(original_parts: list, original_visual_prompt: str, instruction: str) -> dict:
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

    input_text = f"ORIGINAL FULL PROMPT:\n{original_visual_prompt}\n\nORIGINAL PROMPT PARTS:\n{json.dumps(parts_dicts, indent=2)}\n\nUSER INSTRUCTION (ID):\n{instruction}"

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

    # SAFETY NET: Reconstruct the combined prompt from the parts to guarantee No Shortening
    assembled_prompt = ", ".join(p["value"] for p in data["modified_prompt_parts"] if p.get("enabled", True))

    # If Gemini returned a very short combined prompt, override it with our assembled one
    if len(assembled_prompt) > len(data.get("modified_visual_prompt", "")):
        data["modified_visual_prompt"] = assembled_prompt

    return data

MAGIC_TEXT_SYSTEM = """
You are an expert graphic designer and world-class typographer.
The user wants to overlay promotional text onto the provided image.
Your goal is to make the text look seamlessly integrated and highly professional, NOT just "tacked on".

CRITICAL HEURISTICS:
1. NEGATIVE SPACE: Find the largest area of negative space (empty/quiet areas) that won't cover main subjects (people's faces, key products). Use the Rule of Thirds for placement.
2. HIERARCHY: Break the raw text into logical layers (Headline, Sub-headline, Body, CTA).
3. TYPOGRAPHY PAIRING:
   - For bold/modern: "Inter" or "Oswald" headline + "Inter" body.
   - For elegant/premium: "Playfair Display" headline + "Inter" or "Montserrat" body.
   - For fun/casual: "Poppins" everywhere.
4. SPACING & LEADING:
   - Headlines: tighter line_height (1.0 - 1.1), uppercase or capitalize.
   - Sub-headlines/Body: looser letter_spacing (0.1 - 0.2 em) and looser line_height (1.4 - 1.5).
5. CONTRAST & SHADOW:
   - Text MUST be highly legible. If the background is complex or light, add a `text_shadow` (e.g., "2px 2px 12px rgba(0,0,0,0.8)").
   - If the background is very clean and dark, use pure white text with no shadow.
6. OPACITY: Use slight transparency (opacity: 0.8 to 0.9) for secondary text so it blends into the image context.
7. INDONESIAN TEXT HANDLING:
   - The text will likely be in Bahasa Indonesia (promotional/marketing text).
   - Identify the text hierarchy correctly: "DISKON 50%" → Headline, "Khusus hari ini" → Sub-headline, "Pesan Sekarang" → CTA.
   - Indonesian keywords for hierarchy: "Diskon", "Promo", "Gratis", "Sale" → always Headline.
   - Supporting details (dates, conditions, descriptions) → Sub-headline or Body.
   - Action words ("Pesan", "Hubungi", "Kunjungi", "Beli") → CTA.
8. ELEMENT COUNT:
   - For text under 20 words: produce 2-3 elements (headline + sub-headline + optional CTA).
   - For text over 20 words: produce 3-5 elements with clear visual hierarchy.
   - NEVER put all text in a single element.
9. BACKGROUND BOX:
   - When the background behind the text placement is complex/noisy, set `background_color` to a semi-transparent color (e.g. "rgba(0,0,0,0.5)") with `background_padding: 16` and `background_radius: 8`.
   - For clean/simple backgrounds: do NOT add a background box.

Coordinates must be proportional floats between 0.0 and 1.0 (x: 0.0 is left, y: 0.0 is top).
Return the result STRICTLY as a JSON object matching the requested schema.
"""

async def generate_magic_text_layout(
    text: str,
    image_base64: str,
    style_hint: Optional[str] = None,
    canvas_width: int = 1024,
    canvas_height: int = 1024,
    brand_colors: Optional[list[str]] = None
) -> dict:
    """Generates a layout for text overlaid on a specific image."""
    from app.schemas.design import MagicTextResponse
    import base64

    if not settings.GEMINI_API_KEY:
        import logging
        logging.warning("GEMINI_API_KEY is missing – returning mock magic text")
        return MagicTextResponse(
            elements=[
                {
                    "text": text.split()[0] if text else "PROMO",
                    "font_family": "Montserrat",
                    "font_size": 72,
                    "font_weight": 700,
                    "color": "#FFFFFF",
                    "align": "center",
                    "x": 0.5,
                    "y": 0.3,
                    "letter_spacing": 0.0,
                    "line_height": 1.1,
                    "text_transform": "uppercase",
                    "text_shadow": "2px 2px 8px rgba(0,0,0,0.6)",
                    "opacity": 1.0,
                    "rotation": 0.0
                }
            ]
        ).model_dump()

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Pre-process base64 if it has data URI prefix
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]

    image_bytes = base64.b64decode(image_base64)

    # Inject style hint and canvas size context
    aspect_context = f"\nCanvas dimensions: {canvas_width}x{canvas_height}px. Place text within the safe area proportionally.\nFor portrait (height > width): prefer horizontal text bands, stack vertically.\nFor landscape (width > height): spread text horizontally, use left or right thirds."
    style_context = f"\nUSER STYLE PREFERENCE: [{style_hint}]\nAdapt your font choices, colors, and layout to strongly match this style vibe." if style_hint else ""

    brand_colors_instruction = ""
    if brand_colors:
        brand_colors_instruction = f"""
        10. BRAND COLORS:
           - The user has established specific brand colors: {json.dumps(brand_colors)}.
           - You MUST strongly prefer using these exact colors (or variations of them) for text `color`, `background_color`, or `shadowColor` if they contrast well against the image background.
        """

    context_string = aspect_context + style_context + brand_colors_instruction

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type='image/png'),
            f"Here is the text I want to place on this image: {text}{context_string}"
        ],
        config=types.GenerateContentConfig(
            system_instruction=MAGIC_TEXT_SYSTEM,
            response_mime_type="application/json",
            response_schema=MagicTextResponse,
        ),
    )

    return json.loads(response.text)

async def generate_project_title(prompt: str) -> str:
    """Generates a short, catchy project title based on the user's prompt."""
    if not settings.GEMINI_API_KEY:
        import logging
        logging.warning("GEMINI_API_KEY is missing – returning mock title")
        words = prompt.split()
        return " ".join(words[:4]).title() if words else "Desain AI Baru"

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    system_instruction = (
        "You are an assistant that creates short, descriptive, and catchy project titles "
        "(2 to 5 words max) based on a description. Respond ONLY with the title. "
        "Ensure the language matches the prompt's language (mostly Indonesian)."
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[f"Create a short title for this design prompt: {prompt}"],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                max_output_tokens=20,
            ),
        )
        title = response.text.strip().replace('"', '')
        return title if title else "Desain AI Baru"
    except Exception as e:
        import logging
        logging.exception(f"Failed to generate project title: {e}")
        # Fallback to truncated prompt
        words = prompt.split()
        return " ".join(words[:5]).title() + ("..." if len(words) > 5 else "") if words else "Desain AI Baru"
