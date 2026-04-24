"""Service for processing batches of images."""

import asyncio
import io
import os
import zipfile
import logging
from typing import List, Tuple, Dict, Any, Optional

from PIL import Image, ImageFilter

from app.services import bg_removal_service
from app.services import watermark_service
from app.services import product_scene_service

logger = logging.getLogger(__name__)

_SUPPORTED_QUALITY = {"standard", "ultra"}
_SUPPORTED_ASPECT_RATIO = {"1:1", "4:5", "16:9", "9:16"}
_SUPPORTED_COMPOSITE_PROFILE = {"default", "grounded", "soft"}
_SUPPORTED_WATERMARK_PRESETS = {"subtle", "balanced", "protective"}


def _normalize_visibility_preset(value: Any) -> str:
    preset = str(value or "balanced").strip().lower()
    if preset in _SUPPORTED_WATERMARK_PRESETS:
        return preset

    logger.warning(
        "Invalid batch visibility_preset '%s'; fallback to balanced",
        value,
    )
    return "balanced"


def _apply_edge_feathering(transparent_png_bytes: bytes, radius: float = 1.0) -> bytes:
    """
    Softens the edges of a transparent PNG to smooth cutout seams and avoid harsh lines.
    This reduces the visual impact of model artifacts at the boundary between subject and background.

    Args:
        transparent_png_bytes (bytes): Transparent PNG from background removal model.
        radius (float): Gaussian blur radius for alpha channel smoothing. Defaults to 1.0.

    Returns:
        bytes: Feathered transparent PNG with smoothed edges.
    """
    try:
        img = Image.open(io.BytesIO(transparent_png_bytes)).convert("RGBA")
        alpha = img.split()[-1]

        # Apply Gaussian blur to alpha channel to feather edges
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=radius))
        img.putalpha(alpha)

        # Encode back to PNG bytes
        output = io.BytesIO()
        img.save(output, format="PNG")
        return output.getvalue()
    except Exception as e:
        logger.warning(f"Edge feathering failed, returning original bytes: {str(e)}")
        return transparent_png_bytes


def _make_unique_filename(filename: str, used_filenames: set[str]) -> str:
    """Ensure each ZIP entry name is unique to avoid overwriting duplicates on extract."""
    if filename not in used_filenames:
        used_filenames.add(filename)
        return filename

    stem, extension = os.path.splitext(filename)
    suffix = 2
    while True:
        candidate = f"{stem}_{suffix}{extension}"
        if candidate not in used_filenames:
            used_filenames.add(candidate)
            return candidate
        suffix += 1


