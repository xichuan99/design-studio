"""Service for image retouching using AI (CodeFormer via fal.ai).

Falls back to OpenCV-based processing if FAL_KEY is not configured.
"""

import io
import os
import logging
from typing import Optional

from PIL import Image

from app.core.ai_models import (
    FAL_RETOUCH,
    FAL_RETOUCH_RELIGHT_FALLBACK,
    FAL_RETOUCH_RELIGHT_PRIMARY,
)

logger = logging.getLogger(__name__)

_RELIGHT_MODES = {"off", "auto", "advanced"}
_LIGHT_DIRECTIONS = {
    "front",
    "left",
    "right",
    "top",
    "bottom",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
}
_LIGHT_TYPES = {
    "soft overcast daylight lighting",
    "studio softbox",
    "warm sunset",
    "cool daylight",
    "dramatic contrast",
}


def _normalize_relight_mode(relight_mode: Optional[str]) -> str:
    mode = (relight_mode or "off").strip().lower()
    return mode if mode in _RELIGHT_MODES else "off"


def _normalize_light_direction(light_direction: Optional[str]) -> str:
    direction = (light_direction or "front").strip().lower()
    return direction if direction in _LIGHT_DIRECTIONS else "front"


def _normalize_light_type(light_type: Optional[str]) -> str:
    normalized = (light_type or "soft overcast daylight lighting").strip().lower()
    return normalized if normalized in _LIGHT_TYPES else "soft overcast daylight lighting"


def _extract_image_url_from_result(result: object) -> Optional[str]:
    if not isinstance(result, dict):
        return None

    output_image = result.get("image") or result.get("output_image")
    if isinstance(output_image, dict):
        url = output_image.get("url")
        if isinstance(url, str) and url:
            return url
    if isinstance(output_image, str) and output_image:
        return output_image

    images = result.get("images")
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, dict):
            url = first.get("url")
            if isinstance(url, str) and url:
                return url
        if isinstance(first, str) and first:
            return first

    return None


def _blend_retouch_with_original(
    original_bytes: bytes,
    retouched_bytes: bytes,
    fidelity: float,
    output_format: str,
) -> bytes:
    """Blend a fraction of original details back to reduce facial artifact risk."""
    try:
        # High fidelity should preserve more original details.
        original_weight = max(0.0, min(1.0, float(fidelity))) * 0.35
        if original_weight <= 0:
            return retouched_bytes

        original_img = Image.open(io.BytesIO(original_bytes)).convert("RGB")
        retouched_img = Image.open(io.BytesIO(retouched_bytes)).convert("RGB")
        if original_img.size != retouched_img.size:
            original_img = original_img.resize(
                retouched_img.size, Image.Resampling.LANCZOS
            )

        blended = Image.blend(retouched_img, original_img, alpha=original_weight)

        out = io.BytesIO()
        if output_format.lower() == "png":
            blended.save(out, format="PNG")
        else:
            blended.save(out, format="JPEG", quality=95)
        return out.getvalue()
    except Exception:
        return retouched_bytes


async def retouch_with_codeformer(
    image_bytes: bytes,
    fidelity: float = 0.7,
    output_format: str = "jpeg",
) -> bytes:
    """
    Restores and enhances a face photo using CodeFormer (fal-ai/codeformer).

    CodeFormer uses a transformer architecture with a controllable fidelity parameter:
    - Low fidelity (0.0–0.3): Max enhancement, more aggressive correction
    - Mid fidelity (0.5): Balanced enhancement vs identity preservation
    - High fidelity (0.7–1.0): Preserves facial identity, natural look

    Args:
        image_bytes: Raw bytes of the input image.
        fidelity: Quality/identity tradeoff weight (0.0 to 1.0). Defaults to 0.7.
        output_format: Output format, "jpeg" or "png". Defaults to "jpeg".

    Returns:
        Raw bytes of the retouched image.

    Raises:
        ValueError: If FAL_KEY is missing.
        RuntimeError: If the model returns an invalid result.
    """
    import fal_client
    import httpx

    from app.core.config import settings
    from app.services.storage_service import upload_image

    if not settings.FAL_KEY:
        raise ValueError("FAL_KEY is missing. Cannot call CodeFormer.")

    os.environ["FAL_KEY"] = settings.FAL_KEY

    # Upload original image to get a public URL for the fal.ai API
    mime_type = "image/png" if output_format.lower() == "png" else "image/jpeg"
    temp_url = await upload_image(
        image_bytes, content_type=mime_type, prefix="retouch_input"
    )

    # Call CodeFormer on fal.ai
    result = await fal_client.run_async(
        FAL_RETOUCH,
        arguments={
            "image_url": temp_url,
            "fidelity": float(fidelity),
            "upscale_factor": 1,  # Keep original resolution, no upscaling
            "only_center_face": False,  # Restore all faces in the photo
        },
    )

    output_image = result.get("image") or result.get("output_image")
    if not output_image:
        raise RuntimeError(f"CodeFormer returned an unexpected result: {result}")

    result_url: Optional[str] = None
    if isinstance(output_image, dict):
        result_url = output_image.get("url")
    elif isinstance(output_image, str):
        result_url = output_image

    if not result_url:
        raise RuntimeError(
            f"Could not extract output URL from CodeFormer result: {result}"
        )

    # Download the result
    async with httpx.AsyncClient() as client:
        resp = await client.get(result_url, timeout=60.0)
        resp.raise_for_status()
        result_bytes = resp.content

    # Convert to requested format if needed
    if output_format.lower() == "jpeg":
        img = Image.open(io.BytesIO(result_bytes)).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=95)
        result_bytes = buf.getvalue()

    # Blend with original to reduce aggressive artifacting around eyes/skin.
    result_bytes = _blend_retouch_with_original(
        original_bytes=image_bytes,
        retouched_bytes=result_bytes,
        fidelity=fidelity,
        output_format=output_format,
    )

    return result_bytes


