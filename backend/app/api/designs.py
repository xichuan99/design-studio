from app.core.exceptions import AppException, NotFoundError, ValidationError, InsufficientCreditsError, UnauthorizedError, ForbiddenError, ConflictError, InternalServerError
from app.schemas.error import ERROR_RESPONSES
from fastapi import APIRouter

from .designs_routers.generation import router as gen_router
from .designs_routers.parsing import router as parse_router
from .designs_routers.copywriting import router as copy_router
from .designs_routers.media import router as media_router
from .designs_routers.jobs import router as jobs_router

router = APIRouter()

router.include_router(gen_router)
router.include_router(parse_router)
router.include_router(copy_router)
router.include_router(media_router)
router.include_router(jobs_router)
