import io
from PIL import Image
from app.core.exceptions import ValidationError

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

def validate_uploaded_image(file_bytes: bytes, max_size_mb: int = 5) -> str:
    """
    Validates that the uploaded file bytes represent a valid image.
    Uses Pillow to verify the internal file signature (magic bytes).
    Returns the detected MIME type.
    Raises ValidationError if invalid or exceeded size.
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    if len(file_bytes) > max_size_bytes:
        raise ValidationError(detail=f"File too large. Maximum size is {max_size_mb}MB.")

    try:
        # Use Pillow to verify it's a real image (checks magic bytes and basic structure)
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Does not decode raster data, very fast and safe

        # Deduce MIME from Pillow format
        format_to_mime = {
            "JPEG": "image/jpeg",
            "MPO": "image/jpeg",
            "PNG": "image/png",
            "WEBP": "image/webp"
        }

        mime_type = format_to_mime.get(img.format)
        if not mime_type or mime_type not in ALLOWED_MIME_TYPES:
            raise ValidationError(detail="Unsupported image format. Allowed: JPEG, PNG, WEBP.")

        return mime_type
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(detail="Invalid or corrupted image file.")
