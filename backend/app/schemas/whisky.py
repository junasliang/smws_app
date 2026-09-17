from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class WhiskySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cask_no: str
    name_en: str | None
    name_zh: str | None
    abv: float | None
    age_text: str | None
    age_years: int | None
    region: str | None
    price_twd: int | None
    is_available: bool | None


class WhiskyDetail(WhiskySummary):
    flavor_profile: str | None
    distillation_date: date | None
    initial_cask: str | None
    finishing_cask: str | None
    series: str | None
    tasting_notes: str | None
    source_url: str


class WhiskySearchResponse(BaseModel):
    query: str
    total: int
    items: list[WhiskySummary] = Field(default_factory=list)
