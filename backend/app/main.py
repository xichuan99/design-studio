import os
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.designs import router as designs_router
from app.api.templates import router as templates_router
from app.api.projects import router as projects_router
from app.api.users import router as users_router
from app.api.history import router as history_router
from app.api.brand_kits import router as brand_kits_router
from app.api.ai_tools import router as ai_tools_router
from app.api.ad_creator import router as ad_creator_router

from app.core.exceptions import AppException, InternalServerError
from app.schemas.error import ErrorResponse, ErrorDetail
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.logging import StructuredLoggingMiddleware

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

@app.get(
    "/health",
    tags=["Health"],
    summary="Health Check",
    description="Check if the API is running.",
    response_model=dict,
    status_code=200,
)
async def health_check():
    """
    Returns the health status of the API.
    """
    return {"status": "ok"}


# Always mount static files for local dev uploads (fallback when S3 fails)
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")
