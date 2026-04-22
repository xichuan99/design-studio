import io
import zipfile

import pytest

from app.schemas.carousel import (
    CarouselExportRequest,
    CarouselGenerateRequest,
    CarouselRegenerateSlideRequest,
)
from app.services.carousel_export_service import export_carousel_zip
from app.services.carousel_generation_service import generate_carousel, regenerate_carousel_slide


@pytest.mark.asyncio
async def test_generate_carousel_returns_requested_slide_count():
    result = await generate_carousel(
        CarouselGenerateRequest(
            topic="5 tips UX design untuk startup yang ingin onboarding lebih rapi",
            brand_name="DesignCo",
            ig_handle="@designco.id",
            primary_color="#6C5CE7",
            font_style="modern",
            tone="professional",
            num_slides=7,
        )
    )

    assert result.carousel_id.startswith("car_")
    assert len(result.slides) == 7
    assert result.slides[0].type == "hero"
    assert result.slides[-1].type == "cta"


@pytest.mark.asyncio
async def test_regenerate_carousel_slide_returns_selected_index():
    generated = await generate_carousel(
        CarouselGenerateRequest(
            topic="Cara membuat carousel edukasi yang lebih mudah disimpan",
            brand_name="Studio Belajar",
            ig_handle="@studiobelajar",
            primary_color="#0EA5E9",
            font_style="modern",
            tone="educational",
            num_slides=7,
        )
    )

    refreshed = await regenerate_carousel_slide(
        CarouselRegenerateSlideRequest(
            topic="Cara membuat carousel edukasi yang lebih mudah disimpan",
            brand_name="Studio Belajar",
            ig_handle="@studiobelajar",
            primary_color="#0EA5E9",
            font_style="modern",
            tone="educational",
            num_slides=7,
            carousel_id=generated.carousel_id,
            slide_index=2,
            instruction="buat pain point lebih tajam",
            slides=generated.slides,
        )
    )

    assert refreshed.index == 2
    assert refreshed.type == "problem"


@pytest.mark.asyncio
async def test_export_carousel_zip_contains_all_slide_images():
    generated = await generate_carousel(
        CarouselGenerateRequest(
            topic="Checklist konten Instagram untuk UMKM makanan lokal",
            brand_name="Warung Maju",
            ig_handle="@warungmaju",
            primary_color="#16A34A",
            font_style="warm",
            tone="friendly",
            num_slides=5,
        )
    )

    archive = export_carousel_zip(
        CarouselExportRequest(
            carousel_id=generated.carousel_id,
            brand_name="Warung Maju",
            ig_handle="@warungmaju",
            brand_tokens=generated.brand_tokens,
            slides=generated.slides,
        )
    )

    zip_buffer = io.BytesIO(archive)
    with zipfile.ZipFile(zip_buffer) as zip_file:
        names = zip_file.namelist()

    assert len(names) == 5
    assert names[0] == "slide-01.png"
    assert names[-1] == "slide-05.png"
