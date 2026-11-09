#!/usr/bin/env bash
# Gera um .zip datado do código-fonte em BACKUPS/ (sem node_modules, builds e segredos).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$ROOT/BACKUPS"
cd "$ROOT"
zip -rq "BACKUPS/nao-esquece-adv_${STAMP}.zip" . \
  -x "node_modules/*" "*/node_modules/*" "*/.next/*" "*/out/*" "*/dist/*" \
     "BACKUPS/*" ".git/*" "*.env" "*/.env" "*.DS_Store" "*/uploads/*"
echo "Backup criado: BACKUPS/nao-esquece-adv_${STAMP}.zip"
