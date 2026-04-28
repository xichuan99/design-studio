import asyncio
import json
import logging
from typing import Dict, List

from google.genai import types

from app.core.ai_models import LLM_REASONING_FALLBACK, LLM_REASONING_PRIMARY
from app.core.config import settings
from app.schemas.catalog import (
    CatalogBasicsRequest,
    CatalogImageInput,
    CatalogImageMapping,
    CatalogPagePlan,
    CatalogStyleOption,
    FinalizePlanRequest,
    FinalizePlanResponse,
    GenerateCopyRequest,
    GenerateCopyResponse,
    ImageMappingRequest,
    ImageMappingResponse,
    PlanStructureResponse,
    SuggestStylesRequest,
    SuggestStylesResponse,
)
from app.services.llm_client import (
    call_gemini_with_fallback,
    get_direct_gemini_client,
    get_genai_client,
)
from app.services.llm_json_utils import parse_llm_json


logger = logging.getLogger(__name__)


def _build_product_structure(basics: CatalogBasicsRequest) -> List[CatalogPagePlan]:
    pages = [
        CatalogPagePlan(
            page_number=1,
            type="cover",
            layout="hero",
            content={
                "title": basics.business_name or "Koleksi Produk Unggulan",
                "subtitle": "Katalog yang rapi dan siap dipresentasikan",
            },
        )
    ]

    if basics.total_pages == 3:
        pages.append(
            CatalogPagePlan(
                page_number=2,
                type="product_list",
                layout="grid",
                content={"title": "Produk Pilihan", "description": "Ringkasan produk utama dalam satu halaman."},
            )
        )
    else:
        pages.append(
            CatalogPagePlan(
                page_number=2,
                type="brand_story",
                layout="text-image",
                content={"title": "Kenapa Memilih Kami", "description": "Sorot manfaat utama sebelum masuk ke daftar produk."},
            )
        )
        for page_number in range(3, basics.total_pages):
            pages.append(
                CatalogPagePlan(
                    page_number=page_number,
                    type="product_list",
                    layout="grid",
                    content={"title": "Produk Pilihan", "description": "Tampilkan produk unggulan dengan informasi inti dan visual yang konsisten."},
                )
            )

    pages.append(
        CatalogPagePlan(
            page_number=basics.total_pages,
            type="cta",
            layout="contact-cta",
            content={"title": "Siap Order", "description": "Tutup dengan kontak, CTA, dan instruksi pemesanan yang jelas."},
        )
    )
    return pages[: basics.total_pages]


def _build_service_structure(basics: CatalogBasicsRequest) -> List[CatalogPagePlan]:
    pages = [
        CatalogPagePlan(
            page_number=1,
            type="cover",
            layout="hero",
            content={
                "title": basics.business_name or "Layanan Profesional",
                "subtitle": "Ringkasan penawaran jasa yang mudah dipahami",
            },
        ),
        CatalogPagePlan(
            page_number=2,
            type="problem_solution",
            layout="split-content",
            content={"title": "Masalah dan Solusi", "description": "Jelaskan masalah utama klien dan pendekatan layanan Anda."},
        ),
    ]

    middle_types = [
        ("service_list", "grid", "Daftar Layanan"),
        ("process", "timeline", "Proses Kerja"),
        ("testimonial", "quote-grid", "Bukti dan Kepercayaan"),
        ("pricing", "pricing-table", "Paket dan Investasi"),
    ]
    page_number = 3
    for page_type, layout, title in middle_types:
        if page_number >= basics.total_pages:
            break
        pages.append(
            CatalogPagePlan(
                page_number=page_number,
                type=page_type,
                layout=layout,
                content={"title": title, "description": "Susun informasi inti jasa secara ringkas dan meyakinkan."},
            )
        )
        page_number += 1

    while page_number < basics.total_pages:
        pages.append(
            CatalogPagePlan(
                page_number=page_number,
                type="service_detail",
                layout="text-image",
                content={"title": "Detail Layanan", "description": "Tambahkan detail deliverables, timeline, atau scope kerja."},
            )
        )
        page_number += 1

    pages.append(
        CatalogPagePlan(
            page_number=basics.total_pages,
            type="cta",
            layout="contact-cta",
            content={"title": "Mari Diskusikan Kebutuhan Anda", "description": "Tutup dengan CTA konsultasi, kontak, atau langkah berikutnya."},
        )
    )
    return pages[: basics.total_pages]


