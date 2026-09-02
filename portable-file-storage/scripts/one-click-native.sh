#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

command -v node >/dev/null
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'
test -f .env || cp .env.example .env
if grep -q 'FILE_STORAGE_ADMIN_PASSWORD=replace-with-a-long-password' .env; then
  printf 'Edit .env and set FILE_STORAGE_ADMIN_PASSWORD before starting.\n' >&2
  exit 1
fi

npm install --omit=dev
npm run start
