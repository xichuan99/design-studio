import os
import logging
import httpx
import uuid
import fal_client
from google import genai
from google.genai import types

from app.core.config import settings
from app.services.bg_removal_service import remove_background
from app.services.storage_service import upload_image

logger = logging.getLogger(__name__)

# Style prompts for banners
STYLE_PROMPTS = {
    "ribbon": "A beautiful, floating decorative ribbon banner, {color_hint} color palette, elegant curves, centered, flat lighting",
    "badge": "A circular promotional badge/sticker, {color_hint} color scheme, modern vector graphic style, sharp edges, centered",
    "cloud": "A soft, fluffy cloud-shaped dialogue bubble, {color_hint} tint, cute and friendly style, centered, clean background",
    "star": "A dynamic starburst or explosion shape, {color_hint} colors, energetic sale tag style, centered, high contrast",
    "banner": "A classic rectangular scroll banner with folded ends, {color_hint} theme, elegant and clean, centered"
}

async def generate_text_banner(
    text: str,
    style: str = "ribbon",
    color_hint: str = "colorful",
    quality: str = "standard"
) -> dict:
    """
    Generates a decorative banner containing text, removes the background, 
    and uploads it to storage.
    
    Quality tiers:
    - draft:    fal-ai/flux/schnell (fast, cheap)
    - standard: fal-ai/flux/dev (good quality)
    - premium:  gemini-3.1-flash-image-preview (best text rendering)
    """
    try:
        # 1. Prepare Prompt — support both preset keys and free-text
        if style in STYLE_PROMPTS:
            base_prompt = STYLE_PROMPTS[style].replace("{color_hint}", color_hint)
        else:
            # Treat as free-text creative description
            base_prompt = f"{style}, {color_hint} color palette, centered, clean composition"
        
        # Add text instructions
        prompt = f"{base_prompt}. The graphic MUST contain the exact text: \"{text}\" written on it boldly and legibly. Clean solid white background behind the object for easy extraction."
        
        banner_url = None
        
        # 2. Generate Image based on quality
        if quality == "premium":
            # Use Gemini API (Nano Banana 2)
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not configured for premium generation")
                
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            # Use the synchronous call in a thread pool for async compatibility
            import asyncio
            loop = asyncio.get_running_loop()
            
            def run_gemini():
                return client.models.generate_images(
                    model='gemini-3.1-flash-image-preview',
                    prompt=prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        output_mime_type="image/jpeg",
                        aspect_ratio="1:1" # Standard size for banners
                    )
                )
                
            response = await loop.run_in_executor(None, run_gemini)
            
            if not response.generated_images:
                raise RuntimeError("Gemini API returned no images")
                
            # Gemini returns base64 bytes for generated_images when output_mime_type is set
            
            # The SDK returns a GenerativeImage object. We need to get its bytes.
            img = response.generated_images[0]
            
            # Upload temp image for bg removal
            temp_id = str(uuid.uuid4())[:8]
            banner_url = await upload_image(
                img.image.image_bytes,
                content_type="image/jpeg",
                prefix=f"temp_gemini_{temp_id}"
            )
            
        else:
            # Use Fal.ai (Flux)
            if not settings.FAL_KEY:
                raise ValueError("FAL_KEY is missing from environment")
                
            os.environ["FAL_KEY"] = settings.FAL_KEY
            
            model_id = "fal-ai/flux/schnell" if quality == "draft" else "fal-ai/flux/dev"
            
            result = await fal_client.run_async(
                model_id,
                arguments={
                    "prompt": prompt,
                    "image_size": "square_hd" if quality == "standard" else "square"
                },
            )
            
            images = result.get("images", [])
            if not images or not images[0].get("url"):
                raise RuntimeError("Fal.ai returned no image URL")
                
            banner_url = images[0]["url"]
            
        # 3. Remove Background
        # We need to download the generated image first to pass bytes to remove_background
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(banner_url, timeout=30.0)
            resp.raise_for_status()
            image_bytes = resp.content
            
        # bg_removal_service takes bytes and returns bytes
        transparent_bytes = await remove_background(image_bytes)
        
        # 4. Upload Final Image
        final_id = str(uuid.uuid4())[:12]
        final_url = await upload_image(
            transparent_bytes,
            content_type="image/png",
            prefix=f"banners/{final_id}"
        )
        
        return {
            "url": final_url,
            "width": 1024, # Approximate standard size
            "height": 1024
        }
        
    except Exception as e:
        logger.exception(f"Failed to generate text banner: {str(e)}")
        raise
