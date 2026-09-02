#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

value=${1:-}
[[ $value == true || $value == false ]] || fail '用法：scripts/set-proxy-trust.sh <true|false>'
load_config

temporary=$(mktemp "${TMPDIR:-/tmp}/blue-archive-proxy.XXXXXX")
trap 'rm -f -- "$temporary"' EXIT
sed "s|^TRUST_PROXY=.*$|TRUST_PROXY=$value|" "$KIT_DIR/.env" > "$temporary"
install -m 600 "$temporary" "$KIT_DIR/.env"
log "已将 TRUST_PROXY 设置为 $value"
