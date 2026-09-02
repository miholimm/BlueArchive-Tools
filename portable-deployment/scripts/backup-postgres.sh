#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

output_dir=$KIT_DIR/backups

while (($#)); do
  case $1 in
    --output)
      output_dir=${2:?--output 需要目录参数}
      shift 2
      ;;
    -h|--help)
      printf '用法：%s [--output <备份目录>]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

load_config
validate_secret "$POSTGRES_PASSWORD" POSTGRES_PASSWORD
validate_identifier "$POSTGRES_USER" POSTGRES_USER
validate_identifier "$POSTGRES_DB" POSTGRES_DB
require_command docker
docker compose version >/dev/null 2>&1 || fail '需要 Docker Compose v2'
mkdir -p -- "$output_dir"
chmod 700 "$output_dir"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="$output_dir/$APP_NAME-postgres-$timestamp.dump"
docker compose --env-file "$KIT_DIR/.env" -f "$KIT_DIR/docker-compose.yml" -f "$KIT_DIR/docker-compose.postgres.yml" exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom > "$archive"
chmod 600 "$archive"
sha256sum "$archive" > "$archive.sha256"
chmod 600 "$archive.sha256"
log "已创建 PostgreSQL 备份：$archive"
