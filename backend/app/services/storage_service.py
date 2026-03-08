from __future__ import annotations
"""
Cloud storage service for uploading/downloading images to S3-compatible storage
(Backblaze B2, Cloudflare R2, AWS S3).
"""
import io
import uuid
import boto3
from botocore.config import Config
from app.core.config import settings


def _get_s3_client():
    """Create an S3 client configured for the storage provider."""
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT or None,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )


def generate_key(prefix: str = "generated", extension: str = "jpg") -> str:
    """Generate a unique S3 object key."""
    unique_id = uuid.uuid4().hex[:12]
    return f"{prefix}/{unique_id}.{extension}"


async def upload_image(
    image_bytes: bytes,
    key: str | None = None,
    content_type: str = "image/jpeg",
    prefix: str = "generated",
) -> str:
    """Upload an image to S3 and return the public URL."""
    if not settings.S3_ACCESS_KEY:
        raise ValueError("S3_ACCESS_KEY is missing from environment")

    s3 = _get_s3_client()
    if key is None:
        ext = "png" if "png" in content_type else "jpg"
        key = generate_key(prefix, ext)

    s3.upload_fileobj(
        io.BytesIO(image_bytes),
        settings.S3_BUCKET,
        key,
        ExtraArgs={"ContentType": content_type},
    )

    # Return public URL
    if settings.S3_PUBLIC_URL:
        return f"{settings.S3_PUBLIC_URL.rstrip('/')}/{key}"
    elif settings.S3_ENDPOINT:
        return f"{settings.S3_ENDPOINT.rstrip('/')}/{settings.S3_BUCKET}/{key}"
    else:
        return f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{key}"


async def download_image(url: str) -> bytes:
    """Download an image from a URL and return the bytes."""
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.get(url, follow_redirects=True)
        response.raise_for_status()
        return response.content
