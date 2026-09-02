#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

source_dir=$DEFAULT_SOURCE_DIR
skip_stage=false
with_postgres=false

while (($#)); do
  case $1 in
    --source)
      source_dir=${2:?--source 需要目录参数}
      shift 2
      ;;
    --skip-stage)
      skip_stage=true
      shift
      ;;
    --with-postgres)
      with_postgres=true
      shift
      ;;
    -h|--help)
      printf '用法：%s [--source <项目源码目录>] [--skip-stage] [--with-postgres]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

load_config
require_command docker
docker compose version >/dev/null 2>&1 || fail '需要 Docker Compose v2'

source_dir=$(require_source_root "$source_dir")
packaged_source=$(cd -- "$KIT_DIR/source" 2>/dev/null && pwd -P || true)
if [[ $skip_stage == false && $source_dir != $packaged_source ]]; then
  stage_source_atomically "$source_dir" "$KIT_DIR/source"
elif [[ ! -f $KIT_DIR/source/package.json ]]; then
  fail '使用 --skip-stage 时必须已有 portable-deployment/source/ 目录'
fi

mkdir -p -- "$KIT_DIR/runtime/data"
chmod 700 "$KIT_DIR/runtime" "$KIT_DIR/runtime/data"
compose_files=(-f "$KIT_DIR/docker-compose.yml")
if [[ $with_postgres == true ]]; then
  validate_secret "$POSTGRES_PASSWORD" POSTGRES_PASSWORD
  validate_identifier "$POSTGRES_USER" POSTGRES_USER
  validate_identifier "$POSTGRES_DB" POSTGRES_DB
  mkdir -p -- "$KIT_DIR/runtime/postgres"
  chmod 700 "$KIT_DIR/runtime/postgres"
  compose_files+=(-f "$KIT_DIR/docker-compose.postgres.yml")
fi

log '构建并启动 Docker 服务'
docker compose --env-file "$KIT_DIR/.env" "${compose_files[@]}" up -d --build --remove-orphans
wait_for_http "http://127.0.0.1:$APP_PORT/api/content"
docker compose --env-file "$KIT_DIR/.env" "${compose_files[@]}" ps
log "Docker 部署完成，应用仅监听 127.0.0.1:$APP_PORT；配置 Nginx 后由 https://$DOMAIN 对外访问。"
