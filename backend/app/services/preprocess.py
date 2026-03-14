"""
Image pre-processing service: resize, crop, and extract dominant colors
from user-uploaded reference images before sending to Fal.ai.
"""

from __future__ import annotations
import io
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans

# Target resolutions per aspect ratio
RESOLUTIONS = {
    "1:1": (1024, 1024),
    "9:16": (768, 1344),
    "16:9": (1344, 768),
}


def resize_to_aspect(image_bytes: bytes, aspect_ratio: str = "1:1") -> bytes:
    """Center-crop and resize an image to the target aspect ratio resolution."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    target_w, target_h = RESOLUTIONS.get(aspect_ratio, RESOLUTIONS["1:1"])
    target_aspect = target_w / target_h

    # Current image dimensions
    w, h = img.size
    current_aspect = w / h

    # Center-crop to match target aspect ratio
    if current_aspect > target_aspect:
        # Image is wider — crop sides
        new_w = int(h * target_aspect)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    elif current_aspect < target_aspect:
        # Image is taller — crop top/bottom
        new_h = int(w / target_aspect)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))

    # Resize to exact target resolution
    img = img.resize((target_w, target_h), Image.LANCZOS)

    # Convert back to bytes
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def extract_dominant_colors(image_bytes: bytes, n: int = 3) -> list[str]:
    """Extract N dominant colors from an image using K-means clustering.
    Returns a list of hex color strings."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Downscale for faster processing
    img = img.resize((100, 100), Image.LANCZOS)
    pixels = np.array(img).reshape(-1, 3).astype(float)

    # Run K-means
    kmeans = KMeans(n_clusters=n, random_state=42, n_init=10)
    kmeans.fit(pixels)

    # Sort clusters by frequency (largest cluster first)
    labels, counts = np.unique(kmeans.labels_, return_counts=True)
    sorted_indices = np.argsort(-counts)
    centers = kmeans.cluster_centers_[sorted_indices]

    # Convert to hex
    colors = []
    for center in centers:
        r, g, b = int(center[0]), int(center[1]), int(center[2])
        colors.append(f"#{r:02X}{g:02X}{b:02X}")

    return colors


async def prepare_reference(image_bytes: bytes, aspect_ratio: str = "1:1") -> dict:
    """Full pre-processing pipeline for a reference image.
    Returns a dict with resized image bytes and extracted dominant colors."""
    resized = resize_to_aspect(image_bytes, aspect_ratio)
    colors = extract_dominant_colors(image_bytes)

    return {
        "resized_bytes": resized,
        "dominant_colors": colors,
    }
