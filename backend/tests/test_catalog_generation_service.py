import pytest
from unittest.mock import patch

from app.schemas.catalog import (
    CatalogBasicsRequest,
    CatalogImageInput,
    FinalizePlanRequest,
    GenerateCopyRequest,
    ImageMappingRequest,
    SuggestStylesRequest,
)
from app.services.catalog_generation_service import (
    finalize_catalog_plan,
    generate_catalog_copy,
    map_catalog_images,
    plan_catalog_structure,
    suggest_catalog_styles,
)


@pytest.fixture(autouse=True)
def force_catalog_fallback_path():
    with patch("app.services.catalog_generation_service._llm_available", return_value=False):
        yield


@pytest.mark.asyncio
async def test_plan_catalog_structure_for_product_has_product_pages():
    result = await plan_catalog_structure(
        CatalogBasicsRequest(
            catalog_type="product",
            total_pages=5,
            goal="selling",
            tone="premium",
            business_name="Atelier Mode",
        )
    )

    assert len(result.suggested_structure) == 5
    assert result.suggested_structure[0].type == "cover"
    assert any(page.type == "product_list" for page in result.suggested_structure)
    assert result.suggested_structure[-1].type == "cta"


@pytest.mark.asyncio
async def test_plan_catalog_structure_for_service_has_service_specific_pages():
    result = await plan_catalog_structure(
        CatalogBasicsRequest(
            catalog_type="service",
            total_pages=5,
            goal="showcasing",
            tone="formal",
            business_name="Studio Konsultan",
        )
    )

    page_types = [page.type for page in result.suggested_structure]
    assert "problem_solution" in page_types
    assert "service_list" in page_types
    assert page_types[-1] == "cta"


@pytest.mark.asyncio
async def test_suggest_catalog_styles_returns_three_options():
    basics = CatalogBasicsRequest(
        catalog_type="product",
        total_pages=5,
        goal="promo",
        tone="fun",
    )
    structure = (await plan_catalog_structure(basics)).suggested_structure

    result = await suggest_catalog_styles(SuggestStylesRequest(basics=basics, structure=structure))

    assert len(result.style_options) == 3
    assert result.style_options[0].style == "Minimalist Clean"


@pytest.mark.asyncio
async def test_map_catalog_images_classifies_cover_keyword():
    basics = CatalogBasicsRequest(
        catalog_type="product",
        total_pages=4,
        goal="selling",
        tone="premium",
    )
    structure = (await plan_catalog_structure(basics)).suggested_structure

    result = await map_catalog_images(
        ImageMappingRequest(
            basics=basics,
            structure=structure,
            images=[CatalogImageInput(image_id="img_1", filename="cover-hero-shot.jpg")],
        )
    )

    assert result.image_mapping[0].category == "cover_image"
    assert result.image_mapping[0].recommended_pages == [1]


@pytest.mark.asyncio
async def test_finalize_catalog_plan_merges_copy_and_images():
    basics = CatalogBasicsRequest(
        catalog_type="product",
        total_pages=4,
        goal="selling",
        tone="premium",
        business_name="Atelier Mode",
    )
    structure = (await plan_catalog_structure(basics)).suggested_structure
    generated_copy = await generate_catalog_copy(
        GenerateCopyRequest(
            basics=basics,
            selected_style="Minimalist Clean",
            pages=structure,
            business_data={"business_name": "Atelier Mode"},
        )
    )
    image_mapping = await map_catalog_images(
        ImageMappingRequest(
            basics=basics,
            structure=structure,
            images=[CatalogImageInput(image_id="img_1", filename="cover-hero-shot.jpg")],
        )
    )

    result = await finalize_catalog_plan(
        FinalizePlanRequest(
            basics=basics,
            selected_style="Minimalist Clean",
            structure=structure,
            image_mapping=image_mapping.image_mapping,
            page_copy=generated_copy.pages,
        )
    )

    assert result.schema_version == "catalog.plan.v1"
    assert result.total_pages == 4
    assert result.pages[0].content["title"] == "Atelier Mode"
    assert result.pages[0].content["image_roles"][0]["category"] == "cover_image"
