from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.whisky import Whisky
from app.schemas.source import ScrapedWhisky
from app.services.normalization import normalize_cask_no


class WhiskyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_cask_no(self, cask_no: str) -> Whisky | None:
        normalized = normalize_cask_no(cask_no)
        stmt = select(Whisky).where(Whisky.cask_no_normalized == normalized)
        return self.db.scalar(stmt)

    def search_candidates(self, query: str, limit: int = 100) -> list[Whisky]:
        like = f"%{query.strip()}%"
        normalized = normalize_cask_no(query)

        conditions = [
            Whisky.cask_no.ilike(like),
            Whisky.name_en.ilike(like),
            Whisky.name_zh.ilike(like),
        ]
        if normalized:
            conditions.append(Whisky.cask_no_normalized.ilike(f"%{normalized}%"))

        stmt = select(Whisky).where(or_(*conditions)).limit(limit)
        return list(self.db.scalars(stmt))

    def list_all(self, limit: int = 500) -> list[Whisky]:
        stmt = select(Whisky).limit(limit)
        return list(self.db.scalars(stmt))

    def upsert(self, item: ScrapedWhisky) -> tuple[Whisky, bool, bool]:
        now = datetime.now(UTC)
        stmt = select(Whisky).where(
            Whisky.source_product_id == item.source_product_id
        )
        whisky = self.db.scalar(stmt)
        created = whisky is None
        changed = created or (whisky is not None and whisky.content_hash != item.content_hash)

        if whisky is None:
            whisky = Whisky(
                source_product_id=item.source_product_id,
                source_url=item.source_url,
                cask_no=item.cask_no,
                cask_no_normalized=normalize_cask_no(item.cask_no),
                content_hash=item.content_hash,
                last_seen_at=now,
                created_at=now,
                updated_at=now,
            )
            self.db.add(whisky)

        whisky.last_seen_at = now
        whisky.source_url = item.source_url

        if changed:
            whisky.cask_no = item.cask_no
            whisky.cask_no_normalized = normalize_cask_no(item.cask_no)
            whisky.name_en = item.name_en
            whisky.name_zh = item.name_zh
            whisky.flavor_profile = item.flavor_profile
            whisky.abv = item.abv
            whisky.age_text = item.age_text
            whisky.age_years = item.age_years
            whisky.distillation_date = item.distillation_date
            whisky.initial_cask = item.initial_cask
            whisky.finishing_cask = item.finishing_cask
            whisky.series = item.series
            whisky.region = item.region
            whisky.price_twd = item.price_twd
            whisky.is_available = item.is_available
            whisky.tasting_notes = item.tasting_notes
            whisky.content_hash = item.content_hash
            whisky.updated_at = now

        return whisky, created, changed
