from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.whisky import WhiskyRepository
from app.schemas.whisky import WhiskyDetail, WhiskySearchResponse
from app.services.whisky_search import WhiskySearchService

router = APIRouter(prefix="/whiskies", tags=["whiskies"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/search", response_model=WhiskySearchResponse)
def search_whiskies(
    db: DbSession,
    q: Annotated[str, Query(min_length=1, max_length=120)],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> WhiskySearchResponse:
    service = WhiskySearchService(WhiskyRepository(db))
    items = service.search(q, limit=limit)
    return WhiskySearchResponse(query=q, total=len(items), items=items)


@router.get("/{cask_no}", response_model=WhiskyDetail)
def get_whisky(cask_no: str, db: DbSession) -> WhiskyDetail:
    service = WhiskySearchService(WhiskyRepository(db))
    whisky = service.get_by_cask_no(cask_no)
    if whisky is None:
        raise HTTPException(status_code=404, detail="Whisky not found")
    return WhiskyDetail.model_validate(whisky)
