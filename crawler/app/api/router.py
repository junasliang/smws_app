from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.scan import router as scan_router
from app.api.routes.whiskies import router as whiskies_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(whiskies_router)
api_router.include_router(scan_router)
