from dataclasses import dataclass
from datetime import date


@dataclass(slots=True)
class ScrapedWhisky:
    source_product_id: str
    source_url: str
    cask_no: str
    name_en: str | None
    name_zh: str | None
    flavor_profile: str | None
    abv: float | None
    age_text: str | None
    age_years: int | None
    distillation_date: date | None
    initial_cask: str | None
    finishing_cask: str | None
    series: str | None
    region: str | None
    price_twd: int | None
    is_available: bool | None
    tasting_notes: str | None
    content_hash: str