async def retouch_opencv_fallback(
    image_bytes: bytes,
    fidelity: float = 0.7,
    output_format: str = "jpeg",
) -> bytes:
    """
    Fallback retouch using classic OpenCV algorithms when no FAL_KEY is configured.

    Adjusts enhancement intensity via the `fidelity` parameter:
    - Low fidelity (< 0.4): Strong enhancement (heavy CLAHE + aggressive smoothing)
    - Mid fidelity (~0.5): Moderate enhancement
    - High fidelity (> 0.6): Light enhancement, maximum identity preservation

    Args:
        image_bytes: Raw bytes of the input image.
        fidelity: Identity preservation weight (0.0–1.0). Defaults to 0.7.
        output_format: Output format, "jpeg" or "png". Defaults to "jpeg".

    Returns:
        Raw bytes of the processed image.
    """
    import cv2
    import numpy as np
    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes))

    alpha = None
    if output_format.lower() == "png" and (
        img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    ):
        img = img.convert("RGBA")
        alpha = img.split()[3]

    img = img.convert("RGB")
    np_img = np.array(img)
    bgr_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)

    # --- CLAHE: adjust clip limit based on fidelity (lower fidelity = stronger contrast) ---
    clip_limit = 1.0 + (1.0 - float(fidelity)) * 2.0  # 1.0 (natural) … 3.0 (strong)
    lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
    cl = clahe.apply(l_chan)
    limg = cv2.merge((cl, a_chan, b_chan))
    enhanced_bgr = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

    # --- Bilateral filter: adjust blend weight based on fidelity ---
    # Higher fidelity → less blurring blended in
    smooth_weight = (1.0 - float(fidelity)) * 0.6  # 0.0 … 0.6
    original_weight = 1.0 - smooth_weight

    smoothed = cv2.bilateralFilter(enhanced_bgr, d=9, sigmaColor=75, sigmaSpace=75)
    cleaned = cv2.medianBlur(smoothed, 3)
    blended = cv2.addWeighted(enhanced_bgr, original_weight, cleaned, smooth_weight, 0)

    enhanced_rgb = cv2.cvtColor(blended, cv2.COLOR_BGR2RGB)
    out_img = Image.fromarray(enhanced_rgb)
    if alpha is not None:
        out_img.putalpha(alpha)

    out_buffer = io.BytesIO()
    if output_format.lower() == "png":
        out_img.save(out_buffer, format="PNG")
    else:
        out_img.save(out_buffer, format="JPEG", quality=95)

    return out_buffer.getvalue()


