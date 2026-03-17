import httpx
import json
import logging
from typing import Optional


async def optimize_quantum_layout(
    parsed_headline: Optional[str],
    parsed_sub_headline: Optional[str],
    parsed_cta: Optional[str],
) -> Optional[str]:
    """
    Calls the Quantum Engine to determine optimal layout for text elements.
    Returns JSON string of the layout if successful, else None.
    """
    elements = []
    if parsed_headline:
        elements.append(
            {"role": "headline", "width": 800, "height": 120, "pinned": False}
        )
    if parsed_sub_headline:
        elements.append(
            {"role": "sub_headline", "width": 600, "height": 80, "pinned": False}
        )
    if parsed_cta:
        elements.append({"role": "cta", "width": 400, "height": 60, "pinned": False})

    if not elements:
        return None

    # TODO: In the future, get dimensions from request or constants
    payload = {
        "canvas_width": 1080,
        "canvas_height": 1080,
        "elements": elements,
        "strategy": "balanced",
        "num_variations": 1,
    }

    # In a real deployed environment, consider moving the URL to .env config
    # e.g., os.getenv("QUANTUM_ENGINE_URL", "http://quantum-engine:8001/api/quantum/optimize")
    quantum_url = "http://quantum-engine:8001/api/quantum/optimize"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(quantum_url, json=payload)
            if resp.status_code == 200:
                quantum_data = resp.json()
                return json.dumps(quantum_data)
            else:
                logging.warning(f"Quantum engine warning: status {resp.status_code}")
                return None
    except Exception as e:
        logging.warning(
            f"Quantum optimization failed, proceeding with fallback. Error: {e}"
        )
        return None


async def optimize_quantum_logo_placement(
    canvas_w: int, canvas_h: int, logo_w: int, logo_h: int
) -> Optional[dict]:
    """
    Calculates the best position and scaling for a logo using Quantum Engine principles.
    Returns a dict with x, y, width, height or None if failed.
    """
    # Default smart scale: 15% of canvas width
    scale_factor = 0.15
    target_w = int(canvas_w * scale_factor)

    # Maintain aspect ratio
    ratio = target_w / logo_w
    target_h = int(logo_h * ratio)

    # Default padding
    pad_x = int(canvas_w * 0.05)
    pad_y = int(canvas_h * 0.05)

    quantum_url = "http://quantum-engine:8001/api/quantum/optimize-logo"
    payload = {
        "canvas_width": canvas_w,
        "canvas_height": canvas_h,
        "logo_width": logo_w,
        "logo_height": logo_h,
    }

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(quantum_url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "x": data.get("x", canvas_w - target_w - pad_x),
                    "y": data.get("y", pad_y),
                    "width": data.get("width", target_w),
                    "height": data.get("height", target_h),
                }
    except Exception as e:
        logging.warning(
            f"Quantum logo placement API unreachable/failed, using smart fallback. Error: {e}"
        )

    # Smart Fallback to Top-Right
    return {
        "x": canvas_w - target_w - pad_x,
        "y": pad_y,
        "width": target_w,
        "height": target_h,
    }

