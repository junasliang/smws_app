# SMWS API

FastAPI backend for synchronizing whisky data from the SMWS Taiwan website and
serving a small search API to a React Native / Expo client.

## Responsibilities

- Crawl the SMWS whisky list and product detail pages.
- Normalize and persist whisky data.
- Search by cask number, Chinese name, or English name.
- Tolerate small OCR/name typos with a local fuzzy-search fallback.

## Local setup

```bash
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run python -m app.scripts.sync_smws
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/v1/health
- Search: http://127.0.0.1:8000/api/v1/whiskies/search?q=93.228

## Tests

```bash
uv run pytest
uv run ruff check .
```

## Suggested sync cadence

Start with one sync per day. The crawler intentionally uses a delay between
requests. Before public/production use, review the site's current robots.txt,
terms, and content-redistribution permissions.