def _fallback_plan_catalog_structure(request: CatalogBasicsRequest) -> PlanStructureResponse:
    suggested_structure = (
        _build_product_structure(request)
        if request.catalog_type == "product"
        else _build_service_structure(request)
    )
    warnings = []
    if request.total_pages > 12:
        warnings.append("Pertimbangkan membagi katalog menjadi beberapa seri agar pembacaan tetap ringan.")
    return PlanStructureResponse(suggested_structure=suggested_structure, warnings=warnings)


def _fallback_suggest_catalog_styles(request: SuggestStylesRequest) -> SuggestStylesResponse:
    catalog_label = "produk" if request.basics.catalog_type == "product" else "layanan"
    tone_label = request.basics.tone.replace("_", " ")
    style_options = [
        CatalogStyleOption(
            style="Minimalist Clean",
            description="Ruang putih lega, fokus pada hierarki informasi dan visual utama.",
            use_case="Cocok untuk brand premium atau presentasi catalog {} yang rapi.".format(catalog_label),
            layout="Grid modular dengan gambar besar dan copy singkat.",
        ),
        CatalogStyleOption(
            style="Editorial Confidence",
            description="Komposisi tegas dengan headline kuat dan narasi yang lebih terarah.",
            use_case="Cocok untuk tone {} yang ingin terasa lebih strategis.".format(tone_label),
            layout="Split layout, text-image rhythm, dan section divider yang jelas.",
        ),
        CatalogStyleOption(
            style="Commercial Impact",
            description="Visual lebih padat dengan blok CTA dan penekanan konversi.",
            use_case="Cocok untuk goal {} yang ingin cepat mengarahkan aksi.".format(request.basics.goal),
            layout="Card-based sections, CTA panel, dan grid penawaran yang mudah di-scan.",
        ),
    ]
    return SuggestStylesResponse(style_options=style_options)


def _classify_image(image: CatalogImageInput, catalog_type: str, fallback_page: int) -> CatalogImageMapping:
    source = "{} {}".format(image.filename or "", image.description or "").lower()
    category = "supporting_image"
    confidence = 0.64
    recommended_pages = [fallback_page]

    if any(keyword in source for keyword in ["cover", "hero", "banner", "utama"]):
        category = "cover_image"
        confidence = 0.93
        recommended_pages = [1]
    elif any(keyword in source for keyword in ["detail", "close", "zoom"]):
        category = "detail_image"
        confidence = 0.88
    elif catalog_type == "service" and any(keyword in source for keyword in ["team", "staff", "person", "office"]):
        category = "service_image"
        confidence = 0.87
    elif catalog_type == "product":
        category = "product_image"
        confidence = 0.82

    return CatalogImageMapping(
        image_id=image.image_id,
        category=category,
        confidence=confidence,
        recommended_pages=recommended_pages,
    )


def _fallback_map_catalog_images(request: ImageMappingRequest) -> ImageMappingResponse:
    image_mapping = []
    fallback_page = 2 if len(request.structure) > 1 else 1
    for image in request.images:
        image_mapping.append(_classify_image(image, request.basics.catalog_type, fallback_page))
    return ImageMappingResponse(image_mapping=image_mapping)


