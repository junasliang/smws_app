import asyncio

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.sync import SmwsSyncService


async def main() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        result = await SmwsSyncService(db, settings).run()

    print(
        "SMWS sync finished: "
        f"discovered={result.discovered}, "
        f"created={result.created}, "
        f"updated={result.updated}, "
        f"unchanged={result.unchanged}, "
        f"failed={result.failed}"
    )


if __name__ == "__main__":
    asyncio.run(main())
