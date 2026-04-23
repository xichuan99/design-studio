import io
import json
import logging
import PyPDF2
from typing import List
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.ai_models import EMBEDDING_TEXT_MODEL
from app.core.config import settings
from app.models.brand_memory import BrandMemory

logger = logging.getLogger(__name__)

async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from a PDF file."""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return ""

async def get_embedding_for_text(text: str) -> List[float]:
    """Generates an embedding vector for a given text chunk using OpenRouter embeddings."""
    try:
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not configured")

        model_name = EMBEDDING_TEXT_MODEL
        if model_name.startswith("openrouter/"):
            model_name = model_name.replace("openrouter/", "", 1)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://design-studio.dev",
                },
                json={"model": model_name, "input": text},
            )
            response.raise_for_status()
            payload = response.json()

        vectors = payload.get("data", [])
        if not vectors or "embedding" not in vectors[0]:
            raise ValueError("Invalid embedding response from OpenRouter")

        return vectors[0]["embedding"]
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        # Return fallback zeros vector just to avoid db crash for prototyping
        # In production this should raise or retry
        return [0.0] * 768

async def chunk_and_store_guidelines(
    db: AsyncSession,
    brand_kit_id: str,
    raw_text: str,
    chunk_size: int = 1000
) -> int:
    """
    Splits text into chunks, gets embeddings, and saves to BrandMemory table.
    """
    if not raw_text:
        return 0

    words = raw_text.split()
    chunks = []

    # Very naive chunking by words
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)

    count = 0
    for idx, chunk in enumerate(chunks):
        embedding = await get_embedding_for_text(chunk)
        if embedding:
            memory = BrandMemory(
                brand_kit_id=brand_kit_id,
                content=chunk,
                metadata_json=json.dumps({"chunk_index": idx, "source": "pdf_upload"}),
                embedding=embedding
            )
            db.add(memory)
            count += 1

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Error saving memories to db: {e}")
        return 0

    return count

async def retrieve_top_k_memories(
    db: AsyncSession,
    brand_kit_id: str,
    query_text: str,
    k: int = 3
) -> List[str]:
    """
    Async version for semantic search.
    """
    query_embedding = await get_embedding_for_text(query_text)

    if not query_embedding or len(query_embedding) != 768:
        return []

    # Use pgvector's corresponding operator (L2 distance or inner product)
    # the matching operator is `<->` for L2 distance (cosine distance is `<=>`)
    try:
        result = await db.execute(
            select(BrandMemory)
            .where(BrandMemory.brand_kit_id == brand_kit_id)
            .order_by(BrandMemory.embedding.cosine_distance(query_embedding))
            .limit(k)
        )
        memories = result.scalars().all()
        return [m.content for m in memories]
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        return []
