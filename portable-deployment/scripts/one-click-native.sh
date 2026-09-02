#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

domain=
admin_user=admin
source_dir=$DEFAULT_SOURCE_DIR
app_port=4173
with_https=true

while (($#)); do
  case $1 in
    --domain)
      domain=${2:?--domain 需要域名参数}
      shift 2
      ;;
    --admin-user)
      admin_user=${2:?--admin-user 需要用户名参数}
      shift 2
      ;;
    --source)
      source_dir=${2:?--source 需要目录参数}
      shift 2
      ;;
    --port)
      app_port=${2:?--port 需要端口参数}
      shift 2
      ;;
    --without-https)
      with_https=false
      shift
      ;;
    -h|--help)
      printf '用法：%s --domain <域名> [--admin-user <用户名>] [--source <项目源码目录>] [--port <端口>] [--without-https]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

source_dir=$(require_source_root "$source_dir")
if [[ -f $KIT_DIR/.env ]]; then
  load_config
  if [[ -n $domain && $domain != $DOMAIN ]]; then
    fail "现有 .env 的 DOMAIN 为 $DOMAIN，拒绝用 --domain $domain 覆盖"
  fi
  domain=$DOMAIN
  if [[ $TRUST_PROXY != true ]]; then
    "$SCRIPT_DIR/set-proxy-trust.sh" true
  fi
else
  [[ -n $domain ]] || fail '首次部署必须提供 --domain'
  args=(--domain "$domain" --admin-user "$admin_user" --port "$app_port" --trust-proxy)
  "$SCRIPT_DIR/init-config.sh" "${args[@]}"
fi

args=(--source "$source_dir" --install-node --with-nginx)
if [[ $with_https == true ]]; then
  args+=(--with-https)
fi

log '开始非 Docker 一键部署'
"$SCRIPT_DIR/deploy-native.sh" "${args[@]}"
