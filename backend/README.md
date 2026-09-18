# SMWS Go API

Read-only Cloud Run API for the SQLite catalogue produced by the Python crawler.

## Expected monorepo layout

```text
smws/
├─ crawler/
├─ api/          # this project
├─ frontend/
└─ data/
   └─ smws.db    # crawler output / source of truth
```

## Prepare DB snapshot

From `smws/`:

```bash
cp data/smws.db api/data/smws.db
```

`api/data/smws.db` is intentionally ignored by Git but is NOT ignored by
`.gcloudignore`, so `gcloud run deploy --source .` uploads the DB snapshot.

## Install dependencies

```bash
cd api
go mod tidy
```

## Run locally

```bash
DB_PATH=./data/smws.db go run ./cmd/api
```

Test:

```bash
curl http://localhost:8080/api/v1/health
curl 'http://localhost:8080/api/v1/whiskies/search?q=53.515'
curl http://localhost:8080/api/v1/whiskies/53.515
```

## Deploy to Cloud Run

```bash
gcloud run deploy smws-api \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated
```

The server reads `PORT` from Cloud Run automatically and defaults `DB_PATH` to
`./data/smws.db`.

## API

- `GET /api/v1/health`
- `GET /api/v1/whiskies/search?q=53.515&limit=20`
- `GET /api/v1/whiskies/{cask_no}`

The JSON contract matches the existing FastAPI whisky endpoints. The fuzzy
fallback is a lightweight Levenshtein-based implementation, not a bit-for-bit
port of RapidFuzz `WRatio`.
