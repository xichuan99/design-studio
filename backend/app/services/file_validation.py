import io
from typing import Optional
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import ValidationError

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

def get_mime_from_magic(file_bytes: bytes) -> Optional[str]:
    """Strictly checks file signature (magic bytes) to determine actual MIME type."""
    if file_bytes.startswith(b'\xff\xd8\xff'):
        return "image/jpeg"
    elif file_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
        return "image/png"
    elif file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP":
        return "image/webp"
    return None

async def validate_uploaded_image(
    file_bytes: bytes,
    max_size_mb: int = 5,
    user_id: Optional[str] = None,
    db: Optional[AsyncSession] = None
) -> str:
    """
    Validates that the uploaded file bytes represent a valid image.
    Uses strict magic byte checking and Pillow verify.
    Integrates with storage quota if user_id and db are provided.
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    file_size = len(file_bytes)
    if file_size > max_size_bytes:
        raise ValidationError(detail=f"File terlalu besar. Batas ukuran adalah {max_size_mb}MB.")

    # 1. Strict MIME type check using magic bytes
    mime_type = get_mime_from_magic(file_bytes)
    if not mime_type or mime_type not in ALLOWED_MIME_TYPES:
        raise ValidationError(detail="Format file tidak didukung atau file rusak. Format yang diizinkan hanya format gambar (JPEG, PNG, WEBP).")

    # 2. Storage Quota check if requested
    if user_id and db:
        from app.services.storage_quota_service import check_quota
        # check_quota raises safely handled AppException HTTP 413 if exceeded
        await check_quota(user_id, file_size, db)

    try:
        # 3. Use Pillow to verify internal image structure incrementally
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Does not decode raster data
        return mime_type
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(detail="File gambar rusak atau tidak dapat dibaca.")
