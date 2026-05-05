from fastapi import APIRouter, Depends
from typing import List

from app.api.deps import get_current_user
from app.core.model_tiers import (
    MODEL_CATALOG,
    default_model_tier_for_plan,
    is_model_accessible,
)
from app.models.user import User
from app.schemas.model_catalog import ModelCatalogResponse, ModelCatalogResponseItem

router = APIRouter(tags=["Models"])


@router.get("", response_model=ModelCatalogResponse, summary="Get model catalog")
async def get_model_catalog(current_user: User = Depends(get_current_user)) -> ModelCatalogResponse:
    user_plan_tier = current_user.plan_tier or "starter"
    default_tier = default_model_tier_for_plan(user_plan_tier)

    items: List[ModelCatalogResponseItem] = []
    for model in MODEL_CATALOG:
        accessible = is_model_accessible(user_plan_tier, model["min_plan_tier"])
        reason = None
        if not accessible:
            reason = "Upgrade paket untuk membuka tier ini."

        items.append(
            ModelCatalogResponseItem(
                tier=model["tier"],
                label=model["label"],
                description=model["description"],
                supported_tools=model["supported_tools"],
                default_for_user=model["tier"] == default_tier,
                accessible=accessible,
                reason=reason,
            )
        )

    return ModelCatalogResponse(items=items)
