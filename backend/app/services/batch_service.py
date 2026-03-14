import asyncio
import io
import zipfile
import logging
from typing import List, Tuple, Dict, Any, Optional

from app.services import bg_removal_service
from app.services import watermark_service
from app.services import product_scene_service

logger = logging.getLogger(__name__)

async def process_single_image(
    filename: str,
    image_bytes: bytes,
    operation: str,
    params: Dict[str, Any]
) -> Tuple[Optional[str], Optional[bytes], Optional[str]]:
    """
    Processes a single image based on operation.
    Returns: (success_filename, processed_bytes, error_message)
    """
    try:
        if operation == "remove_bg":
            result_bytes = await bg_removal_service.remove_background(image_bytes)
            # Change extension to .png since remove_background outputs PNG
            new_filename = filename.rsplit('.', 1)[0] + "_nobg.png"
            return new_filename, result_bytes, None

        elif operation == "watermark":
            logo_bytes = params.get("logo_bytes")
            if not logo_bytes:
                raise ValueError("Logo bytes are required for watermark operation")

            position = params.get("position", "bottom-right")
            opacity = params.get("opacity", 0.5)
            scale = params.get("scale", 0.2)

            result_bytes = await watermark_service.apply_watermark(
                base_image_bytes=image_bytes,
                watermark_bytes=logo_bytes,
                position=position,
                opacity=opacity,
                scale=scale
            )
            # Default to jpeg for watermarks if original might be jpeg
            new_filename = filename.rsplit('.', 1)[0] + "_watermarked.jpg"
            return new_filename, result_bytes, None

        elif operation == "product_scene":
            theme = params.get("theme", "studio")
            aspect_ratio = params.get("aspect_ratio", "1:1")

            result_bytes = await product_scene_service.generate_product_scene(
                image_bytes=image_bytes,
                theme=theme,
                aspect_ratio=aspect_ratio
            )
            new_filename = filename.rsplit('.', 1)[0] + f"_scene_{theme}.jpg"
            return new_filename, result_bytes, None

        else:
            return None, None, f"Unsupported operation: {operation}"

    except Exception as e:
        logger.error(f"Error processing {filename}: {str(e)}")
        return None, None, str(e)


async def process_batch(
    files: List[Tuple[str, bytes]],
    operation: str,
    params: Dict[str, Any] = None
) -> Tuple[bytes, List[Dict[str, str]]]:
    """
    Processes a batch of images concurrently and packs the successful ones into a ZIP.
    Returns: (zip_file_bytes, list_of_errors)
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

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for original_filename, result in zip(
            [f[0] for f in files], results
        ):
            if isinstance(result, Exception):
                errors.append({
                    "filename": original_filename,
                    "error": f"Unhandled exception: {str(result)}"
                })
                continue

            new_filename, processed_bytes, error_msg = result

            if error_msg:
                errors.append({
                    "filename": original_filename,
                    "error": error_msg
                })
            elif processed_bytes and new_filename:
                zip_file.writestr(new_filename, processed_bytes)

    # Reset buffer pointer
    zip_buffer.seek(0)

    logger.info(f"Batch completed. {len(files) - len(errors)} successes, {len(errors)} failures.")
    return zip_buffer.getvalue(), errors
