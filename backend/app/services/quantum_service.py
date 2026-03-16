import httpx
import json
import logging
from typing import Optional

async def optimize_quantum_layout(parsed_headline: Optional[str], parsed_sub_headline: Optional[str], parsed_cta: Optional[str]) -> Optional[str]:
    """
    Calls the Quantum Engine to determine optimal layout for text elements.
    Returns JSON string of the layout if successful, else None.
    """
    elements = []
    if parsed_headline:
        elements.append({"role": "headline", "width": 800, "height": 120, "pinned": False})
    if parsed_sub_headline:
        elements.append({"role": "sub_headline", "width": 600, "height": 80, "pinned": False})
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
        "num_variations": 1
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
        logging.warning(f"Quantum optimization failed, proceeding with fallback. Error: {e}")
        return None
