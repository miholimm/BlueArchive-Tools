# 蔚蓝档案汉化官网便携部署指南

这个目录是给组员交接和部署使用的独立工具包。它包含脱敏后的应用源码、Docker 部署文件、Linux 手动部署模板、非 Docker 一键脚本、HTTPS 配置脚本、备份脚本和打包脚本。

不要把本目录的 `.env`、`runtime/`、`backups/`、`rendered/` 或旧 `source.previous.*` 快照提交、转发或上传到公开位置。它们可能包含管理员凭据、用户数据、访客记录、反馈内容或实际域名。

## 选择方式

| 方式 | 适合场景 | 主命令 | 持久数据位置 |
| --- | --- | --- | --- |
| Docker | 推荐，环境隔离，升级简单 | `scripts/deploy-docker.sh` | `runtime/data/`，可选 `runtime/postgres/` |
| 手动部署 | 需要逐步审阅每项变更 | 本文“手动部署”章节 | `DATA_DIR` |
| 非 Docker 一键 | Debian/Ubuntu 新服务器 | `scripts/one-click-native.sh` | `DATA_DIR` |

三种方式任选其一。不要让 Docker 和 systemd 同时监听同一个 `APP_PORT`。

## 包内结构

```text
portable-deployment/
  source/                         脱敏后的应用源码，可直接构建
  .env.example                    配置示例，不能直接用于生产
  Dockerfile                      Docker 镜像构建文件
  docker-compose.yml              Docker 应用服务
  docker-compose.postgres.yml     Docker PostgreSQL 可选覆盖文件
  nginx/                          HTTP 与 HTTPS Nginx 模板
  systemd/                        systemd 服务模板
  scripts/                        初始化、部署、证书、备份与打包脚本
  runtime/                        运行期数据，自动生成且不应分享
  backups/                        本地备份，自动生成且不应分享
```

`source/` 只包含构建和运行所需白名单文件。它不包含 `.env`、`server/data/`、日志、证书、SSH 凭据、真实 Nginx/systemd 配置或本机账户信息。

## 部署前检查

所有公网部署都应满足：

- 已拥有一台 Linux 服务器，推荐 Debian 12 或 Ubuntu 24.04。
- 域名 A/AAAA 记录已经指向该服务器。
- 防火墙只开放 `80/tcp` 与 `443/tcp`；应用端口默认只绑定到 `127.0.0.1:4173`。
- 管理员密码、数据库密码、API Key 密钥都使用不同的随机值。
- 管理员、API Key、数据库和 QQ OAuth 密钥不出现在聊天记录、截图、Issue、提交或日志中。

检查压缩包完整性：

```bash
sha256sum -c blue-archive-portable-deployment-*.tar.gz.sha256
```

Windows PowerShell：

```powershell
$checksum = Get-ChildItem -File -Filter 'blue-archive-portable-deployment-*.sha256' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$parts = (Get-Content -LiteralPath $checksum.FullName -Raw).Trim() -split '\s+'
$expected = $parts[0]
$archive = Join-Path $checksum.DirectoryName $parts[-1].TrimStart([char]'*')
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expected -ne $actual) { throw 'SHA-256 校验失败' }
'SHA-256 校验通过'
```

## 初始化配置

在 Linux 解压后的 `portable-deployment/` 目录执行：

```bash
chmod +x scripts/*.sh
./scripts/init-config.sh --domain example.org --admin-user admin
chmod 600 .env
```

脚本会生成 `.env` 并自动写入彼此不同的随机 `ADMIN_PASSWORD`、`API_KEY_SECRET` 与 `POSTGRES_PASSWORD`。密码只保存在这个权限为 `600` 的文件中；部署前应使用受保护的密码管理器记录它们。

查看配置时不要把结果贴到公共渠道：

```bash
sed -n '1,30p' .env
```

常用配置项：

| 变量 | 作用 | 建议 |
| --- | --- | --- |
| `DOMAIN` | 公网域名 | 填不含协议和端口的真实域名 |
| `CERTBOT_EMAIL` | 证书通知邮箱 | 使用可收信地址 |
| `APP_PORT` | 本机应用端口 | 默认 `4173`，避免与其他服务冲突 |
| `APP_DIR` | 非 Docker 安装位置 | 默认 `/opt/blue-archive-localization` |
| `DATA_DIR` | 非 Docker JSON 数据目录 | 默认位于 `APP_DIR/data` |
| `TRUST_PROXY` | 是否信任 Nginx 传递的客户端地址 | 使用 Nginx/HTTPS 时为 `true`，直连时为 `false` |
| `DATABASE_URL` | 外部 PostgreSQL 地址 | 不使用数据库时保持空 |
| `QQ_OAUTH_*` | QQ OAuth 配置 | 未接入时保持空 |
| `VITE_UMAMI_*` | 前端 Umami 埋点 | 不使用时保持空 |

