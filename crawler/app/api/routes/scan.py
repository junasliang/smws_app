from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.repositories.whisky import WhiskyRepository
from app.schemas.scan import ScanResponse
from app.schemas.whisky import WhiskySummary
from app.services.cask_detection import (
    extract_cask_candidates,
)
from app.services.ocr import (
    OcrService,
    get_ocr_service,
)

router = APIRouter(
    prefix="/scan",
    tags=["scan"],
)

DbSession = Annotated[
    Session,
    Depends(get_db),
]

OcrServiceDep = Annotated[
    OcrService,
    Depends(get_ocr_service),
]

ImageUpload = Annotated[
    UploadFile,
    File(description="Whisky label image"),
]


_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


@router.post(
    "",
    response_model=ScanResponse,
)
def scan_whisky(
    image: ImageUpload,
    db: DbSession,
    ocr_service: OcrServiceDep,
) -> ScanResponse:
    settings = get_settings()

    if image.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported image type",
        )

    # Read only up to max + 1,
    # so a huge upload cannot occupy arbitrary memory.
    image_bytes = image.file.read(settings.ocr_max_image_bytes + 1)

    if len(image_bytes) > settings.ocr_max_image_bytes:
        raise HTTPException(
            status_code=413,
            detail="Image is too large",
        )

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Empty image",
        )

    try:
        ocr_result = ocr_service.recognize(image_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    candidates = extract_cask_candidates(ocr_result.texts)

    if not candidates:
        return ScanResponse(
            status="no_cask",
            matched=False,
            detected_candidates=[],
            ocr_texts=ocr_result.texts,
        )

    repository = WhiskyRepository(db)

    for cask_no in candidates:
        whisky = repository.get_by_cask_no(cask_no)

        if whisky is None:
            continue

        return ScanResponse(
            status="matched",
            matched=True,
            cask_no=whisky.cask_no,
            detected_candidates=candidates,
            ocr_texts=ocr_result.texts,
            whisky=WhiskySummary.model_validate(whisky),
        )

    return ScanResponse(
        status="not_found",
        matched=False,
        detected_candidates=candidates,
        ocr_texts=ocr_result.texts,
    )
