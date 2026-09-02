#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

domain=
admin_user=admin
app_port=4173
force=false
trust_proxy=false

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
    --port)
      app_port=${2:?--port 需要端口参数}
      shift 2
      ;;
    --force)
      force=true
      shift
      ;;
    --trust-proxy)
      trust_proxy=true
      shift
      ;;
    -h|--help)
      printf '用法：%s --domain <域名> [--admin-user <用户名>] [--port <端口>] [--trust-proxy] [--force]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

[[ -n $domain ]] || fail "必须提供 --domain"
validate_domain "$domain"
DOMAIN=$domain
require_live_domain
validate_port "$app_port"
[[ $admin_user =~ ^[A-Za-z0-9_.-]{3,64}$ ]] || fail "管理员用户名格式无效"
require_command od
require_command tr
require_command sed
require_command install

config_file=$KIT_DIR/.env
if [[ -e $config_file && $force != true ]]; then
  fail "配置文件已存在：$config_file。确认要重建时使用 --force。"
fi

generate_secret() {
  od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
}

admin_password=$(generate_secret)
api_key_secret=$(generate_secret)
database_password=$(generate_secret)
tmp_file=$(mktemp "${TMPDIR:-/tmp}/blue-archive-env.XXXXXX")
trap 'rm -f -- "$tmp_file"' EXIT

sed \
  -e "s|^DOMAIN=.*$|DOMAIN=$domain|" \
  -e "s|^CERTBOT_EMAIL=.*$|CERTBOT_EMAIL=admin@$domain|" \
  -e "s|^APP_PORT=.*$|APP_PORT=$app_port|" \
  -e "s|^TRUST_PROXY=.*$|TRUST_PROXY=$trust_proxy|" \
  -e "s|^ADMIN_USER=.*$|ADMIN_USER=$admin_user|" \
  -e "s|^ADMIN_PASSWORD=.*$|ADMIN_PASSWORD=$admin_password|" \
  -e "s|^API_KEY_SECRET=.*$|API_KEY_SECRET=$api_key_secret|" \
  -e "s|^POSTGRES_PASSWORD=.*$|POSTGRES_PASSWORD=$database_password|" \
  -e "s|^QQ_OAUTH_REDIRECT_URI=.*$|QQ_OAUTH_REDIRECT_URI=https://$domain/api/auth/qq/callback|" \
  "$KIT_DIR/.env.example" > "$tmp_file"

install -m 600 "$tmp_file" "$config_file"
log "已创建 $config_file，并生成管理员密码与 API Key 密钥。请通过受保护的 .env 文件保存它们。"