def _build_page_copy(page: CatalogPagePlan, request: GenerateCopyRequest) -> CatalogPagePlan:
    business_name = request.basics.business_name or request.business_data.get("business_name") or "brand Anda"
    audience = request.basics.target_audience or request.business_data.get("target_audience") or "audiens yang tepat"
    content = dict(page.content)

    if page.type == "cover":
        content.update(
            {
                "title": content.get("title") or business_name,
                "subtitle": "Presentasi {} untuk {}.".format(request.basics.catalog_type, audience),
            }
        )
    elif page.type == "brand_story":
        content.update(
            {
                "title": content.get("title") or "Kenapa Kami Dipilih",
                "description": "Sorot kualitas, konsistensi, dan alasan utama yang membuat {} relevan bagi {}.".format(business_name, audience),
                "highlights": ["Nilai utama", "Keunggulan pembeda", "Pengalaman yang meyakinkan"],
            }
        )
    elif page.type in ["product_list", "service_list"]:
        label = "produk" if page.type == "product_list" else "layanan"
        content.update(
            {
                "title": content.get("title") or "Pilihan {}".format(label),
                "description": "Susun {} unggulan dengan manfaat utama, harga atau paket, dan visual pendukung.".format(label),
            }
        )
    elif page.type == "problem_solution":
        content.update(
            {
                "title": "Masalah yang Diselesaikan",
                "description": "Tunjukkan konteks masalah klien dan bagaimana {} menyelesaikannya secara terstruktur.".format(business_name),
            }
        )
    elif page.type == "process":
        content.update(
            {
                "title": "Proses Kerja",
                "description": "Pecah tahapan layanan menjadi langkah yang mudah dipahami dan terasa profesional.",
            }
        )
    elif page.type == "pricing":
        content.update(
            {
                "title": "Paket dan Investasi",
                "description": "Jelaskan opsi paket secara ringkas agar calon klien cepat membandingkan dan memilih.",
            }
        )
    elif page.type == "testimonial":
        content.update(
            {
                "title": "Bukti dan Kepercayaan",
                "description": "Masukkan testimoni, hasil, atau indikator kepercayaan yang paling kuat.",
            }
        )
    elif page.type == "cta":
        content.update(
            {
                "title": content.get("title") or "Ambil Langkah Berikutnya",
                "description": "Arahkan pembaca ke aksi yang paling diinginkan: order, konsultasi, atau hubungi sekarang.",
                "cta": "Hubungi Sekarang",
            }
        )

    return CatalogPagePlan(
        page_number=page.page_number,
        type=page.type,
        layout=page.layout,
        content=content,
    )


def _fallback_generate_catalog_copy(request: GenerateCopyRequest) -> GenerateCopyResponse:
    pages = [_build_page_copy(page, request) for page in request.pages]
    missing_data = []
    if not request.basics.business_name and not request.business_data.get("business_name"):
        missing_data.append("business_name")
    return GenerateCopyResponse(pages=pages, missing_data=missing_data)


def _merge_page_copy(
    page: CatalogPagePlan,
    page_copy_lookup: Dict[int, CatalogPagePlan],
    image_mapping_lookup: Dict[int, List[CatalogImageMapping]],
) -> CatalogPagePlan:
    page_copy = page_copy_lookup.get(page.page_number)
    merged_content = dict(page.content)
    if page_copy is not None:
        merged_content.update(page_copy.content)
    mapped_images = image_mapping_lookup.get(page.page_number, [])
    if mapped_images:
        merged_content["image_roles"] = [mapping.model_dump() for mapping in mapped_images]
    return CatalogPagePlan(
        page_number=page.page_number,
        type=page.type,
        layout=page.layout,
        content=merged_content,
    )


def _fallback_finalize_catalog_plan(request: FinalizePlanRequest) -> FinalizePlanResponse:
    page_copy_lookup = {page.page_number: page for page in request.page_copy}
    image_mapping_lookup = {}
    for mapping in request.image_mapping:
        for page_number in mapping.recommended_pages:
            image_mapping_lookup.setdefault(page_number, []).append(mapping)

    pages = [
        _merge_page_copy(page, page_copy_lookup, image_mapping_lookup)
        for page in request.structure
    ]
    return FinalizePlanResponse(
        schema_version="catalog.plan.v1",
        catalog_type=request.basics.catalog_type,
        total_pages=request.basics.total_pages,
        tone=request.basics.tone,
        style=request.selected_style,
        pages=pages,
    )


def _llm_available() -> bool:
    return bool(settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY)


def _get_catalog_client():
    if settings.OPENROUTER_API_KEY:
        return get_genai_client()
    return get_direct_gemini_client()


async def _run_catalog_json_call(system_instruction: str, payload: dict) -> object:
    client = _get_catalog_client()
    response = await asyncio.to_thread(
        call_gemini_with_fallback,
        client=client,
        primary_model=LLM_REASONING_PRIMARY,
        fallback_model=LLM_REASONING_FALLBACK,
        contents=[json.dumps(payload, ensure_ascii=False)],
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.4,
        ),
    )
    return parse_llm_json(response.text)


