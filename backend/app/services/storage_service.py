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


async def delete_image(url: str) -> bool:
    """
    Delete an image from S3 (or local filesystem) given its public URL.

    Args:
        url: The public URL of the image to delete.

    Returns:
        True if deletion succeeded, False otherwise.
    """
    import logging
    import os
    import re

    logger = logging.getLogger(__name__)

    if not url:
        return False

    # Handle local dev fallback files
    base = settings.BACKEND_BASE_URL.rstrip("/")
    if url.startswith(base + "/static/uploads/"):
        key = url.replace(base + "/static/uploads/", "")
        local_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "static",
            "uploads",
            key,
        )
        try:
            if os.path.exists(local_path):
                os.remove(local_path)
                logger.info(f"Deleted local file: {local_path}")
            return True
        except Exception as e:
            logger.warning(f"Failed to delete local file {local_path}: {e}")
            return False

    # Extract S3 key from public URL
    key = None
    if settings.S3_PUBLIC_URL and url.startswith(settings.S3_PUBLIC_URL):
        key = url.replace(settings.S3_PUBLIC_URL.rstrip("/") + "/", "", 1)
    elif settings.S3_ENDPOINT and settings.S3_BUCKET:
        prefix = f"{settings.S3_ENDPOINT.rstrip('/')}/{settings.S3_BUCKET}/"
        if url.startswith(prefix):
            key = url.replace(prefix, "", 1)
    if not key and settings.S3_BUCKET:
        # Try standard AWS URL pattern
        pattern = rf"https?://{re.escape(settings.S3_BUCKET)}\.s3\.amazonaws\.com/(.+)"
        m = re.match(pattern, url)
        if m:
            key = m.group(1)

    if not key:
        logger.warning(f"Could not extract S3 key from URL: {url}")
        return False

    try:
        s3 = _get_s3_client()
        s3.delete_object(Bucket=settings.S3_BUCKET, Key=key)
        logger.info(f"Deleted S3 object: {key}")
        return True
    except Exception as e:
        logger.warning(f"Failed to delete S3 object {key}: {e}")
        return False


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


async def upload_image_tracked(
    image_bytes: bytes,
    user_id,
    db,
    key: str | None = None,
    content_type: str = "image/jpeg",
    prefix: str = "generated",
) -> str:
    """
    Upload an image with storage quota tracking.

    Checks the user's quota before uploading, performs the upload,
    then increments the user's storage_used. Returns the public URL.

    Args:
        image_bytes: The raw bytes of the image to upload.
        user_id: The UUID of the user uploading the file.
        db: AsyncSession for database access.
        key: Optional specific S3 key.
        content_type: MIME type of the image.
        prefix: S3 key prefix.

    Returns:
        str: The public URL of the uploaded image.

    Raises:
        HTTPException(413): If the user's storage quota would be exceeded.
    """
    from app.services.storage_quota_service import check_quota, increment_usage

    file_size = len(image_bytes)

    # Pre-upload quota check
    await check_quota(user_id, file_size, db)

    # Perform the actual upload (unchanged original function)
    url = await upload_image(
        image_bytes, key=key, content_type=content_type, prefix=prefix
    )

    # Record the usage
    await increment_usage(user_id, file_size, db)

    return url

