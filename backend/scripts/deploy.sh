#!/usr/bin/env bash
set -euo pipefail

API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONOREPO_DIR="$(cd "$API_DIR/.." && pwd)"
SOURCE_DB="${SOURCE_DB:-$MONOREPO_DIR/data/smws.db}"
TARGET_DB="$API_DIR/data/smws.db"

if [[ ! -f "$SOURCE_DB" ]]; then
  echo "Database not found: $SOURCE_DB" >&2
  exit 1
fi

cp "$SOURCE_DB" "$TARGET_DB"

echo "Copied DB snapshot: $SOURCE_DB -> $TARGET_DB"
cd "$API_DIR"

gcloud run deploy smws-api \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated
