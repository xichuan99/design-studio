import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

from app.schemas.layout import LayoutRequest, LayoutResponse
from app.services.optimizer import QuantumOptimizer

# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), "INFO"))
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Allow all CORS for internal microservice communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker/Kubernetes probes."""
    return {"status": "ok", "service": settings.PROJECT_NAME, "version": settings.VERSION}

@app.post(f"{settings.API_V1_STR}/optimize", response_model=LayoutResponse)
async def optimize_layout(request: LayoutRequest):
    """
    Optimizes layout elements using Quantum QAOA.
    Accepts canvas dimensions and elements (pinned and unpinned),
    Returns absolute (x,y) optimized coordinates.
    """
    logger.info(f"Received quantum layout optimization request for {len(request.elements)} elements.")
    optimizer = QuantumOptimizer(request)
    variations, energy, solver_time = optimizer.optimize()
    
    return LayoutResponse(
        variations=variations,
        energy_score=energy,
        solver_time_ms=solver_time
    )

@app.on_event("startup")
async def startup_event():
    """Execute on application startup."""
    logger.info(f"Starting {settings.PROJECT_NAME} version {settings.VERSION}")