async def process_single_image(
    filename: str, image_bytes: bytes, operation: str, params: Dict[str, Any]
) -> Tuple[Optional[str], Optional[bytes], Optional[str]]:
    """
    Processes a single image based on operation.

    Args:
        filename (str): Original filename of the image.
        image_bytes (bytes): Raw image data as bytes.
        operation (str): The operation to apply (e.g., "remove_bg", "watermark", "product_scene").
        params (Dict[str, Any]): Additional parameters for the operation.

    Returns:
        Tuple[Optional[str], Optional[bytes], Optional[str]]: A tuple containing:
            - new_filename (str | None): The new filename if successful, else None.
            - processed_bytes (bytes | None): The processed image bytes if successful, else None.
            - error_message (str | None): An error message if failed, else None.

    Raises:
        ValueError: If required parameters for the operation are missing.
        Exception: If the underlying operation service fails.
    """
    try:
        if operation == "remove_bg":
            result_bytes = await bg_removal_service.remove_background(image_bytes)

            # Validate and log quality parameter
            quality = str(params.get("quality", "standard"))
            if quality not in _SUPPORTED_QUALITY:
                logger.warning(
                    "Invalid batch quality '%s' for remove_bg; fallback to standard",
                    quality,
                )
                quality = "standard"

            # Post-process transparent PNG to smooth edges and avoid harsh cutout lines
            result_bytes = _apply_edge_feathering(result_bytes)

            # Change extension to .png since remove_background outputs PNG
            new_filename = filename.rsplit(".", 1)[0] + "_nobg.png"
            return new_filename, result_bytes, None

        elif operation == "watermark":
            logo_bytes = params.get("logo_bytes")
            if not logo_bytes:
                raise ValueError("Logo bytes are required for watermark operation")

            position = params.get("position", "bottom-right")
            opacity = params.get("opacity", 0.5)
            scale = params.get("scale", 0.2)
            visibility_preset = _normalize_visibility_preset(
                params.get("visibility_preset", "balanced")
            )

            result_bytes = await watermark_service.apply_watermark(
                base_image_bytes=image_bytes,
                watermark_bytes=logo_bytes,
                position=position,
                opacity=opacity,
                scale=scale,
                visibility_preset=visibility_preset,
            )
            # Default to jpeg for watermarks if original might be jpeg
            new_filename = filename.rsplit(".", 1)[0] + "_watermarked.jpg"
            return new_filename, result_bytes, None

        elif operation == "product_scene":
            theme = params.get("theme", "studio")
            aspect_ratio = str(params.get("aspect_ratio", "1:1"))
            quality = str(params.get("quality", "standard"))
            composite_profile = str(params.get("composite_profile", "default"))

            if aspect_ratio not in _SUPPORTED_ASPECT_RATIO:
                logger.warning(
                    "Invalid batch aspect_ratio '%s'; fallback to 1:1",
                    aspect_ratio,
                )
                aspect_ratio = "1:1"

            if quality not in _SUPPORTED_QUALITY:
                logger.warning(
                    "Invalid batch quality '%s'; fallback to standard",
                    quality,
                )
                quality = "standard"

            if composite_profile not in _SUPPORTED_COMPOSITE_PROFILE:
                logger.warning(
                    "Invalid batch composite_profile '%s'; fallback to default",
                    composite_profile,
                )
                composite_profile = "default"

            logger.info(
                "Batch product_scene params resolved: theme=%s aspect=%s quality=%s profile=%s",
                theme,
                aspect_ratio,
                quality,
                composite_profile,
            )

            result_bytes = await product_scene_service.generate_product_scene(
                image_bytes=image_bytes,
                theme=theme,
                aspect_ratio=aspect_ratio,
                quality=quality,
                composite_profile=composite_profile,
            )
            new_filename = filename.rsplit(".", 1)[0] + f"_scene_{theme}.jpg"
            return new_filename, result_bytes, None

        else:
            return None, None, f"Unsupported operation: {operation}"

    except Exception as e:
        logger.error(f"Error processing {filename}: {str(e)}")
        return None, None, str(e)


async def process_batch(
    files: List[Tuple[str, bytes]], operation: str, params: Dict[str, Any] = None
) -> Tuple[bytes, List[Dict[str, str]]]:
    """
    Processes a batch of images concurrently and packs the successful ones into a ZIP.

    Args:
        files (List[Tuple[str, bytes]]): A list of tuples containing the filename and image bytes.
        operation (str): The operation to apply to all images in the batch.
        params (Dict[str, Any], optional): Additional parameters for the operation. Defaults to None.

    Returns:
        Tuple[bytes, List[Dict[str, str]]]: A tuple containing:
            - zip_file_bytes (bytes): The raw bytes of the resulting ZIP file.
            - errors (List[Dict[str, str]]): A list of dictionaries containing filename and error details for failed items.

    Raises:
        Exception: Any unhandled exception during the batch processing.
    """
    if params is None:
        params = {}

    logger.info(f"Starting batch process: {operation} for {len(files)} files")

    # Create asyncio tasks for parallel processing
    # Note: If Fal.ai API rate limits, we might need an asyncio.Semaphore here
    # For now, we assume the batch size is bounded (e.g. 10 max front-end limit)
    tasks = [
        process_single_image(filename, file_bytes, operation, params)
        for filename, file_bytes in files
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Prepare ZIP in memory
    zip_buffer = io.BytesIO()
    errors = []
    used_filenames = set()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for original_filename, result in zip([f[0] for f in files], results):
            if isinstance(result, Exception):
                errors.append(
                    {
                        "filename": original_filename,
                        "error": f"Unhandled exception: {str(result)}",
                    }
                )
                continue

            new_filename, processed_bytes, error_msg = result

            if error_msg:
                errors.append({"filename": original_filename, "error": error_msg})
            elif processed_bytes and new_filename:
                unique_filename = _make_unique_filename(new_filename, used_filenames)
                zip_file.writestr(unique_filename, processed_bytes)

    # Reset buffer pointer
    zip_buffer.seek(0)

    logger.info(
        f"Batch completed. {len(files) - len(errors)} successes, {len(errors)} failures."
    )
    return zip_buffer.getvalue(), errors