修改域名或端口后，要同步修改 `QQ_OAUTH_REDIRECT_URI`。初始化默认保持 `TRUST_PROXY=false`；使用 Nginx 或 HTTPS 前，执行以下命令显式开启可信反代：

```bash
./scripts/set-proxy-trust.sh true
```

## 验证部署包

在真正部署前，可先执行隔离验证。验证过程不会启动 Docker、systemd、Nginx 或 Certbot；它会在系统临时目录中检查配置生成、模板渲染、脱敏源码白名单、Docker Compose 配置，并默认重新执行应用构建和 API 回归。

```bash
chmod +x scripts/*.sh
./scripts/verify-portable.sh
```

没有 Node.js 或 pnpm 的审核机可跳过构建，但仍应在目标服务器或 CI 中补跑完整验证：

```bash
./scripts/verify-portable.sh --skip-build
```

## Docker 部署

### 基础 JSON 数据部署

安装 Docker Engine 与 Docker Compose v2 后，在部署目录执行：

```bash
./scripts/deploy-docker.sh
```

该脚本会：

1. 使用白名单从应用源码刷新 `source/`。
2. 构建镜像。
3. 创建 `runtime/data/`，保存 JSON 运行数据。
4. 将应用仅绑定到 `127.0.0.1:$APP_PORT`。
5. 通过 `/api/content` 做本机健康检查。

如果部署包已经包含正确的 `source/`，可跳过重新暂存：

```bash
./scripts/deploy-docker.sh --skip-stage
```

查看状态与日志：

```bash
docker compose --env-file .env -f docker-compose.yml ps
docker compose --env-file .env -f docker-compose.yml logs -f app
```

停止应用但保留运行数据：

```bash
docker compose --env-file .env -f docker-compose.yml down
```

不要执行 `docker compose down -v`，本部署包没有 named volume，但这个习惯容易在其他部署中误删数据。

### Docker PostgreSQL 部署

若需要在 Docker 内同时运行 PostgreSQL：

```bash
./scripts/deploy-docker.sh --with-postgres
```

应用的主要内容会写入 PostgreSQL；组员账号、评论、反馈、术语、问答、任务、API Key、审计日志和翻译进度仍会保留在 `runtime/data/`。因此必须同时备份 JSON 数据和 PostgreSQL。

```bash
./scripts/backup.sh --docker
./scripts/backup-postgres.sh
```

## Docker 的 HTTPS

Docker 方式同样建议由宿主机 Nginx 处理 HTTPS，应用容器不直接暴露公网端口。

