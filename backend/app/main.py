import os
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

from app.api.auth import router as auth_router
from app.api.designs import router as designs_router
from app.api.templates import router as templates_router
from app.api.projects import router as projects_router
from app.api.users import router as users_router
from app.api.history import router as history_router
from app.api.brand_kits import router as brand_kits_router
from app.api.ai_tools import router as ai_tools_router
from app.api.ad_creator import router as ad_creator_router
from app.api.template_marketplace import router as template_marketplace_router

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppException, InternalServerError
from app.schemas.error import ErrorResponse, ErrorDetail
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.logging import StructuredLoggingMiddleware
from app.core.logging_config import setup_logging

setup_logging()

# Initialize Sentry if DSN is provided
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.2")),
        profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1")),
    )

# Read version
version_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "VERSION"
)
try:
    with open(version_path, "r") as f:
        __version__ = f.read().strip()
except Exception:
    __version__ = "1.0.0"

tags_metadata = [
    {
        "name": "Authentication",
        "description": "Operations with users and authentications.",
    },
    {
        "name": "Designs",
        "description": "Operations with canvas designs and related tools.",
    },
    {"name": "Templates", "description": "Access to pre-made templates."},
    {"name": "Projects", "description": "Manage user projects and canvases."},
    {"name": "Users", "description": "Manage user accounts and info."},
    {"name": "History", "description": "User activity and generation history."},
    {
        "name": "Brand Kits",
        "description": "Manage user brand assets (colors, typography, logos).",
    },
    {"name": "AI Tools", "description": "General AI tooling operations."},
    {"name": "Health", "description": "Health checks."},
]

app = FastAPI(
    title="Smart Design Studio API",
    description="Backend API for Smart Design Studio - a web-based design tool for Indonesian UMKM.",
    version=__version__,
    contact={
        "name": "Smart Design Studio Team",
    },
    license_info={
        "name": "Proprietary",
    },
    openapi_tags=tags_metadata,
)

# Configure CORS for Next.js frontend
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Ensure no wildcard in allow_origins when allow_credentials=True
if "*" in CORS_ORIGINS:
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = CORS_ORIGINS
    allow_credentials = True

app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=86400"
    return response


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    request_id = getattr(request.state, "request_id", None)

    error_response = ErrorResponse(
        error=ErrorDetail(error_code=exc.error_code, detail=exc.detail),
        request_id=request_id,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(),
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)

    errors = exc.errors()
    detail = "Validation error"
    if errors:
        first_err = errors[0]
        loc = ".".join([str(x) for x in first_err.get("loc", [])])
        msg = first_err.get("msg", "")
        if loc:
            detail = f"Validation failed at '{loc}': {msg}"
        else:
            detail = f"Validation failed: {msg}"

    error_response = ErrorResponse(
        error=ErrorDetail(
            error_code="VALIDATION_ERROR",
            detail=detail
        ),
        request_id=request_id,
    )

    return JSONResponse(
        status_code=422,
        content=error_response.model_dump(),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", None)

    error_code = "HTTP_ERROR"
    if exc.status_code == 404:
        error_code = "NOT_FOUND"
    elif exc.status_code == 401:
        error_code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        error_code = "FORBIDDEN"
    elif exc.status_code == 405:
        error_code = "METHOD_NOT_ALLOWED"

    error_response = ErrorResponse(
        error=ErrorDetail(error_code=error_code, detail=str(exc.detail)),
        request_id=request_id,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(),
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Fallback for unhandled exceptions
    request_id = getattr(request.state, "request_id", None)

    # Optional: Log the full traceback here or let structured logging/Sentry handle it.

    internal_exc = InternalServerError(detail="An unexpected error occurred.")

    error_response = ErrorResponse(
        error=ErrorDetail(
            error_code=internal_exc.error_code, detail=internal_exc.detail
        ),
        request_id=request_id,
    )

    return JSONResponse(
        status_code=internal_exc.status_code,
        content=error_response.model_dump(),
        headers=internal_exc.headers,
    )


app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(designs_router, prefix="/api/designs", tags=["Designs"])
app.include_router(templates_router, prefix="/api/templates", tags=["Templates"])
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(history_router, prefix="/api/history", tags=["History"])
app.include_router(brand_kits_router, prefix="/api/brand-kits", tags=["Brand Kits"])
app.include_router(ai_tools_router, prefix="/api/tools", tags=["AI Tools"])
app.include_router(ad_creator_router, prefix="/api/ad-creator", tags=["Ad Creator"])
app.include_router(template_marketplace_router, prefix="/api", tags=["Template Marketplace"])

@app.get(
    "/health",
    tags=["Health"],
    summary="Health Check",
    description="Check if the API is running.",
    response_model=dict,
    status_code=200,
)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Returns the health status of the API and its database connection.
    """
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected", "detail": str(e)}
        )

    return {"status": "ok", "database": db_status}


# Always mount static files for local dev uploads (fallback when S3 fails)
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")