async def _apply_opencv_relight(
    image_bytes: bytes,
    output_format: str,
    light_direction: str,
    light_type: str,
) -> bytes:
    import cv2
    import numpy as np

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    np_img = np.array(img)
    bgr_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)

    h, w = bgr_img.shape[:2]
    y = np.linspace(0.0, 1.0, h)[:, None]
    x = np.linspace(0.0, 1.0, w)[None, :]

    if light_direction == "left":
        grad = 1.0 - x
    elif light_direction == "right":
        grad = x
    elif light_direction == "top":
        grad = 1.0 - y
    elif light_direction == "bottom":
        grad = y
    elif light_direction == "top-left":
        grad = ((1.0 - x) + (1.0 - y)) / 2.0
    elif light_direction == "top-right":
        grad = (x + (1.0 - y)) / 2.0
    elif light_direction == "bottom-left":
        grad = ((1.0 - x) + y) / 2.0
    elif light_direction == "bottom-right":
        grad = (x + y) / 2.0
    else:
        grad = np.full((h, w), 0.65)

    beta = 12.0
    alpha = 1.03
    if light_type == "studio softbox":
        beta, alpha = 16.0, 1.04
    elif light_type == "warm sunset":
        beta, alpha = 20.0, 1.05
    elif light_type == "cool daylight":
        beta, alpha = 14.0, 1.03
    elif light_type == "dramatic contrast":
        beta, alpha = 8.0, 1.08

    grad_3 = np.repeat(grad[:, :, None], 3, axis=2)
    lifted = bgr_img.astype(np.float32) * alpha + (grad_3 * beta)

    if light_type == "warm sunset":
        lifted[:, :, 2] *= 1.04  # Boost reds slightly for warm tone.
    elif light_type == "cool daylight":
        lifted[:, :, 0] *= 1.04  # Boost blues slightly for cool tone.

    clipped = np.clip(lifted, 0, 255).astype(np.uint8)
    rgb = cv2.cvtColor(clipped, cv2.COLOR_BGR2RGB)
    out_img = Image.fromarray(rgb)

    out = io.BytesIO()
    if output_format.lower() == "png":
        out_img.save(out, format="PNG")
    else:
        out_img.save(out, format="JPEG", quality=95)
    return out.getvalue()


async def relight_with_fal(
    image_bytes: bytes,
    output_format: str,
    light_direction: str,
    light_type: str,
) -> bytes:
    import fal_client
    import httpx

    from app.core.config import settings
    from app.services.storage_service import upload_image

    if not settings.FAL_KEY:
        raise ValueError("FAL_KEY is missing. Cannot call relight models.")

    os.environ["FAL_KEY"] = settings.FAL_KEY

    mime_type = "image/png" if output_format.lower() == "png" else "image/jpeg"
    temp_url = await upload_image(
        image_bytes, content_type=mime_type, prefix="retouch_relight_input"
    )

    relight_candidates = [
        (
            FAL_RETOUCH_RELIGHT_PRIMARY,
            {
                "image_url": temp_url,
                "light_direction": light_direction,
                "light_type": light_type,
            },
        ),
        (
            FAL_RETOUCH_RELIGHT_FALLBACK,
            {
                "image_url": temp_url,
                "lighting_style": light_type,
            },
        ),
    ]

    last_error: Optional[Exception] = None
    for model_id, arguments in relight_candidates:
        try:
            result = await fal_client.run_async(model_id, arguments=arguments)
            url = _extract_image_url_from_result(result)
            if not url:
                raise RuntimeError(f"Relight model did not return image URL: {result}")

            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=60.0)
                resp.raise_for_status()
                result_bytes = resp.content

            if output_format.lower() == "jpeg":
                img = Image.open(io.BytesIO(result_bytes)).convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=95)
                return buf.getvalue()

            return result_bytes
        except Exception as exc:  # pragma: no cover - external service variability
            last_error = exc
            logger.warning("Relight model failed: %s", model_id, exc_info=exc)

    if last_error:
        raise RuntimeError("All relight model calls failed") from last_error
    raise RuntimeError("All relight model calls failed")


async def auto_retouch(
    image_bytes: bytes,
    fidelity: float = 0.7,
    output_format: str = "jpeg",
    relight_mode: str = "off",
    light_direction: str = "front",
    light_type: str = "soft overcast daylight lighting",
) -> bytes:
    """
    Main entry point for retouching. Tries CodeFormer (fal.ai) first,
    falls back to OpenCV if FAL_KEY is unavailable.

    Args:
        image_bytes: Raw bytes of the input image.
        fidelity: Quality/identity tradeoff (0.0–1.0). Defaults to 0.7.
        output_format: "jpeg" or "png". Defaults to "jpeg".

    Returns:
        Raw bytes of the retouched image.
    """
    from app.core.config import settings

    mode = _normalize_relight_mode(relight_mode)
    direction = _normalize_light_direction(light_direction)
    tone = _normalize_light_type(light_type)

    if settings.FAL_KEY:
        try:
            result = await retouch_with_codeformer(image_bytes, fidelity, output_format)

            if mode in {"auto", "advanced"}:
                try:
                    relit = await relight_with_fal(result, output_format, direction, tone)
                    return _blend_retouch_with_original(
                        original_bytes=result,
                        retouched_bytes=relit,
                        fidelity=min(float(fidelity), 0.85),
                        output_format=output_format,
                    )
                except Exception:
                    logger.exception("Relight failed, returning retouch-only result.")

            return result
        except Exception:
            logger.exception("CodeFormer failed, falling back to OpenCV retouch.")

    logger.warning("FAL_KEY not set. Using OpenCV fallback for retouch.")
    result = await retouch_opencv_fallback(image_bytes, fidelity, output_format)
    if mode in {"auto", "advanced"}:
        return await _apply_opencv_relight(result, output_format, direction, tone)
    return result

