#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

output_dir=$KIT_DIR/backups
docker_mode=false

while (($#)); do
  case $1 in
    --output)
      output_dir=${2:?--output 需要目录参数}
      shift 2
      ;;
    --docker)
      docker_mode=true
      shift
      ;;
    -h|--help)
      printf '用法：%s [--docker] [--output <备份目录>]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

load_config
require_command tar
if [[ $docker_mode == true ]]; then
  data_dir=$KIT_DIR/runtime/data
else
  data_dir=$DATA_DIR
fi
[[ -d $data_dir ]] || fail "运行数据目录不存在：$data_dir"
mkdir -p -- "$output_dir"
chmod 700 "$output_dir"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="$output_dir/$APP_NAME-data-$timestamp.tar.gz"
parent=$(dirname -- "$data_dir")
name=$(basename -- "$data_dir")
tar -C "$parent" -czf "$archive" "$name"
chmod 600 "$archive"
sha256sum "$archive" > "$archive.sha256"
chmod 600 "$archive.sha256"
log "已创建数据备份：$archive"
log '该备份可能包含账号摘要、访客记录和反馈内容，请加密保存。'
