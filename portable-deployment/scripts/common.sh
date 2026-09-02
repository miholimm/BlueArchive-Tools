#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
KIT_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd -P)
if [[ -f $KIT_DIR/source/package.json ]]; then
  DEFAULT_SOURCE_DIR=$KIT_DIR/source
else
  DEFAULT_SOURCE_DIR=$(cd -- "$KIT_DIR/.." && pwd -P)
fi

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] error: %s\n' "$*" >&2; exit 1; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1"
}

as_root() {
  if (( EUID == 0 )); then
    "$@"
  else
    sudo "$@"
  fi
}

as_app_user() {
  local user=$1
  shift
  if (( EUID == 0 )); then
    runuser -u "$user" -- "$@"
  else
    sudo -u "$user" -- "$@"
  fi
}

escape_sed() {
  printf '%s' "$1" | sed 's/[\\&|]/\\&/g'
}

validate_identifier() {
  local value=$1
  local label=$2
  [[ $value =~ ^[A-Za-z][A-Za-z0-9_.-]{0,62}$ ]] || fail "$label 只能包含字母、数字、点、下划线和连字符"
}

validate_linux_name() {
  local value=$1
  local label=$2
  [[ $value =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || fail "$label 必须是有效 Linux 用户或组名"
}

validate_port() {
  [[ $1 =~ ^[0-9]+$ ]] && (( $1 >= 1 && $1 <= 65535 )) || fail "APP_PORT 必须是 1-65535 的整数"
}

validate_absolute_path() {
  local value=$1
  local label=$2
  [[ $value =~ ^/[A-Za-z0-9._/-]+$ && $value != / ]] || fail "$label 必须是仅含安全路径字符的非根目录绝对路径"
}

validate_domain() {
  [[ $1 =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ ]] || fail "DOMAIN 必须是有效域名，不要包含协议、端口或路径"
}

validate_email() {
  [[ $1 =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || fail "CERTBOT_EMAIL 必须是有效邮箱地址"
}

validate_secret() {
  local value=$1
  local label=$2
  [[ $value =~ ^[A-Za-z0-9_-]{24,}$ ]] || fail "$label 必须是至少 24 位的 URL 安全随机字符串"
  [[ $value != replace-with-* && $value != change-this-* && $value != your-* ]] || fail "$label 不能保留示例占位值"
}

load_config() {
  local file=${1:-"$KIT_DIR/.env"}
  local line key value
  local -a keys=(
    APP_NAME APP_PORT APP_HOST APP_DIR DEPLOY_USER DEPLOY_GROUP DATA_DIR DOMAIN CERTBOT_EMAIL TRUST_PROXY
    ADMIN_USER ADMIN_PASSWORD API_KEY_SECRET DATABASE_URL DATABASE_SSL
    POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB QQ_OAUTH_APP_ID QQ_OAUTH_APP_SECRET
    QQ_OAUTH_REDIRECT_URI VITE_UMAMI_URL VITE_UMAMI_WEBSITE_ID
  )

  [[ -f $file ]] || fail "未找到配置文件：$file。先执行 scripts/init-config.sh 或复制 .env.example。"
  while IFS= read -r line || [[ -n $line ]]; do
    line=${line%$'\r'}
    [[ -z $line || $line == "#"* ]] && continue
    [[ $line =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]] || fail "配置文件存在无效行：$line"
    key=${BASH_REMATCH[1]}
    value=${BASH_REMATCH[2]}
    local allowed=false
    local known_key
    for known_key in "${keys[@]}"; do
      if [[ $known_key == "$key" ]]; then
        allowed=true
        break
      fi
    done
    [[ $allowed == true ]] || fail "配置文件包含不支持的变量：$key"
    printf -v "$key" '%s' "$value"
    export "$key"
  done < "$file"

  for key in "${keys[@]}"; do
    [[ ${!key+x} ]] || fail "配置文件缺少变量：$key"
  done

  validate_identifier "$APP_NAME" APP_NAME
  validate_port "$APP_PORT"
  [[ $APP_HOST == 127.0.0.1 || $APP_HOST == 0.0.0.0 || $APP_HOST == :: ]] || fail "APP_HOST 仅支持 127.0.0.1、0.0.0.0 或 ::"
  validate_absolute_path "$APP_DIR" APP_DIR
  validate_absolute_path "$DATA_DIR" DATA_DIR
  validate_linux_name "$DEPLOY_USER" DEPLOY_USER
  validate_linux_name "$DEPLOY_GROUP" DEPLOY_GROUP
  validate_domain "$DOMAIN"
  validate_email "$CERTBOT_EMAIL"
  [[ $TRUST_PROXY == true || $TRUST_PROXY == false ]] || fail "TRUST_PROXY 只能是 true 或 false"
  [[ $DATABASE_SSL == true || $DATABASE_SSL == false ]] || fail "DATABASE_SSL 只能是 true 或 false"
  [[ $ADMIN_USER =~ ^[A-Za-z0-9_.-]{3,64}$ ]] || fail "ADMIN_USER 格式无效"
  validate_secret "$ADMIN_PASSWORD" ADMIN_PASSWORD
  validate_secret "$API_KEY_SECRET" API_KEY_SECRET

  for value in "$DATABASE_URL" "$QQ_OAUTH_APP_ID" "$QQ_OAUTH_APP_SECRET" "$QQ_OAUTH_REDIRECT_URI" "$VITE_UMAMI_URL" "$VITE_UMAMI_WEBSITE_ID"; do
    [[ $value != *$'\n'* && $value != *$'\r'* ]] || fail "配置值不能包含换行符"
  done
}

require_live_domain() {
  [[ $DOMAIN != example.com && $DOMAIN != *.example.com ]] || fail "执行 Nginx 或 HTTPS 部署前，请把 DOMAIN 改成真实域名"
}

stage_source_atomically() {
  local source=$1
  local destination=$2
  source=$(require_source_root "$source")
  local parent
  parent=$(dirname -- "$destination")
  mkdir -p -- "$parent"
  parent=$(cd -- "$parent" && pwd -P)
  destination=$parent/$(basename -- "$destination")
  [[ $source != $destination ]] || fail "源码目录和暂存目录不能相同"
  local temporary previous timestamp
  temporary=$(mktemp -d "$parent/.source-stage.XXXXXX")
  copy_application_source "$source" "$temporary"
  if [[ -e $destination ]]; then
    timestamp=$(date -u +%Y%m%d%H%M%S)
    previous="$parent/$(basename -- "$destination").previous.$timestamp"
    mv -- "$destination" "$previous"
    log "保留上一次源码快照：$previous"
  fi
  mv -- "$temporary" "$destination"
}

require_source_root() {
  local source=$1
  [[ -d $source ]] || fail "源码目录不存在：$source"
  source=$(cd -- "$source" && pwd -P)
  [[ -f $source/package.json && -f $source/pnpm-lock.yaml && -f $source/server/server.mjs && -d $source/src ]] || fail "源码目录不完整：$source"
  printf '%s\n' "$source"
}

stream_application_source() {
  local source=$1
  (
    cd -- "$source"
    tar -cf - \
      package.json \
      pnpm-lock.yaml \
      index.html \
      vite.config.ts \
      tailwind.config.js \
      postcss.config.js \
      tsconfig.json \
      tsconfig.app.json \
      tsconfig.node.json \
      src \
      server/lib \
      server/settings.json \
      scripts \
      server/*.mjs
  )
}

copy_application_source() {
  local source=$1
  local destination=$2
  [[ -d $destination ]] || fail "目标目录不存在：$destination"
  [[ -z $(find "$destination" -mindepth 1 -maxdepth 1 -print -quit) ]] || fail "目标目录必须为空：$destination"
  stream_application_source "$source" | tar -C "$destination" -xf -
  cp "$KIT_DIR/Dockerfile" "$destination/Dockerfile"
  cat > "$destination/.dockerignore" <<'EOF'
node_modules
dist
.env
.env.*
server/data
*.log
EOF
}

copy_portable_static() {
  local destination=$1
  [[ -d $destination ]] || fail "目标目录不存在：$destination"
  [[ -z $(find "$destination" -mindepth 1 -maxdepth 1 -print -quit) ]] || fail "目标目录必须为空：$destination"
  local parent name source_destination
  parent=$(dirname -- "$KIT_DIR")
  name=$(basename -- "$KIT_DIR")
  (
    cd -- "$parent"
    tar -cf - \
      "$name/.env.example" \
      "$name/.gitignore" \
      "$name/Dockerfile" \
      "$name/docker-compose.yml" \
      "$name/docker-compose.postgres.yml" \
      "$name/README.md" \
      "$name/nginx" \
      "$name/scripts" \
      "$name/systemd"
  ) | tar -C "$destination" -xf -
  source_destination="$destination/$name/source"
  mkdir -p -- "$source_destination"
  copy_application_source "$KIT_DIR/source" "$source_destination"
}

render_template() {
  local template=$1
  local output=$2
  local node_bin=${3:-/usr/bin/node}
  sed \
    -e "s|__DOMAIN__|$(escape_sed "$DOMAIN")|g" \
    -e "s|__APP_PORT__|$(escape_sed "$APP_PORT")|g" \
    -e "s|__APP_DIR__|$(escape_sed "$APP_DIR")|g" \
    -e "s|__DATA_DIR__|$(escape_sed "$DATA_DIR")|g" \
    -e "s|__DEPLOY_USER__|$(escape_sed "$DEPLOY_USER")|g" \
    -e "s|__DEPLOY_GROUP__|$(escape_sed "$DEPLOY_GROUP")|g" \
    -e "s|__NODE_BIN__|$(escape_sed "$node_bin")|g" \
    "$template" > "$output"
}

write_application_env() {
  local output=$1
  umask 077
  cat > "$output" <<EOF
NODE_ENV=production
HOST=$APP_HOST
PORT=$APP_PORT
TRUST_PROXY=$TRUST_PROXY
DATA_DIR=$DATA_DIR
ADMIN_USER=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASSWORD
API_KEY_SECRET=$API_KEY_SECRET
DATABASE_URL=$DATABASE_URL
DATABASE_SSL=$DATABASE_SSL
QQ_OAUTH_APP_ID=$QQ_OAUTH_APP_ID
QQ_OAUTH_APP_SECRET=$QQ_OAUTH_APP_SECRET
QQ_OAUTH_REDIRECT_URI=$QQ_OAUTH_REDIRECT_URI
EOF
}

require_node_22() {
  require_command node
  local major
  major=$(node -p 'process.versions.node.split(".")[0]')
  [[ $major =~ ^[0-9]+$ ]] && (( major >= 22 )) || fail "需要 Node.js 22 或更新版本，当前版本为 $(node --version)"
  require_command corepack
}

wait_for_http() {
  local url=$1
  local attempts=${2:-30}
  require_command curl
  local attempt
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null; then
      log "健康检查通过：$url"
      return 0
    fi
    sleep 2
  done
  fail "健康检查失败：$url"
}
