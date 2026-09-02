#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

output_dir=$KIT_DIR/rendered
node_bin=/usr/bin/node

while (($#)); do
  case $1 in
    --output)
      output_dir=${2:?--output 需要目录参数}
      shift 2
      ;;
    --node-bin)
      node_bin=${2:?--node-bin 需要 Node.js 可执行文件路径}
      shift 2
      ;;
    -h|--help)
      printf '用法：%s [--output <目录>] [--node-bin <路径>]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

load_config
require_live_domain
mkdir -p -- "$output_dir"
render_template "$KIT_DIR/nginx/site-http.conf.template" "$output_dir/$APP_NAME.http.conf" "$node_bin"
render_template "$KIT_DIR/nginx/site-https.conf.template" "$output_dir/$APP_NAME.https.conf" "$node_bin"
render_template "$KIT_DIR/systemd/blue-archive.service.template" "$output_dir/$APP_NAME.service" "$node_bin"
chmod 600 "$output_dir/$APP_NAME.service"
log "已生成：$output_dir/$APP_NAME.http.conf"
log "已生成：$output_dir/$APP_NAME.https.conf"
log "已生成：$output_dir/$APP_NAME.service"
