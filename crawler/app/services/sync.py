import asyncio
from dataclasses import dataclass

import httpx
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.repositories.whisky import WhiskyRepository
from app.sources.smws import SmwsClient, SmwsParseError


@dataclass(slots=True)
class SyncResult:
    discovered: int = 0
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    failed: int = 0


class SmwsSyncService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings
        self.repository = WhiskyRepository(db)

    async def run(self) -> SyncResult:
        result = SyncResult()

        async with SmwsClient(self.settings) as client:
            urls = await client.list_detail_urls()
            result.discovered = len(urls)

            for url in urls:
                try:
                    item = await client.fetch_detail(url)
                    _, created, changed = self.repository.upsert(item)
                    if created:
                        result.created += 1
                    elif changed:
                        result.updated += 1
                    else:
                        result.unchanged += 1
                    self.db.commit()
                except (httpx.HTTPError, SmwsParseError, SQLAlchemyError, ValueError):
                    # Keep one malformed/upstream page from aborting the full sync.
                    # A production version should log the URL + traceback to Sentry.
                    self.db.rollback()
                    result.failed += 1

                await asyncio.sleep(self.settings.smws_request_delay_seconds)

        return result
