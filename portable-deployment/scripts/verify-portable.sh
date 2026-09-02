#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$SCRIPT_DIR/common.sh"

source_dir=$DEFAULT_SOURCE_DIR
skip_build=false

while (($#)); do
  case $1 in
    --source)
      source_dir=${2:?--source 需要目录参数}
      shift 2
      ;;
    --skip-build)
      skip_build=true
      shift
      ;;
    -h|--help)
      printf '用法：%s [--source <项目源码目录>] [--skip-build]\n' "$0"
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

require_command cp
require_command grep
require_command stat
require_command tar
source_dir=$(require_source_root "$source_dir")
temporary=$(mktemp -d "${TMPDIR:-/tmp}/blue-archive-portable-verify.XXXXXX")
cleanup() { rm -rf -- "$temporary"; }
trap cleanup EXIT

copy_portable_static "$temporary"
test_kit="$temporary/$(basename -- "$KIT_DIR")"
chmod +x "$test_kit/scripts/"*.sh

rm -rf -- "$test_kit/source"
staged_source="$test_kit/source"
"$test_kit/scripts/stage-source.sh" --source "$source_dir" --destination "$staged_source"
"$test_kit/scripts/init-config.sh" --domain deploy-check.example.org --admin-user deploycheck --trust-proxy

if [[ $(uname -s) != MINGW* && $(uname -s) != MSYS* && $(uname -s) != CYGWIN* ]]; then
  [[ $(stat -c %a "$test_kit/.env") == 600 ]] || fail '生成的 .env 权限不是 600'
fi
grep -Fxq 'DOMAIN=deploy-check.example.org' "$test_kit/.env" || fail '生成的 DOMAIN 不正确'
grep -Fxq 'TRUST_PROXY=true' "$test_kit/.env" || fail '生成的 TRUST_PROXY 不正确'
"$test_kit/scripts/render-templates.sh" --output "$temporary/rendered" --node-bin /usr/local/bin/node
grep -Fq 'server_name deploy-check.example.org;' "$temporary/rendered/blue-archive-localization.http.conf" || fail 'HTTP 模板渲染失败'
grep -Fq 'proxy_pass http://127.0.0.1:4173;' "$temporary/rendered/blue-archive-localization.https.conf" || fail 'HTTPS 模板渲染失败'
grep -Fq 'ExecStart=/usr/local/bin/node server/server.mjs' "$temporary/rendered/blue-archive-localization.service" || fail 'systemd 模板渲染失败'

[[ -f $staged_source/package.json ]] || fail '暂存源码缺少 package.json'
[[ -f $staged_source/server/server.mjs ]] || fail '暂存源码缺少 server/server.mjs'
[[ -f $staged_source/Dockerfile ]] || fail '暂存源码缺少 Dockerfile'
[[ ! -e $staged_source/.env ]] || fail '暂存源码包含 .env'
[[ ! -e $staged_source/server/data ]] || fail '暂存源码包含运行数据'
[[ ! -e $staged_source/CREDENTIALS.md ]] || fail '暂存源码包含凭据文件'
[[ ! -e $staged_source/HANDOVER.md ]] || fail '暂存源码包含旧交接文档'

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose --env-file "$test_kit/.env" -f "$test_kit/docker-compose.yml" config --quiet
  docker compose --env-file "$test_kit/.env" -f "$test_kit/docker-compose.yml" -f "$test_kit/docker-compose.postgres.yml" config --quiet
fi

if [[ $skip_build == false ]]; then
  require_node_22
  corepack pnpm --dir "$staged_source" install --frozen-lockfile
  corepack pnpm --dir "$staged_source" run build
  corepack pnpm --dir "$staged_source" run test:api
fi

log '便携部署包验证通过'
