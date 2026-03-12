import os
import sys

from dotenv import load_dotenv
load_dotenv('/app/.env')

from google import genai
from google.genai import types

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    load_dotenv('/root/design-studio/backend/.env')
    api_key = os.environ.get("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

prompt = "A joyful, stylized elementary school child singing into a retro microphone, with a gleaming gold trophy near them, surrounded by musical notes, Dreamy, ethereal sky filled with soft pastel clouds and shimmering, sparkling stars, Soft, warm, and magical glow emanating from the stars and microphone, creating a glamorous atmosphere, Modern, clean vector art illustration, minimalist yet captivating, with elegant glitter and sparkle effects, capturing a sense of wonder, Soft pastel light pinks, sky blues, lavender purples, and creamy yellows, accented with subtle golden sparkles"

try:
    print("Testing prompt. Attempting to override safety settings...")
    # NOTE: As of the current Imagen API, safety_settings are not always fully exposed or allow overriding
    # child/minor policies because they are hard rules. However, we'll test standard overrides.
    response = client.models.generate_images(
        model='imagen-4.0-fast-generate-001',
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="1:1",
            safety_settings=[
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold=types.HarmBlockThreshold.BLOCK_NONE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold=types.HarmBlockThreshold.BLOCK_NONE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold=types.HarmBlockThreshold.BLOCK_NONE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold=types.HarmBlockThreshold.BLOCK_NONE,
                ),
            ]
        ),
    )
    if response.generated_images:
        print("Success generated_images:", len(response.generated_images))
    else:
        print("Success API call but no images returned! Probably safety filter.")
except Exception as e:
    print(f"Error: {e}")
