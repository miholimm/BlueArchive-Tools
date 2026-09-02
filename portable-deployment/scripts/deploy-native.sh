#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

source_dir=$DEFAULT_SOURCE_DIR
with_nginx=false
with_https=false
install_node=false

while (($#)); do
  case $1 in
    --source)
      source_dir=${2:?--source 需要目录参数}
      shift 2
      ;;
    --with-nginx)
      with_nginx=true
      shift
      ;;
    --with-https)
      with_nginx=true
      with_https=true
      shift
      ;;
    --install-node)
      install_node=true
      shift
      ;;
    -h|--help)
      printf '用法：sudo %s [--source <项目源码目录>] [--with-nginx] [--with-https] [--install-node]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

if [[ $install_node == true ]]; then
  [[ -r /etc/os-release ]] || fail '仅支持 Debian 或 Ubuntu 的自动 Node.js 安装'
  . /etc/os-release
  [[ $ID == debian || $ID == ubuntu ]] || fail '仅支持 Debian 或 Ubuntu 的自动 Node.js 安装'
  require_command apt-get
  log '安装 Node.js 22、构建依赖和 systemd 所需工具'
  as_root apt-get update
  as_root apt-get install -y ca-certificates curl build-essential
  curl -fsSL https://deb.nodesource.com/setup_22.x | as_root bash -
  as_root apt-get install -y nodejs
fi

if [[ $with_nginx == true || $with_https == true ]]; then
  require_command apt-get
  as_root apt-get update
  packages=(curl)
  [[ $with_nginx == true ]] && packages+=(nginx)
  [[ $with_https == true ]] && packages+=(certbot)
  as_root apt-get install -y "${packages[@]}"
fi

args=(--source "$source_dir")
[[ $with_nginx == true ]] && args+=(--with-nginx)
"$SCRIPT_DIR/install-native.sh" "${args[@]}"
if [[ $with_https == true ]]; then
  "$SCRIPT_DIR/enable-https.sh"
fi
