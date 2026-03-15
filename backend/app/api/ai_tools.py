from fastapi import APIRouter

from .ai_tools_routers.background import router as bg_router
from .ai_tools_routers.enhancement import router as enh_router
from .ai_tools_routers.creative import router as cre_router

router = APIRouter()

# Include sub-routers into the main ai_tools router
# Tags and prefixes are already handled in the main api.py or can be set here.
router.include_router(bg_router)
router.include_router(enh_router)
router.include_router(cre_router)
