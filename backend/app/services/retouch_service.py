import io
import cv2
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)

async def auto_enhance(image_bytes: bytes) -> bytes:
    """
    Smart exposure and color correction using OpenCV CLAHE on the LAB color space.
    Brightens dark skin tones naturally without overexposing highlights.
    """
    try:
        # Load image via Pillow then convert to cv2 numpy array
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        np_img = np.array(img)
        # Convert RGB to BGR for OpenCV
        bgr_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)

        # Convert to LAB space for CLAHE on Lightness channel
        lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)

        # Apply CLAHE to L channel (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_chan)

        # Merge back
        limg = cv2.merge((cl, a_chan, b_chan))
        enhanced_bgr = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        # Subtle warm tint (optional, improves skin tones slightly)
        # We can blend this with original to keep it natural
        enhanced_rgb = cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB)

        out_img = Image.fromarray(enhanced_rgb)

        out_buffer = io.BytesIO()
        out_img.save(out_buffer, format="JPEG", quality=95)
        return out_buffer.getvalue()
    except Exception as e:
        logger.exception(f"Failed to auto enhance image: {str(e)}")
        raise

async def remove_blemishes(image_bytes: bytes) -> bytes:
    """
    Smooths skin blemishes using bilateral filtering and median blur
    while preserving sharp edges (eyes, hair, etc).
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        np_img = np.array(img)
        bgr_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)

        # Bilateral filter for skin smoothing while keeping edges sharp
        smoothed = cv2.bilateralFilter(bgr_img, d=9, sigmaColor=75, sigmaSpace=75)

        # Slight median blur to remove spot noise (acne/blemishes)
        cleaned = cv2.medianBlur(smoothed, 3)

        # Blend original with smoothed to retain natural texture (e.g., 40% original, 60% smoothed)
        blended = cv2.addWeighted(bgr_img, 0.4, cleaned, 0.6, 0)

        enhanced_rgb = cv2.cvtColor(blended, cv2.COLOR_BGR2RGB)
        out_img = Image.fromarray(enhanced_rgb)

        out_buffer = io.BytesIO()
        out_img.save(out_buffer, format="JPEG", quality=95)
        return out_buffer.getvalue()
    except Exception as e:
        logger.exception(f"Failed to remove blemishes: {str(e)}")
        raise
