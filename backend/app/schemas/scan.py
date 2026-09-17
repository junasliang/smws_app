from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.whisky import WhiskySummary


class ScanResponse(BaseModel):
    status: Literal[
        "matched",
        "no_cask",
        "not_found",
    ]

    matched: bool
    cask_no: str | None = None

    detected_candidates: list[str] = Field(default_factory=list)

    ocr_texts: list[str] = Field(default_factory=list)

    whisky: WhiskySummary | None = None
