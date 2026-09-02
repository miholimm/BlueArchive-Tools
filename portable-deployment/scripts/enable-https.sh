#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

skip_certificate=false

while (($#)); do
  case $1 in
    --skip-certificate)
      skip_certificate=true
      shift
      ;;
    -h|--help)
      printf '用法：sudo %s [--skip-certificate]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

load_config
require_live_domain
[[ $TRUST_PROXY == true ]] || fail 'HTTPS 反向代理部署要求 TRUST_PROXY=true'
require_command nginx
require_command certbot
require_command systemctl

http_config="/etc/nginx/sites-available/$APP_NAME"
enabled_config="/etc/nginx/sites-enabled/$APP_NAME"
certificate_dir="/etc/letsencrypt/live/$DOMAIN"
template=$(mktemp "${TMPDIR:-/tmp}/blue-archive-https.XXXXXX")
http_template=
config_backup=
link_target=
config_existed=false
link_existed=false

cleanup() {
  [[ -n $template ]] && rm -f -- "$template"
  [[ -n $http_template ]] && rm -f -- "$http_template"
  [[ -n $config_backup ]] && as_root rm -f -- "$config_backup"
}

rollback() {
  local code=$?
  if [[ $config_existed == true && -n $config_backup && -f $config_backup ]]; then
    as_root install -o root -g root -m 644 "$config_backup" "$http_config" || true
  elif [[ $config_existed == false ]]; then
    as_root rm -f -- "$http_config" || true
  fi
  if [[ $link_existed == true && -n $link_target ]]; then
    as_root ln -sfn "$link_target" "$enabled_config" || true
  elif [[ $link_existed == false ]]; then
    as_root rm -f -- "$enabled_config" || true
  fi
  as_root nginx -t >/dev/null 2>&1 && as_root systemctl reload nginx || true
  cleanup
  exit "$code"
}

trap rollback ERR
trap cleanup EXIT

if [[ -f $http_config ]]; then
  grep -Fq "server_name $DOMAIN;" "$http_config" || fail "拒绝覆盖不属于 $DOMAIN 的 Nginx 配置：$http_config"
  config_backup=$(mktemp "${TMPDIR:-/tmp}/blue-archive-nginx-backup.XXXXXX")
  as_root cp -- "$http_config" "$config_backup"
  config_existed=true
fi
if [[ -L $enabled_config ]]; then
  link_target=$(readlink "$enabled_config")
  [[ $link_target == "$http_config" ]] || fail "拒绝覆盖指向其他站点的 Nginx 软链接：$enabled_config"
  link_existed=true
elif [[ -e $enabled_config ]]; then
  fail "拒绝覆盖非软链接的 Nginx 启用配置：$enabled_config"
fi

if [[ $skip_certificate == false ]]; then
  as_root install -d -o root -g root -m 755 /var/www/certbot
  http_template=$(mktemp "${TMPDIR:-/tmp}/blue-archive-http.XXXXXX")
  render_template "$KIT_DIR/nginx/site-http.conf.template" "$http_template"
  as_root install -o root -g root -m 644 "$http_template" "$http_config"
  as_root ln -sfn "$http_config" "$enabled_config"
  as_root nginx -t
  as_root systemctl reload nginx
  as_root certbot certonly --webroot --webroot-path /var/www/certbot --domain "$DOMAIN" --email "$CERTBOT_EMAIL" --agree-tos --non-interactive --keep-until-expiring
fi

[[ -f $certificate_dir/fullchain.pem && -f $certificate_dir/privkey.pem ]] || fail "未找到 $DOMAIN 的证书；确认 DNS 已指向当前服务器并且 80 端口可访问"
render_template "$KIT_DIR/nginx/site-https.conf.template" "$template"
as_root install -o root -g root -m 644 "$template" "$http_config"
as_root ln -sfn "$http_config" "$enabled_config"
as_root nginx -t
as_root systemctl reload nginx
wait_for_http "https://$DOMAIN/api/content"
trap - ERR
cleanup
log "HTTPS 已启用：https://$DOMAIN"
log '请确认系统已启用 certbot.timer 或 certbot 的定时续期任务。'
