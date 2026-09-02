#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

load_config
require_command curl
require_command grep

if (($#)); then
  url=$1
elif [[ $DOMAIN != example.com && $DOMAIN != *.example.com ]]; then
  url="https://$DOMAIN/api/content"
else
  url="http://127.0.0.1:$APP_PORT/api/content"
fi

response=$(curl --fail --silent --show-error --max-time 10 "$url")
grep -Eq '"(news|download|team|status)"' <<<"$response" || fail "健康检查响应不是预期的内容 JSON"
log "健康检查通过：$url"
