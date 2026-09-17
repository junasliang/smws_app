"""create whiskies table

Revision ID: 0001
Revises:
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "whiskies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_product_id", sa.String(length=64), nullable=False),
        sa.Column("source_url", sa.String(length=512), nullable=False),
        sa.Column("cask_no", sa.String(length=80), nullable=False),
        sa.Column("cask_no_normalized", sa.String(length=80), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=True),
        sa.Column("name_zh", sa.String(length=255), nullable=True),
        sa.Column("flavor_profile", sa.String(length=255), nullable=True),
        sa.Column("abv", sa.Float(), nullable=True),
        sa.Column("age_text", sa.String(length=80), nullable=True),
        sa.Column("age_years", sa.Integer(), nullable=True),
        sa.Column("distillation_date", sa.Date(), nullable=True),
        sa.Column("initial_cask", sa.String(length=512), nullable=True),
        sa.Column("finishing_cask", sa.String(length=512), nullable=True),
        sa.Column("series", sa.String(length=255), nullable=True),
        sa.Column("region", sa.String(length=120), nullable=True),
        sa.Column("price_twd", sa.Integer(), nullable=True),
        sa.Column("is_available", sa.Boolean(), nullable=True),
        sa.Column("tasting_notes", sa.Text(), nullable=True),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("source_product_id"),
        sa.UniqueConstraint("source_url"),
    )
    for column in (
        "source_product_id",
        "cask_no",
        "cask_no_normalized",
        "name_en",
        "name_zh",
        "age_years",
        "series",
        "region",
        "is_available",
        "content_hash",
    ):
        op.create_index(f"ix_whiskies_{column}", "whiskies", [column])


def downgrade() -> None:
    op.drop_table("whiskies")
