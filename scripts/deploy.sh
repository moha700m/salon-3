#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/../salon-backups}"
mkdir -p "$BACKUP_DIR"

tar \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./.git' \
  --exclude='./.vercel' \
  --exclude='./.env*' \
  -czf "$BACKUP_DIR/salon-$STAMP.tar.gz" .

echo "Backup: $BACKUP_DIR/salon-$STAMP.tar.gz"

npm ci
npm run typecheck
npm run build
npm audit --omit=dev

git status --short
git add -A
git commit -m "Deploy Salon Agent $STAMP" || true
git push origin HEAD

npx vercel deploy --prod
