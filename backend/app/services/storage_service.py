"""
Cloud storage service for uploading/downloading images to S3-compatible storage
(Backblaze B2, Cloudflare R2, AWS S3).
"""

from __future__ import annotations
import io
import uuid
import boto3
from botocore.config import Config
from app.core.config import settings


def _get_s3_client():
    """
    Create an S3 client configured for the storage provider.

    Returns:
        botocore.client.BaseClient: The configured S3 client.
    """
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT or None,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )


def generate_key(prefix: str = "generated", extension: str = "jpg") -> str:
    """
    Generate a unique S3 object key.

    Args:
        prefix (str): The folder or prefix for the key. Defaults to "generated".
        extension (str): The file extension. Defaults to "jpg".

    Returns:
        str: A unique S3 object key.
    """
    unique_id = uuid.uuid4().hex[:12]
    return f"{prefix}/{unique_id}.{extension}"


async def upload_image(
    image_bytes: bytes,
    key: str | None = None,
    content_type: str = "image/jpeg",
    prefix: str = "generated",
) -> str:
    """
    Upload an image to S3 (or local filesystem as fallback) and return the public URL.

    Args:
        image_bytes (bytes): The raw bytes of the image to upload.
        key (str | None): Optional specific key (filename) to use. Defaults to None (auto-generated).
        content_type (str): The MIME type of the image. Defaults to "image/jpeg".
        prefix (str): The prefix (folder) to use if auto-generating the key. Defaults to "generated".

    Returns:
        str: The public URL of the uploaded image.

    Raises:
        Exception: The function catches exceptions and falls back to local storage, but underlying filesystem errors could theoretically still raise.
    """
    if (
        not settings.S3_ACCESS_KEY
        or settings.S3_ACCESS_KEY == "your_b2_application_key_id"
    ):
        # Dev-mode fallback: save to local filesystem
        import os
        import logging

        logging.warning("S3 credentials not configured – saving image locally")
        ext = "png" if "png" in content_type else "jpg"
        if key is None:
            key = generate_key(prefix, ext)
        local_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "static",
            "uploads",
            os.path.dirname(key),
        )
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "static",
            "uploads",
            key,
        )
        with open(local_path, "wb") as f:
            f.write(image_bytes)
        base = settings.BACKEND_BASE_URL.rstrip("/")
        return f"{base}/static/uploads/{key}"

    ext = "png" if "png" in content_type else "jpg"
    if key is None:
        key = generate_key(prefix, ext)

    try:
        s3 = _get_s3_client()
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
    except Exception as e:
        # Fallback to local storage if S3 fails (bucket doesn't exist, etc.)
        import os
        import logging

        logging.warning(f"S3 upload failed ({e}) – saving image locally")
        local_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "static",
            "uploads",
            os.path.dirname(key),
        )
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "static",
            "uploads",
            key,
        )
        with open(local_path, "wb") as f:
            f.write(image_bytes)
        base = settings.BACKEND_BASE_URL.rstrip("/")
        return f"{base}/static/uploads/{key}"


async def download_image(url: str) -> bytes:
    """
    Download an image from a URL and return the bytes.

    Args:
        url (str): The URL of the image to download.

    Returns:
        bytes: The raw bytes of the downloaded image.

    Raises:
        httpx.HTTPError: If the HTTP request fails.
    """
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.get(url, follow_redirects=True)
        response.raise_for_status()
        return response.content
