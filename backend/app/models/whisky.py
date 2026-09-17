from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Whisky(Base):
    __tablename__ = "whiskies"

    id: Mapped[int] = mapped_column(primary_key=True)

    source_product_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    source_url: Mapped[str] = mapped_column(String(512), unique=True)

    cask_no: Mapped[str] = mapped_column(String(80), index=True)
    cask_no_normalized: Mapped[str] = mapped_column(String(80), index=True)
    name_en: Mapped[str | None] = mapped_column(String(255), index=True)
    name_zh: Mapped[str | None] = mapped_column(String(255), index=True)

    flavor_profile: Mapped[str | None] = mapped_column(String(255))
    abv: Mapped[float | None] = mapped_column(Float)
    age_text: Mapped[str | None] = mapped_column(String(80))
    age_years: Mapped[int | None] = mapped_column(Integer, index=True)
    distillation_date: Mapped[date | None] = mapped_column(Date)
    initial_cask: Mapped[str | None] = mapped_column(String(512))
    finishing_cask: Mapped[str | None] = mapped_column(String(512))
    series: Mapped[str | None] = mapped_column(String(255), index=True)
    region: Mapped[str | None] = mapped_column(String(120), index=True)

    price_twd: Mapped[int | None] = mapped_column(Integer)
    is_available: Mapped[bool | None] = mapped_column(Boolean, index=True)
    tasting_notes: Mapped[str | None] = mapped_column(Text)

    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
