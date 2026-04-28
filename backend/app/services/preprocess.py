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
    "4:5": (896, 1120),
}


def resize_to_aspect(image_bytes: bytes, aspect_ratio: str = "1:1") -> bytes:
    """
    Center-crop and resize an image to the target aspect ratio resolution.

    Args:
        image_bytes (bytes): The raw bytes of the image to resize.
        aspect_ratio (str): The target aspect ratio ("1:1", "9:16", "16:9"). Defaults to "1:1".

    Returns:
        bytes: The raw bytes of the resized and cropped image in JPEG format.

    Raises:
        Exception: If the image cannot be opened, cropped, resized, or saved.
    """
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
    """
    Extract N dominant colors from an image using K-means clustering.
    Returns a list of hex color strings.

    Args:
        image_bytes (bytes): The raw bytes of the image to analyze.
        n (int): The number of dominant colors to extract. Defaults to 3.

    Returns:
        list[str]: A list of hex color strings representing the dominant colors.

    Raises:
        Exception: If the image cannot be opened or processed by K-means clustering.
    """
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
    """
    Full pre-processing pipeline for a reference image.

    Args:
        image_bytes (bytes): The raw bytes of the reference image.
        aspect_ratio (str): The target aspect ratio for resizing. Defaults to "1:1".

    Returns:
        dict: A dictionary containing:
              - 'resized_bytes' (bytes): The bytes of the resized image.
              - 'dominant_colors' (list[str]): A list of extracted dominant hex colors.

    Raises:
        Exception: If resizing or color extraction fails.
    """
    resized = resize_to_aspect(image_bytes, aspect_ratio)
    colors = extract_dominant_colors(image_bytes)

    return {
        "resized_bytes": resized,
        "dominant_colors": colors,
    }

