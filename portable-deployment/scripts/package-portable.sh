#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

source_dir=$DEFAULT_SOURCE_DIR
output_dir=$(dirname -- "$KIT_DIR")

while (($#)); do
  case $1 in
    --source)
      source_dir=${2:?--source 需要目录参数}
      shift 2
      ;;
    --output)
      output_dir=${2:?--output 需要目录参数}
      shift 2
      ;;
    -h|--help)
      printf '用法：%s [--source <项目源码目录>] [--output <输出目录>]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

require_command tar
source_dir=$(require_source_root "$source_dir")
output_dir=$(mkdir -p -- "$output_dir" && cd -- "$output_dir" && pwd -P)
packaged_source=$(cd -- "$KIT_DIR/source" 2>/dev/null && pwd -P || true)
if [[ $source_dir != $packaged_source ]]; then
  stage_source_atomically "$source_dir" "$KIT_DIR/source"
fi

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="$output_dir/blue-archive-portable-deployment-$timestamp.tar.gz"
parent=$(dirname -- "$KIT_DIR")
name=$(basename -- "$KIT_DIR")
temporary=$(mktemp -d "${TMPDIR:-/tmp}/blue-archive-portable-package.XXXXXX")
trap 'rm -rf -- "$temporary"' EXIT
copy_portable_static "$temporary"
tar -C "$temporary" -czf "$archive" "$name"
archive_name=$(basename -- "$archive")
(cd -- "$output_dir" && sha256sum "$archive_name" > "$archive_name.sha256")
log "已创建便携部署包：$archive"
log "已创建校验文件：$archive.sha256"