def _normalize_structure_payload(payload: object, request: CatalogBasicsRequest) -> PlanStructureResponse:
    if not isinstance(payload, dict):
        raise TypeError("Structure payload must be a JSON object")
    structure = payload.get("suggested_structure") or payload.get("pages") or []
    missing_data = payload.get("missing_data") or []
    warnings = payload.get("warnings") or []
    if not isinstance(structure, list):
        raise TypeError("suggested_structure must be a list")
    normalized_pages = []
    for index, item in enumerate(structure, start=1):
        if not isinstance(item, dict):
            continue
        current = dict(item)
        current.setdefault("page_number", index)
        current.setdefault("type", "content")
        current.setdefault("layout", "text-image")
        current.setdefault("content", {})
        normalized_pages.append(CatalogPagePlan.model_validate(current))
    if not normalized_pages:
        raise ValueError("No valid pages returned")
    return PlanStructureResponse(
        suggested_structure=normalized_pages[: request.total_pages],
        missing_data=[str(item) for item in missing_data if isinstance(item, str)],
        warnings=[str(item) for item in warnings if isinstance(item, str)],
    )


def _normalize_style_payload(payload: object) -> SuggestStylesResponse:
    if not isinstance(payload, dict):
        raise TypeError("Style payload must be a JSON object")
    options = payload.get("style_options") or payload.get("styles") or []
    if not isinstance(options, list):
        raise TypeError("style_options must be a list")
    normalized = []
    for item in options[:3]:
        if not isinstance(item, dict):
            continue
        normalized.append(CatalogStyleOption.model_validate(item))
    if len(normalized) != 3:
        raise ValueError("Expected exactly 3 style options")
    return SuggestStylesResponse(style_options=normalized)


def _normalize_image_mapping_payload(payload: object) -> ImageMappingResponse:
    if not isinstance(payload, dict):
        raise TypeError("Image mapping payload must be a JSON object")
    mappings = payload.get("image_mapping") or payload.get("mappings") or []
    warnings = payload.get("warnings") or []
    unassigned = payload.get("unassigned_images") or []
    if not isinstance(mappings, list):
        raise TypeError("image_mapping must be a list")
    normalized = []
    for item in mappings:
        if not isinstance(item, dict):
            continue
        normalized.append(CatalogImageMapping.model_validate(item))
    return ImageMappingResponse(
        image_mapping=normalized,
        unassigned_images=[str(item) for item in unassigned if isinstance(item, (str, int))],
        warnings=[str(item) for item in warnings if isinstance(item, str)],
    )


def _normalize_copy_payload(payload: object, request: GenerateCopyRequest) -> GenerateCopyResponse:
    if not isinstance(payload, dict):
        raise TypeError("Copy payload must be a JSON object")
    pages = payload.get("pages") or payload.get("page_copy") or []
    missing_data = payload.get("missing_data") or []
    warnings = payload.get("warnings") or []
    if not isinstance(pages, list):
        raise TypeError("pages must be a list")
    normalized_pages = []
    for index, item in enumerate(pages, start=1):
        if not isinstance(item, dict):
            continue
        current = dict(item)
        current.setdefault("page_number", request.pages[index - 1].page_number if index - 1 < len(request.pages) else index)
        current.setdefault("type", request.pages[index - 1].type if index - 1 < len(request.pages) else "content")
        current.setdefault("layout", request.pages[index - 1].layout if index - 1 < len(request.pages) else "text-image")
        current.setdefault("content", {})
        normalized_pages.append(CatalogPagePlan.model_validate(current))
    return GenerateCopyResponse(
        pages=normalized_pages,
        missing_data=[str(item) for item in missing_data if isinstance(item, str)],
        warnings=[str(item) for item in warnings if isinstance(item, str)],
    )


def _normalize_finalize_payload(payload: object, request: FinalizePlanRequest) -> FinalizePlanResponse:
    if not isinstance(payload, dict):
        raise TypeError("Finalize payload must be a JSON object")
    pages = payload.get("pages") or []
    missing_data = payload.get("missing_data") or []
    style = payload.get("style") or request.selected_style
    schema_version = payload.get("schema_version") or "catalog.plan.v1"
    if not isinstance(pages, list):
        raise TypeError("pages must be a list")
    normalized_pages = []
    for index, item in enumerate(pages, start=1):
        if not isinstance(item, dict):
            continue
        current = dict(item)
        current.setdefault("page_number", request.structure[index - 1].page_number if index - 1 < len(request.structure) else index)
        current.setdefault("type", request.structure[index - 1].type if index - 1 < len(request.structure) else "content")
        current.setdefault("layout", request.structure[index - 1].layout if index - 1 < len(request.structure) else "text-image")
        current.setdefault("content", {})
        normalized_pages.append(CatalogPagePlan.model_validate(current))
    return FinalizePlanResponse(
        schema_version=str(schema_version),
        catalog_type=request.basics.catalog_type,
        total_pages=request.basics.total_pages,
        tone=request.basics.tone,
        style=str(style),
        pages=normalized_pages,
        missing_data=[str(item) for item in missing_data if isinstance(item, str)],
    )


