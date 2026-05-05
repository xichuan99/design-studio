from typing import Dict, List, TypedDict


PLAN_TIER_STARTER = "starter"
PLAN_TIER_PRO = "pro"
PLAN_TIER_BUSINESS = "business"

MODEL_TIER_AUTO = "auto"
MODEL_TIER_BASIC = "basic"
MODEL_TIER_PRO = "pro"
MODEL_TIER_ULTRA = "ultra"


class ModelCatalogItem(TypedDict):
    tier: str
    label: str
    description: str
    min_plan_tier: str
    supported_tools: List[str]


PLAN_TIER_RANK: Dict[str, int] = {
    PLAN_TIER_STARTER: 1,
    PLAN_TIER_PRO: 2,
    PLAN_TIER_BUSINESS: 3,
}

MODEL_CATALOG: List[ModelCatalogItem] = [
    {
        "tier": MODEL_TIER_AUTO,
        "label": "Auto",
        "description": "Pilih model otomatis sesuai akses paket dan kebutuhan hasil.",
        "min_plan_tier": PLAN_TIER_STARTER,
        "supported_tools": ["create_design", "redesign"],
    },
    {
        "tier": MODEL_TIER_BASIC,
        "label": "Basic",
        "description": "Cepat dan hemat untuk kebutuhan konten rutin.",
        "min_plan_tier": PLAN_TIER_STARTER,
        "supported_tools": ["create_design", "redesign"],
    },
    {
        "tier": MODEL_TIER_PRO,
        "label": "Pro",
        "description": "Kualitas detail tinggi untuk kebutuhan komersial harian.",
        "min_plan_tier": PLAN_TIER_PRO,
        "supported_tools": ["create_design", "redesign"],
    },
    {
        "tier": MODEL_TIER_ULTRA,
        "label": "Ultra",
        "description": "Kualitas premium untuk campaign prioritas tinggi.",
        "min_plan_tier": PLAN_TIER_BUSINESS,
        "supported_tools": ["create_design", "redesign", "background_swap", "product_scene", "magic_eraser"],
    },
]


def is_model_accessible(plan_tier: str, min_plan_tier: str) -> bool:
    return PLAN_TIER_RANK.get(plan_tier, 1) >= PLAN_TIER_RANK.get(min_plan_tier, 99)


def default_model_tier_for_plan(plan_tier: str) -> str:
    if plan_tier == PLAN_TIER_BUSINESS:
        return MODEL_TIER_PRO
    if plan_tier == PLAN_TIER_PRO:
        return MODEL_TIER_PRO
    return MODEL_TIER_BASIC
