"""
Quantum layout service — local implementation (no external microservice).

Previously called the quantum-engine container over HTTP. Now delegates to
placement_engine.py running in-process, eliminating the extra Docker container
while preserving the same public API surface for callers.
"""
import json
import logging
from typing import Optional


async def optimize_quantum_layout(
    parsed_headline: Optional[str],
    parsed_sub_headline: Optional[str],
    parsed_cta: Optional[str],
    ratio: str = "1:1",
) -> Optional[str]:
    """
    Compute optimal layout for text elements using the local placement engine.

    Returns a JSON string compatible with the frontend's ``templateEngine.ts``
    expectations::

        {
          "variations": [
            [{"role": "headline", "x": <px>, "y": <px>}, ...]
          ],
          "image_prompt_modifier": "<string appended to visual_prompt>"
        }

    ``x`` / ``y`` are **pixel** values in a 1024×1024 logical canvas, adjusted
    for the element's text alignment so ``templateEngine`` can use them directly
    as the left-edge position (``usedQuantum=true`` path skips re-centering).

    Returns None if no text elements are present.
    """
    has_headline = bool(parsed_headline)
    has_sub = bool(parsed_sub_headline)
    has_cta = bool(parsed_cta)

    if not any([has_headline, has_sub, has_cta]):
        return None

    try:
        from app.services.placement_engine import select_and_place

        placement = select_and_place(
            ratio=ratio,
            has_headline=has_headline,
            has_sub=has_sub,
            has_cta=has_cta,
            text_length_headline=len(parsed_headline) if parsed_headline else 0,
        )

        canvas_size = 1024
        el_width = int(canvas_size * 0.8)  # matches templateEngine elWidth

        variation: list[dict] = []
        for el in placement.layouts:
            # Convert proportional → pixel, adjusting for alignment so
            # templateEngine receives a ready-to-use left-edge x coordinate.
            x_center_px = el.x * canvas_size
            if el.text_align == "center":
                x_px = int(x_center_px - el_width / 2)
            elif el.text_align == "right":
                x_px = int(x_center_px - el_width)
            else:  # "left"
                x_px = int(x_center_px)

            y_px = int(el.y * canvas_size)
            variation.append({"role": el.role, "x": x_px, "y": y_px})

        result = {
            "variations": [variation],
            "image_prompt_modifier": placement.image_prompt_modifier,
        }
        return json.dumps(result)

    except Exception as exc:
        logging.warning(
            "Local quantum layout failed, proceeding without layout. Error: %s", exc
        )
        return None


async def optimize_quantum_logo_placement(
    canvas_w: int, canvas_h: int, logo_w: int, logo_h: int
) -> Optional[dict]:
    """
    Calculate best position and scaling for a logo overlay.

    Uses a local smart rule: logo = 15% canvas width, top-right corner (5% pad).
    """
    scale_factor = 0.15
    target_w = int(canvas_w * scale_factor)

    ratio = target_w / logo_w
    target_h = int(logo_h * ratio)

    pad_x = int(canvas_w * 0.05)
    pad_y = int(canvas_h * 0.05)

    return {
        "x": canvas_w - target_w - pad_x,
        "y": pad_y,
        "width": target_w,
        "height": target_h,
    }