async def plan_catalog_structure(request: CatalogBasicsRequest) -> PlanStructureResponse:
    fallback = _fallback_plan_catalog_structure(request)
    if not _llm_available():
        return fallback

    payload = {
        "catalog_type": request.catalog_type,
        "total_pages": request.total_pages,
        "goal": request.goal,
        "tone": request.tone,
        "target_audience": request.target_audience,
        "language": request.language,
        "business_name": request.business_name,
        "business_context": request.business_context,
    }
    system_instruction = (
        "You are an AI catalog planner. Return JSON only with keys suggested_structure, missing_data, warnings. "
        "Each page must contain page_number, type, layout, and content. Keep the output practical for Indonesian catalog design workflows."
    )
    try:
        result = await _run_catalog_json_call(system_instruction, payload)
        return _normalize_structure_payload(result, request)
    except Exception:
        logger.exception("Catalog structure fallback activated")
        return fallback


async def suggest_catalog_styles(request: SuggestStylesRequest) -> SuggestStylesResponse:
    fallback = _fallback_suggest_catalog_styles(request)
    if not _llm_available():
        return fallback

    payload = {
        "basics": request.basics.model_dump(),
        "structure": [page.model_dump() for page in request.structure],
    }
    system_instruction = (
        "You are an AI art director for catalogs. Return JSON only with key style_options containing exactly 3 objects. "
        "Each object must contain style, description, use_case, and layout."
    )
    try:
        result = await _run_catalog_json_call(system_instruction, payload)
        return _normalize_style_payload(result)
    except Exception:
        logger.exception("Catalog styles fallback activated")
        return fallback


async def map_catalog_images(request: ImageMappingRequest) -> ImageMappingResponse:
    fallback = _fallback_map_catalog_images(request)
    if not _llm_available():
        return fallback

    payload = {
        "basics": request.basics.model_dump(),
        "structure": [page.model_dump() for page in request.structure],
        "images": [image.model_dump() for image in request.images],
    }
    system_instruction = (
        "You classify catalog assets. Return JSON only with keys image_mapping, unassigned_images, warnings. "
        "Each image_mapping item must contain image_id, category, confidence, recommended_pages."
    )
    try:
        result = await _run_catalog_json_call(system_instruction, payload)
        normalized = _normalize_image_mapping_payload(result)
        return normalized if normalized.image_mapping else fallback
    except Exception:
        logger.exception("Catalog image mapping fallback activated")
        return fallback


async def generate_catalog_copy(request: GenerateCopyRequest) -> GenerateCopyResponse:
    fallback = _fallback_generate_catalog_copy(request)
    if not _llm_available():
        return fallback

    payload = {
        "basics": request.basics.model_dump(),
        "selected_style": request.selected_style,
        "pages": [page.model_dump() for page in request.pages],
        "business_data": request.business_data,
    }
    system_instruction = (
        "You write conversion-focused catalog copy. Return JSON only with keys pages, missing_data, warnings. "
        "Each page must contain page_number, type, layout, and content."
    )
    try:
        result = await _run_catalog_json_call(system_instruction, payload)
        normalized = _normalize_copy_payload(result, request)
        return normalized if normalized.pages else fallback
    except Exception:
        logger.exception("Catalog copy fallback activated")
        return fallback


async def finalize_catalog_plan(request: FinalizePlanRequest) -> FinalizePlanResponse:
    fallback = _fallback_finalize_catalog_plan(request)
    if not _llm_available():
        return fallback

    payload = {
        "basics": request.basics.model_dump(),
        "selected_style": request.selected_style,
        "structure": [page.model_dump() for page in request.structure],
        "image_mapping": [mapping.model_dump() for mapping in request.image_mapping],
        "page_copy": [page.model_dump() for page in request.page_copy],
        "overrides": request.overrides,
    }
    system_instruction = (
        "You assemble the final catalog JSON plan. Return JSON only with keys schema_version, style, pages, missing_data. "
        "Each page must preserve page_number, type, layout, and content."
    )
    try:
        result = await _run_catalog_json_call(system_instruction, payload)
        normalized = _normalize_finalize_payload(result, request)
        return normalized if normalized.pages else fallback
    except Exception:
        logger.exception("Catalog final plan fallback activated")
        return fallback
