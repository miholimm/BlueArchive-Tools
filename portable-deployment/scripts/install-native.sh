#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

source_dir=$DEFAULT_SOURCE_DIR
with_nginx=false

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
    -h|--help)
      printf '用法：sudo %s [--source <项目源码目录>] [--with-nginx]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

load_config
require_node_22
require_command tar
require_command systemctl
require_command getent
require_command groupadd
require_command useradd
require_command curl

if [[ $with_nginx == true ]]; then
  require_command nginx
  require_live_domain
  [[ $TRUST_PROXY == true ]] || fail '使用 --with-nginx 时 TRUST_PROXY 必须为 true'
  if [[ -L /etc/nginx/sites-enabled/$APP_NAME ]]; then
    existing_target=$(readlink /etc/nginx/sites-enabled/$APP_NAME)
    [[ $existing_target == "/etc/nginx/sites-available/$APP_NAME" ]] || fail "拒绝覆盖指向其他站点的 Nginx 软链接：/etc/nginx/sites-enabled/$APP_NAME"
  elif [[ -e /etc/nginx/sites-enabled/$APP_NAME ]]; then
    fail "拒绝覆盖非软链接的 Nginx 启用配置：/etc/nginx/sites-enabled/$APP_NAME"
  fi
  if [[ -f /etc/nginx/sites-available/$APP_NAME ]]; then
    grep -Fq "server_name $DOMAIN;" "/etc/nginx/sites-available/$APP_NAME" || fail "拒绝覆盖不属于 $DOMAIN 的 Nginx 配置：/etc/nginx/sites-available/$APP_NAME"
  fi
fi

node_bin=$(command -v node)
source_dir=$(require_source_root "$source_dir")
release_id=$(date -u +%Y%m%d%H%M%S)-$$
release_dir="$APP_DIR/releases/$release_id"
previous_target=
had_current=false
env_temp=
service_temp=
nginx_temp=
nginx_backup=
nginx_target="/etc/nginx/sites-available/$APP_NAME"
nginx_link="/etc/nginx/sites-enabled/$APP_NAME"
nginx_created=false

if [[ -L $APP_DIR/current ]]; then
  previous_target=$(readlink -f "$APP_DIR/current" || true)
  [[ -n $previous_target && -d $previous_target ]] || fail "$APP_DIR/current 指向无效的发布目录"
  had_current=true
elif [[ -e $APP_DIR/current ]]; then
  fail "$APP_DIR/current 必须是软链接或不存在"
fi

cleanup() {
  [[ -n $env_temp ]] && rm -f -- "$env_temp"
  [[ -n $service_temp ]] && rm -f -- "$service_temp"
  [[ -n $nginx_temp ]] && rm -f -- "$nginx_temp"
  [[ -n $nginx_backup ]] && as_root rm -f -- "$nginx_backup"
}

rollback() {
  local code=$?
  if [[ -n $nginx_backup && -f $nginx_backup ]]; then
    as_root install -o root -g root -m 644 "$nginx_backup" "$nginx_target" || true
  elif [[ $nginx_created == true ]]; then
    as_root rm -f -- "$nginx_link" "$nginx_target" || true
  fi
  if [[ -n $nginx_backup || $nginx_created == true ]]; then
    as_root nginx -t >/dev/null 2>&1 && as_root systemctl reload nginx || true
  fi
  if [[ $had_current == true && -n $previous_target ]]; then
    as_root ln -sfn "$previous_target" "$APP_DIR/current"
    as_root systemctl restart "$APP_NAME" || true
  else
    as_root systemctl stop "$APP_NAME" || true
    as_root rm -f -- "$APP_DIR/current" || true
  fi
  cleanup
  exit "$code"
}
trap rollback ERR
trap cleanup EXIT

if ! getent group "$DEPLOY_GROUP" >/dev/null 2>&1; then
  as_root groupadd --system "$DEPLOY_GROUP"
fi
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  as_root useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin --gid "$DEPLOY_GROUP" "$DEPLOY_USER"
fi

as_root install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 750 "$APP_DIR" "$APP_DIR/releases" "$DATA_DIR"
as_root install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 750 "$release_dir"

stream_application_source "$source_dir" | as_root tar -C "$release_dir" -xf -
as_root chown -R "$DEPLOY_USER:$DEPLOY_GROUP" "$release_dir"

as_app_user "$DEPLOY_USER" "$node_bin" --version >/dev/null
as_app_user "$DEPLOY_USER" env HOME="$APP_DIR" COREPACK_HOME="$APP_DIR/.cache/corepack" corepack pnpm --dir "$release_dir" install --frozen-lockfile
as_app_user "$DEPLOY_USER" env HOME="$APP_DIR" COREPACK_HOME="$APP_DIR/.cache/corepack" VITE_UMAMI_URL="$VITE_UMAMI_URL" VITE_UMAMI_WEBSITE_ID="$VITE_UMAMI_WEBSITE_ID" corepack pnpm --dir "$release_dir" run build
as_app_user "$DEPLOY_USER" env HOME="$APP_DIR" COREPACK_HOME="$APP_DIR/.cache/corepack" corepack pnpm --dir "$release_dir" prune --prod

env_temp=$(mktemp "${TMPDIR:-/tmp}/blue-archive-app-env.XXXXXX")
write_application_env "$env_temp"
as_root install -o root -g "$DEPLOY_GROUP" -m 640 "$env_temp" "$APP_DIR/.env"
rm -f -- "$env_temp"
env_temp=

service_temp=$(mktemp "${TMPDIR:-/tmp}/blue-archive-service.XXXXXX")
render_template "$KIT_DIR/systemd/blue-archive.service.template" "$service_temp" "$node_bin"
as_root install -o root -g root -m 644 "$service_temp" "/etc/systemd/system/$APP_NAME.service"
rm -f -- "$service_temp"
service_temp=

as_root ln -sfn "$release_dir" "$APP_DIR/current"
as_root systemctl daemon-reload
as_root systemctl enable --now "$APP_NAME"
wait_for_http "http://127.0.0.1:$APP_PORT/api/content"

if [[ $with_nginx == true ]]; then
  nginx_temp=$(mktemp "${TMPDIR:-/tmp}/blue-archive-nginx.XXXXXX")
  if [[ -f $nginx_target ]]; then
    nginx_backup=$(mktemp "${TMPDIR:-/tmp}/blue-archive-nginx-backup.XXXXXX")
    as_root cp -- "$nginx_target" "$nginx_backup"
  else
    nginx_created=true
  fi
  render_template "$KIT_DIR/nginx/site-http.conf.template" "$nginx_temp"
  as_root install -o root -g root -m 644 "$nginx_temp" "$nginx_target"
  as_root ln -sfn "$nginx_target" "$nginx_link"
  as_root nginx -t
  as_root systemctl reload nginx
  rm -f -- "$nginx_temp"
  nginx_temp=
  [[ -n $nginx_backup ]] && as_root rm -f -- "$nginx_backup"
  nginx_backup=
fi

trap - ERR
cleanup
log "非 Docker 部署完成：$APP_DIR/current"
log "服务状态：systemctl status $APP_NAME"
