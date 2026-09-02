#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

source_dir=$DEFAULT_SOURCE_DIR
destination=

while (($#)); do
  case $1 in
    --source)
      source_dir=${2:?--source 需要目录参数}
      shift 2
      ;;
    --destination)
      destination=${2:?--destination 需要目录参数}
      shift 2
      ;;
    -h|--help)
      printf '用法：%s --destination <空目录> [--source <项目源码目录>]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

[[ -n $destination ]] || fail "必须提供 --destination"
source_dir=$(require_source_root "$source_dir")
destination_parent=$(dirname -- "$destination")
mkdir -p -- "$destination_parent"
destination_parent=$(cd -- "$destination_parent" && pwd -P)
destination="$destination_parent/$(basename -- "$destination")"
if [[ -e $destination ]]; then
  [[ -z $(find "$destination" -mindepth 1 -maxdepth 1 -print -quit) ]] || fail "目标目录必须为空：$destination"
else
  mkdir -p -- "$destination"
fi
copy_application_source "$source_dir" "$destination"
log "源码已暂存到：$destination"