Debian/Ubuntu 安装 Nginx 与 Certbot：

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot
```

确认 `.env` 中 `DOMAIN` 是真实域名，并先开启可信反代，再执行：

```bash
./scripts/set-proxy-trust.sh true
sudo ./scripts/enable-https.sh
```

证书签发前 DNS 必须指向当前服务器，且 `80/tcp` 可以从公网访问。脚本会先部署 HTTP 配置完成 ACME 验证，再切换 HTTPS 配置并做健康检查。

## 非 Docker 一键部署

这一方式适合全新的 Debian/Ubuntu 服务器。它会生成独立配置、安装 Node.js 22、构建工具、Nginx 和 Certbot，部署 systemd 服务并自动签发 HTTPS：

```bash
chmod +x scripts/*.sh
./scripts/one-click-native.sh --domain example.org --admin-user admin
```

首次执行前确认：

- `DOMAIN` 的 DNS 已生效。
- 服务器的 `80/tcp` 与 `443/tcp` 已开放。
- 当前账号能使用 `sudo`。
- 服务器是 Debian 或 Ubuntu。

若暂不申请证书，可部署 HTTP 反向代理版本：

```bash
./scripts/one-click-native.sh --domain example.org --admin-user admin --without-https
```

服务管理：

```bash
sudo systemctl status blue-archive-localization
sudo systemctl restart blue-archive-localization
sudo journalctl -u blue-archive-localization -f
```

该方式使用以下布局：

```text
/opt/blue-archive-localization/
  current -> releases/<版本目录>
  releases/
  data/
  .env
```

发布新版本会先写入新的 `releases/<版本目录>`，完成依赖安装、构建和健康检查后才切换 `current`。若健康检查失败，脚本会恢复原有链接并尝试重启旧服务。

### 已自行安装 Node.js

已有 Node.js 22、Nginx 和 Certbot 的服务器可使用更短的命令。先确保部署配置启用了可信反代：

```bash
./scripts/set-proxy-trust.sh true
sudo ./scripts/install-native.sh --with-nginx
sudo ./scripts/enable-https.sh
```

`install-native.sh` 不会自动安装系统依赖；它要求系统已有 Node.js 22、Corepack、Nginx、`curl`、`systemd` 和基本 Unix 工具。

## 手动部署

需要逐条审阅操作时，按以下流程进行。以下示例以 `/opt/blue-archive-localization` 和 `bluearchive` 账户为例。

### 1. 安装系统依赖

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl build-essential nginx certbot
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
corepack --version
```

`node --version` 应为 22 或更高版本。

### 2. 创建专用账户与目录

```bash
sudo groupadd --system bluearchive
sudo useradd --system --home /opt/blue-archive-localization --shell /usr/sbin/nologin --gid bluearchive bluearchive
sudo install -d -o bluearchive -g bluearchive -m 750 /opt/blue-archive-localization
sudo install -d -o bluearchive -g bluearchive -m 750 /opt/blue-archive-localization/releases
sudo install -d -o bluearchive -g bluearchive -m 750 /opt/blue-archive-localization/data
```

若用户或组已存在，跳过对应命令。

### 3. 复制并构建应用

将本目录的 `source/` 复制到一个新 release。

```bash
release=/opt/blue-archive-localization/releases/$(date -u +%Y%m%d%H%M%S)
sudo install -d -o bluearchive -g bluearchive -m 750 "$release"
sudo cp -a source/. "$release/"
sudo chown -R bluearchive:bluearchive "$release"
sudo -u bluearchive env HOME=/opt/blue-archive-localization COREPACK_HOME=/opt/blue-archive-localization/.cache/corepack corepack pnpm --dir "$release" install --frozen-lockfile
sudo -u bluearchive env HOME=/opt/blue-archive-localization COREPACK_HOME=/opt/blue-archive-localization/.cache/corepack corepack pnpm --dir "$release" run build
sudo -u bluearchive env HOME=/opt/blue-archive-localization COREPACK_HOME=/opt/blue-archive-localization/.cache/corepack corepack pnpm --dir "$release" prune --prod
sudo ln -sfn "$release" /opt/blue-archive-localization/current
```

### 4. 写入生产环境变量

部署包根目录的 `.env` 是部署配置；应用服务读取的是 `/opt/blue-archive-localization/.env`。不要把部署配置模板直接复制给应用。先由 `init-config.sh` 创建部署配置，再按它生成应用环境文件：

```bash
source scripts/common.sh
load_config
tmp=$(mktemp)
write_application_env "$tmp"
sudo install -o root -g bluearchive -m 640 "$tmp" /opt/blue-archive-localization/.env
rm -f "$tmp"
```

生成后的应用环境文件包含正确的 `NODE_ENV`、`HOST`、`PORT`、`DATA_DIR`、管理员密码和 API Key 密钥。使用 Nginx 时，确认其中 `TRUST_PROXY=true`。

### 5. 安装 systemd 服务

先按 `.env` 实际值渲染模板：

```bash
./scripts/render-templates.sh --output rendered --node-bin "$(command -v node)"
sudo install -m 644 rendered/blue-archive-localization.service /etc/systemd/system/blue-archive-localization.service
sudo systemctl daemon-reload
sudo systemctl enable --now blue-archive-localization
curl -fsS http://127.0.0.1:4173/api/content > /dev/null
```

### 6. 安装 Nginx 与 HTTPS

先放入 HTTP 配置以签发证书：

```bash
sudo install -m 644 rendered/blue-archive-localization.http.conf /etc/nginx/sites-available/blue-archive-localization
sudo ln -sfn /etc/nginx/sites-available/blue-archive-localization /etc/nginx/sites-enabled/blue-archive-localization
sudo mkdir -p /var/www/certbot
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d example.org
```

证书签发后切换 HTTPS 配置：

```bash
sudo install -m 644 rendered/blue-archive-localization.https.conf /etc/nginx/sites-available/blue-archive-localization
sudo nginx -t
sudo systemctl reload nginx
curl -I https://example.org
```

在手动流程中将 `example.org` 换成实际域名。更推荐直接使用 `sudo ./scripts/enable-https.sh`，它会验证域名和证书文件，减少漏项。

## 更新版本

### Docker

替换或更新 `source/` 后重新执行：

```bash
./scripts/deploy-docker.sh --skip-stage
```

若当前在完整项目源码目录内执行，也可直接：

```bash
./scripts/deploy-docker.sh --source /path/to/BlueArchive-Localization-Web
```

数据仍保留在 `runtime/data/` 和可选的 `runtime/postgres/`。

### 非 Docker

```bash
sudo ./scripts/install-native.sh --with-nginx
sudo ./scripts/enable-https.sh --skip-certificate
```

应用会创建新 release 并切换 `current` 软链接，旧 release 不会自动删除，确认稳定后可手动保留最近几个版本并清理更旧目录。不要删除 `data/` 或 `.env`。

## 备份与恢复

### JSON 数据

非 Docker：

```bash
sudo ./scripts/backup.sh --output /var/backups/blue-archive
```

Docker：

```bash
./scripts/backup.sh --docker --output ./backups
```

恢复前先停止服务，解压到正确的数据目录，再恢复文件属主并启动服务：

```bash
sudo systemctl stop blue-archive-localization
sudo tar -C /opt/blue-archive-localization -xzf /var/backups/blue-archive/blue-archive-localization-data-<时间>.tar.gz
sudo chown -R bluearchive:bluearchive /opt/blue-archive-localization/data
sudo systemctl start blue-archive-localization
```

Docker JSON 恢复时执行 `docker compose ... down`，解压回 `runtime/data/`，再执行 `./scripts/deploy-docker.sh --skip-stage`。

### PostgreSQL

Docker PostgreSQL 备份：

```bash
./scripts/backup-postgres.sh --output ./backups
```

恢复应在停止应用后进行，使用同版本 PostgreSQL 容器执行 `pg_restore`。先在隔离环境验证备份，避免直接覆盖生产数据库。

## 健康检查与日志

```bash
./scripts/healthcheck.sh
./scripts/healthcheck.sh http://127.0.0.1:4173/api/content
```

Docker：

```bash
docker compose --env-file .env -f docker-compose.yml logs -f app
```

非 Docker：

```bash
sudo systemctl status blue-archive-localization
sudo journalctl -u blue-archive-localization -n 200 --no-pager
```

## 重新生成可交接压缩包

在拥有完整项目源码的机器上执行。该脚本会通过白名单刷新 `source/`，排除 `.env`、运行数据、日志、备份和旧源码快照，再生成 SHA-256 校验文件：

Linux、macOS 或 WSL：

```bash
chmod +x scripts/*.sh
./scripts/package-portable.sh --source /path/to/BlueArchive-Localization-Web --output ./release
```

Windows PowerShell：

```powershell
$source = Resolve-Path ..
.\scripts\package-portable.ps1 -Source $source -Output .\release
```

打包后仅分享 `.tar.gz` 或 `.zip` 和对应 `.sha256` 文件。绝不分享 `.env`、`runtime/`、`backups/` 或旧 `source.previous.*` 目录。

## 常见问题

### 页面能打开，但后台无法登录

检查当前运行服务读取的 `.env` 是否是该部署目录的生产 `.env`，然后重启服务。主管理员密码来自 `ADMIN_PASSWORD`，不在 JSON 运行数据中；不要通过删除 `data/` 重置管理员密码。

### Certbot 验证失败

确认域名 DNS 已指向当前服务器，云安全组和本机防火墙放行 `80/tcp`，Nginx 成功加载 HTTP 配置，并且没有其他服务抢占 80 端口。

### 返回 502 Bad Gateway

先检查本机应用健康：

```bash
curl -fsS http://127.0.0.1:4173/api/content
```

再查看 systemd 或 Docker 日志，确认 `APP_PORT` 与 Nginx 配置一致。

### Docker 容器不断重启

检查 `.env` 是否使用了示例占位密码，确认 `ADMIN_PASSWORD` 和 `API_KEY_SECRET` 是不同的随机值：

```bash
docker compose --env-file .env -f docker-compose.yml logs --tail=100 app
```

### 组员误改或泄露了 `.env`

立刻替换管理员密码、API Key 密钥、数据库密码和 QQ OAuth 密钥，重启服务，并在后台吊销已发出的 API Key。仅删除文件不能撤销已经暴露的凭据。

## 安全清单

- [ ] `.env` 权限为 `600`，非 Docker 服务环境文件权限为 `640`。
- [ ] 应用端口只监听 `127.0.0.1`，未直接暴露到公网。
- [ ] Nginx 已启用 HTTPS，HTTP 会跳转到 HTTPS。
- [ ] `TRUST_PROXY=true` 只在可信 Nginx 后使用。
- [ ] 已定期备份 JSON 数据；使用 PostgreSQL 时也已备份数据库。
- [ ] `.env`、运行数据、备份、日志和证书未进入 Git、压缩包或聊天记录。
- [ ] 修改管理员密码、停用账号或删除账号后，旧组员会话已失效。
