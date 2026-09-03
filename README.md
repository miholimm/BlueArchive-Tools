# 蔚蓝档案汉化官网

一个面向蔚蓝档案本地化项目的完整官网与管理后台。项目包含公告、下载资源、维护状态、团队成员、剧情资料、翻译反馈、术语库、问答、协作任务、组员权限、API Key 和模块可见性管理。

本仓库只包含可公开的源码、示例数据与通用部署模板。真实密码、API Key、SSH 凭据、运行数据、日志、证书和线上域名配置不应提交到仓库。

## 功能

- 响应式游戏官网首页，支持桌面、平板和手机
- 手机端路由切换回弹动画，并尊重 `prefers-reduced-motion`
- 新闻列表、搜索、分页、Markdown 详情和评论审核
- Android、Windows、iOS、macOS 下载资源卡片
- 单资源下载确认弹窗，不展示无意义的分支选择
- 文件校验信息只向已认证管理员返回和显示
- 九项资源的版本自动比对、状态卡片与管理员强制覆盖
- Schale OS 终端视觉、日间学园与夜间特别行动双主题
- 首页雷达 HUD、状态版本一键复制与相对自动比对时间
- 平台下载工作台、三步安装引导与只读环境自检
- MomoTalk 问答流、剧情全屏剧场、术语 Hover Tip 与剧情立绘配置后台
- 团队成员搜索与职位筛选
- 剧情库、更新日志、安装教程、FAQ、贡献榜和反作弊追踪
- 翻译反馈提交、脱敏公开状态、管理员采纳、回复和拒绝
- 术语库查询与管理员增删改
- 社区问答、投票、回答采纳和 QQ OAuth 身份预留
- 仅管理员可访问的协作工作台和历史归档
- 主管理员创建组员账号、重置密码、停用账号和分配细粒度权限
- 游客可见、仅管理员、关闭三种模块访问策略
- API Key 创建、独立配额、HMAC 摘要存储和吊销
- 登录限速、全局 API 限速、安全响应头和审计日志
- JSON 原子写入与按文件串行更新，避免并发覆盖
- Docker Compose、Nginx、HTTPS 和 systemd 通用部署模板

## 技术栈

- React 19
- TypeScript
- Vite 8
- React Router
- TailwindCSS 3 与项目级 CSS 设计系统
- Express 5
- PostgreSQL 16，可选
- pnpm

## 环境要求

- Node.js 22.12 或更高版本，推荐 Node.js 24
- pnpm 11
- 可选：Docker Engine 与 Docker Compose
- 可选：PostgreSQL 16

启用 Corepack 并准备 pnpm：

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
```

## 快速开始

```bash
git clone https://github.com/BlueArchive-Translation/BlueArchive-Localization-Web.git
cd BlueArchive-Localization-Web
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

PowerShell 下复制环境文件：

```powershell
Copy-Item .env.example .env
pnpm dev
```

启动后访问：

- 前端开发服务器：`http://localhost:5173`
- API 服务：`http://localhost:4173`
- 管理后台：`http://localhost:5173/admin`

`pnpm dev` 会同时启动 Vite 与 Express。Vite 的 `/api` 代理会自动读取 `.env` 中的 `PORT`。

首次启动前必须修改 `.env` 中的管理员密码和 API Key 摘要密钥。不要把 `.env` 提交到 Git。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 同时启动 Vite 与 Express |
| `pnpm dev:web` | 只启动 Vite |
| `pnpm server` | 只启动 Express，生产模式下同时托管 `dist` |
| `pnpm build` | TypeScript 检查并构建生产资源 |
| `pnpm preview` | 预览静态前端构建，不代替完整 API 服务 |
| `pnpm test:api` | 使用临时目录和随机凭据运行隔离 API 回归 |

生产运行：

```bash
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production pnpm server
```

Windows PowerShell：

```powershell
$env:NODE_ENV = "production"
pnpm server
```

## 目录结构

```text
.github/workflows/       GitHub Actions 验证
deploy/nginx/            通用 Nginx HTTP 与 HTTPS 模板
deploy/systemd/          通用 systemd 服务模板
scripts/dev.mjs          前后端一键开发启动器
scripts/api-smoke.mjs    隔离 API 回归测试
server/                  Express 服务端
server/lib/              JSON 原子存储工具
src/components/          可复用界面组件
src/data/                可公开的前端种子数据
src/lib/                 API、内容上下文、访问控制和埋点
src/pages/               路由页面与管理后台
src/styles.css           全站视觉、动画和响应式样式
```

运行期目录 `server/data/` 不在仓库中。服务第一次启动时会从 `src/data/` 与 `server/settings.json` 初始化必要数据。

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `NODE_ENV` | 生产必填 | `development` | 生产环境设为 `production` |
| `HOST` | 否 | `0.0.0.0` | Express 监听地址 |
| `PORT` | 否 | `4173` | Express 端口，同时作为 Vite API 代理目标 |
| `TRUST_PROXY` | 反代部署建议 | `false` | 在可信 Nginx 后设为 `true` |
| `DATA_DIR` | 否 | `server/data` | JSON 运行数据目录 |
| `ADMIN_USER` | 否 | `admin` | 主管理员用户名 |
| `ADMIN_PASSWORD` | 生产必填 | 无安全默认值 | 主管理员密码 |
| `API_KEY_SECRET` | 使用开放 API 时必填 | 空 | API Key HMAC 摘要密钥 |
| `DATABASE_URL` | 否 | 空 | PostgreSQL 连接字符串，为空时全部使用 JSON |
| `DATABASE_SSL` | 否 | `false` | PostgreSQL 是否使用 TLS |
| `QQ_OAUTH_APP_ID` | 否 | 空 | QQ 互联应用 ID |
| `QQ_OAUTH_APP_SECRET` | 否 | 空 | QQ 互联应用密钥 |
| `QQ_OAUTH_REDIRECT_URI` | 否 | 空 | QQ OAuth 回调地址 |
| `VITE_UMAMI_URL` | 否 | 空 | Umami 服务地址 |
| `VITE_UMAMI_WEBSITE_ID` | 否 | 空 | Umami 站点 ID |
| `POSTGRES_USER` | Docker 使用 | `bluearchive` | Compose 数据库用户 |
| `POSTGRES_PASSWORD` | Docker 必填 | 无 | Compose 数据库密码 |
| `POSTGRES_DB` | Docker 使用 | `bluearchive` | Compose 数据库名 |

推荐用密码管理器生成至少 24 位随机密码，并用独立的 32 字节以上随机值作为 `API_KEY_SECRET`。管理员密码、数据库密码、QQ 密钥和 API Key 不要复用。

## 数据管理

### 种子数据

以下文件可直接修改，用于新部署的默认内容：

- `src/data/news.json`
- `src/data/download.json`
- `src/data/team.json`
- `src/data/status.json`
- `src/data/archive.json`
- `src/data/translation_progress.json`
- `src/data/changelog.json`
- `src/data/tutorial.json`
- `src/data/faq.json`
- `src/data/anti-cheat.json`
- `src/data/story/`
- `server/settings.json`

这些文件是示例种子，不是生产数据库。生产服务首次启动后，主要内容会写入 `DATA_DIR` 或 PostgreSQL；继续修改种子文件不会自动覆盖已有运行数据。

### 运行数据

默认 JSON 运行数据包括：

- 站点内容与设置
- 组员账号的 scrypt 密码摘要
- 评论与反馈
- 术语、问答与任务
- API Key HMAC 摘要
- 审计日志与访客记录
- 翻译进度

`DATABASE_URL` 启用后，`news`、`download`、`team`、`status`、`settings`、`archive`、`tutorial`、`faq`、`antiCheat` 和访客记录使用 PostgreSQL。组员账号、评论、反馈、术语、问答、任务、API Key、审计日志和翻译进度仍保存在 `DATA_DIR`。因此 PostgreSQL 不能替代 JSON 数据目录备份。

不要提交 `server/data/`。其中可能包含账号摘要、访客 IP、反馈原文和生产配置。

## 管理员与组员权限

主管理员由 `ADMIN_USER` 和 `ADMIN_PASSWORD` 提供，不写入 JSON。主管理员可以：

- 创建、编辑、停用和删除组员账号
- 重置组员密码
- 分配后台权限
- 创建和吊销 API Key
- 创建和删除协作任务
- 撤销全部组员会话
- 使用所有后台模块

组员账号保存在 `DATA_DIR/admin_users.json`。密码使用随机盐和 scrypt 摘要，后台不会显示明文。重置密码、停用账号或删除账号会使旧会话失效。

| 权限 | 能力 |
| --- | --- |
| `news` | 公告和团队内容维护 |
| `downloads` | 下载资源维护 |
| `status` | 维护九项资源版本、更新时间与单项状态覆盖 |
| `tutorial` | 安装教程维护 |
| `faq` | 常见问题维护 |
| `antiCheat` | 反作弊追踪维护 |
| `settings` | 站点视觉和模块可见性 |
| `visitors` | 访客记录 |
| `comments` | 评论审核 |
| `feedback` | 完整反馈、采纳、回复和拒绝 |
| `tasks` | 任务读取、认领、提交和审核 |
| `glossary` | 术语增删改 |
| `qa` | 问答审核和答案采纳 |
| `security` | 审计日志 |
| `apiKeys` | API Key 管理，仅主管理员 |

后台菜单和服务端接口都会检查权限。隐藏前端按钮不等于授权，真正的访问限制在 Express 路由中执行。

管理员 session 保存在服务进程内存中，有效期为 12 小时。服务重启后所有管理员需要重新登录。

## 维护状态规则（文档说明）

维护状态展示管理员录入的资源版本与官方版本之间的自动比对结果，不是在线探针、真实 uptime 或外部抓取服务。当前系统不会自行请求官方接口；管理员应在确认官方版本后更新对应字段。完整规则仅保留在本文档与交接文档中，前台和管理后台不展示规则说明框。

有 `status` 权限的管理员在“管理后台 > 维护状态”中维护以下九项：

1. Android 客户端状态
2. Windows 客户端状态
3. iOS 客户端状态
4. MacOS 客户端状态
5. 文本汉化状态
6. CN 语音资源状态
7. KR 语音资源状态
8. 图文资源状态
9. 公告状态

每项都包含资源版本、资源更新时间、官方版本、官方更新时间和状态模式。自动模式下，版本值会忽略首尾空格并按大小写不敏感比较：

- 两个版本都已填写且一致：`正常`
- 两个版本都已填写但不同：`异常`
- 任一版本未填写：`待配置`

管理员可将单项状态模式改为“强制正常”或“强制异常”。覆盖默认关闭，启用后优先于自动比对；应仅在需要临时发布例外状态时使用，并在适当时恢复为自动模式。服务端会拒绝缺少、重复或无效的资源项目，以及无效的强制状态。

## 模块可见性

站点视觉设置中，每个模块可以选择：

- `游客可见`：未登录访客可以访问
- `仅管理员`：需要有效管理员 session
- `关闭模块`：游客收到 404，管理员仍可检查内容

以下策略固定，不能在后台改写：

- 首页始终公开
- 协作工作台始终仅管理员可见，并额外要求 `tasks` 权限
- 历史归档始终仅管理员可见

模块策略同时作用于导航、路由守卫和服务端数据接口。文件校验值会在游客内容响应中移除，仅有效管理员可见。

## 背景压暗程度

管理员可在 `/admin` 的“站点视觉”中调整“全站背景压暗程度”。

- 范围为 `0` 到 `80`，数值越高，站点底色与自定义壁纸越暗
- `0` 保持原有亮度；旧设置缺少该字段时也会按 `0` 处理
- 设置保存为 `settings.backgroundDim`，服务端会将无效值回退为 `0`，并将超范围值限制在 `0` 到 `80`
- 该效果只应用于背景图层，不会压暗文字、卡片、按钮和其他前景内容

## 视觉主题与终端 Token

管理员可在 `/admin` 的“站点视觉”中选择默认模式：`跟随设备`、`日间学园`或`夜间特别行动`。访客还可使用导航栏右侧主题切换器临时覆盖显示偏好，偏好仅保存在当前浏览器的本地存储中。

设计 token 同时定义在 `tailwind.config.js` 与 `src/styles/schale.css`：

- `schale.sky` / `schale.core`：主终端天蓝与高对比操作色
- `schale.alert`：待更新、需要注意的状态
- `schale.signal`：特别活动与异常提示
- `surface.day` / `surface.night`：日间与夜间底色
- `shadow.hud` / `shadow.glow`：HUD 面板和微发光边缘
- `transitionTimingFunction.schale`：终端式动画曲线

全局页面优先使用 Barlow Condensed、Noto Sans SC 与 IBM Plex Mono，不再使用 Noto Serif SC 作为 display 字体。

## 剧情剧场管理

拥有 `剧情剧场` 权限的管理员可在 `/admin` 的“剧情剧场”中维护章节索引、角色名单、每段中日对白、场景描述、立绘 URL 与左右站位。

- 管理 API：`GET/PUT /api/story/admin/index`
- 章节 API：`GET/PUT /api/story/admin/:volume/:chapter`
- 运行期编辑数据存于 `server/data/story-*.json`，不会修改源数据文件
- 未被编辑过的章节仍从 `src/data/story/` 回退读取
- 立绘 URL 可使用 HTTPS 地址或站内绝对路径；未填写时游客端显示终端式角色占位图

## API

站内 API 文档位于 `/api-docs`。所有 `/api/*` 接口都经过全局 IP 限速，未知接口返回 JSON 404。

### 管理员认证

```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

成功后携带：

```http
Authorization: Bearer <session-token>
```

### API Key

主管理员在后台创建 API Key。明文只返回一次，服务端只保存使用 `API_KEY_SECRET` 计算的 HMAC 摘要。

```bash
curl -H "X-API-Key: bak_replace_me" \
  "https://example.com/api/v1/status?chapter=Vol.1"
```

每个 Key 有独立的每分钟和每小时配额。吊销后立即返回 401。

### 状态码

| 状态码 | 含义 |
| --- | --- |
| `200` / `201` | 请求成功 |
| `400` | 输入格式或状态无效 |
| `401` | 未登录、session 失效或 API Key 无效 |
| `403` | 已登录但缺少权限 |
| `404` | 资源不存在或模块对游客关闭 |
| `409` | 任务等资源发生状态冲突 |
| `429` | IP 或 API Key 配额超限 |
| `503` | 可选服务未配置，例如 QQ OAuth 或 API Key secret |

## QQ OAuth

QQ 登录只用于问答页昵称和头像，不会授予任何后台权限。未配置时，问答仍可使用临时昵称。

1. 在 QQ 互联平台创建网站应用。
2. 将回调地址设置为 `https://example.com/api/auth/qq/callback`。
3. 配置 `QQ_OAUTH_APP_ID`、`QQ_OAUTH_APP_SECRET` 和 `QQ_OAUTH_REDIRECT_URI`。
4. HTTPS 反代部署时设置 `TRUST_PROXY=true`。
5. 重启服务并访问 `/api/auth/qq/status`，确认 `configured` 为 `true`。

QQ 社区 session 使用 `HttpOnly`、`SameSite=Lax` Cookie。服务在可信 HTTPS 反代后会添加 `Secure`。QQ session 也保存在内存中，服务重启后需要重新登录。

## Docker Compose

```bash
cp .env.example .env
```

修改至少以下项目：

```dotenv
ADMIN_PASSWORD=replace-with-a-strong-admin-password
API_KEY_SECRET=replace-with-a-long-random-api-key-secret
POSTGRES_PASSWORD=replace-with-a-strong-database-password
TRUST_PROXY=true
```

启动：

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Compose 创建两个持久卷：

- `postgres_data`：PostgreSQL 数据
- `app_data`：仍使用 JSON 的业务数据和翻译进度

删除容器不会删除具名卷。执行 `docker compose down -v` 会删除两个卷及其数据，不要在生产环境中随意使用。

## Nginx 与 HTTPS

模板：

- `deploy/nginx/site-http.conf.example`：首次签发证书前使用
- `deploy/nginx/site.conf.example`：证书签发后的 HTTPS 配置

将模板中的 `example.com` 替换为自己的域名。不要把真实域名、服务器 IP 或证书路径改回并提交到公共仓库。

首次部署流程：

```bash
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/site-http.conf.example /etc/nginx/sites-available/blue-archive
sudo ln -s /etc/nginx/sites-available/blue-archive /etc/nginx/sites-enabled/blue-archive
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d example.com
```

证书签发后安装 HTTPS 模板：

```bash
sudo cp deploy/nginx/site.conf.example /etc/nginx/sites-available/blue-archive
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

验证：

```bash
curl -I http://example.com
curl -I https://example.com
curl https://example.com/api/content
```

预期 HTTP 返回 301，HTTPS 返回安全响应头，API 返回 JSON。

## systemd

模板使用非 root 用户和通用目录 `/opt/blue-archive-localization`。

```bash
sudo useradd --system --home /opt/blue-archive-localization --shell /usr/sbin/nologin bluearchive
sudo mkdir -p /opt/blue-archive-localization
sudo chown -R bluearchive:bluearchive /opt/blue-archive-localization
```

将源码部署到该目录，安装依赖并构建：

```bash
sudo -u bluearchive corepack enable
sudo -u bluearchive pnpm install --frozen-lockfile
sudo -u bluearchive pnpm build
sudo -u bluearchive mkdir -p server/data
```

创建仅服务账号可读的 `.env`：

```bash
sudo chown bluearchive:bluearchive .env
sudo chmod 600 .env
```

安装服务：

```bash
sudo cp deploy/systemd/blue-archive.service.example /etc/systemd/system/blue-archive.service
sudo systemctl daemon-reload
sudo systemctl enable --now blue-archive
sudo systemctl status blue-archive
sudo journalctl -u blue-archive -f
```

如果修改了部署目录或 `DATA_DIR`，同步修改 service 文件中的 `WorkingDirectory`、`EnvironmentFile` 和 `ReadWritePaths`。

## 备份与恢复

备份前建议短暂停止写入或停止服务。

JSON 数据备份：

```bash
sudo systemctl stop blue-archive
sudo tar -C /opt/blue-archive-localization -czf /var/backups/blue-archive-data-$(date +%F).tar.gz server/data
sudo systemctl start blue-archive
```

PostgreSQL 备份：

```bash
pg_dump "$DATABASE_URL" --format=custom --file=/var/backups/blue-archive-$(date +%F).dump
```

恢复 JSON 数据时先停止服务，确认目标目录为空或已另行备份，再解压并修复所有权。恢复 PostgreSQL 使用 `pg_restore`。恢复后运行 `pnpm test:api` 不能验证生产数据本身，因为该测试始终使用隔离临时目录；应额外检查后台列表和 `/api/content`。

## 升级流程

1. 备份 `DATA_DIR` 和 PostgreSQL。
2. 拉取目标版本。
3. 执行 `pnpm install --frozen-lockfile`。
4. 执行 `pnpm run build`。
5. 执行 `pnpm run test:api`。
6. 重启服务。
7. 检查首页、下载页、反馈页、问答页和后台。
8. 检查 Nginx 与应用日志。

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm run build
pnpm run test:api
sudo systemctl restart blue-archive
curl -fsS https://example.com/api/content > /dev/null
```

## 安全说明

- 生产环境未设置 `ADMIN_PASSWORD` 时服务会拒绝启动。
- 开发占位密码只能用于本机，不能暴露到公网。
- `.env`、`CREDENTIALS.md`、`server/data/`、日志和证书不应进入版本控制。
- 不要把 SSH 密码、私钥、完整 API Key 或 session token写入 README、Issue、PR、截图或日志。
- 主管理员密码由环境变量管理，后台不会显示或修改它。
- 组员密码使用 scrypt 摘要；密码重置后旧 session 立即失效。
- 模块可见性只控制站点模块，不能替代具体后台权限。
- `TRUST_PROXY=true` 只应在请求必定经过可信反向代理时使用。
- API Key 明文只显示一次；丢失后应吊销并重新创建。
- 访客记录可能包含 IP 和 User-Agent，应按隐私政策设置保留期并限制访问。
- 外部图片、下载地址和社区链接由管理员维护，发布前应确认来源可信。
- 若任何凭据曾出现在聊天、日志或提交历史中，应立即轮换，而不是只删除文件。

## 故障排查

### 管理后台密码错误

确认当前进程读取的是正确 `.env`，检查 `ADMIN_USER`，然后重启服务。主管理员密码不保存在 `server/data/`，删除数据文件不能重置主管理员密码。不要通过修改组员账号 JSON 来替代根账号配置。

### 登录后立即失效

管理员 session 存在内存中。进程重启、账号停用、密码重置或主管理员撤销组员会话后，需要重新登录。

### 返回 401、403 或 404

- `401`：检查 Bearer token、QQ session 或 API Key。
- `403`：账号缺少对应权限，主管理员应重新分配。
- `404`：资源不存在，或模块对游客处于关闭状态。

### 开发环境 API 请求失败

优先使用 `pnpm dev`。若分开启动，先运行 `pnpm server`，再运行 `pnpm dev:web`。修改 `PORT` 后重启 Vite，使代理目标重新读取 `.env`。

### Docker 重建后数据丢失

确认 `app_data` 和 `postgres_data` 仍存在，并且没有执行 `docker compose down -v`。PostgreSQL 不包含全部业务数据，必须同时恢复 `app_data`。

### QQ 登录显示未配置

确认三个 `QQ_OAUTH_*` 变量完整、回调地址完全一致、域名使用 HTTPS，并在 Nginx 后设置 `TRUST_PROXY=true`。

### HTTPS 配置无法加载

证书签发前不要直接启用引用证书路径的 `site.conf.example`。先使用 HTTP 模板完成域名解析和 ACME 验证，再切换 HTTPS 模板。

## 验证范围

`pnpm test:api` 会启动独立 Express 实例，使用系统临时目录、随机管理员密码和随机 API secret，并在结束后清理。覆盖：

- 游客与管理员模块访问策略
- 未知 API JSON 404
- 反馈脱敏、采纳、回复和拒绝
- 评论提交、通过和拒绝
- 问答提问、回答、投票和采纳
- 术语创建、编辑和删除
- 任务创建、认领、提交、审核和删除
- 安装教程、常见问题和反作弊追踪的管理员保存与游客读取
- 维护状态九项资源校验、强制状态校验和权限拒绝
- API Key 创建、调用和吊销
- 组员权限不足、密码重置、停用和删除后的 session 失效
- 并发反馈提交不丢数据
- 游客不可读取下载校验值

发布前建议执行：

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run test:api
```

并手动回归桌面与手机端首页、下载弹窗、反馈、问答和全部后台标签。

## 提交前脱敏清单

禁止提交：

- `.env` 与任何 `.env.*` 私密变体
- `CREDENTIALS.md`
- `server/data/`
- SSH 密码、私钥、服务器 IP 和真实部署账号
- 真实 Nginx、systemd 与证书配置
- 管理员 session、完整 API Key、QQ App Secret
- 访客 IP、反馈原文、审计日志和线上账号数据
- `dist/`、`node_modules/`、日志和临时目录

仓库只保留 `.env.example`、`*.example` 部署模板和合成演示数据。

## 免责声明

本项目是非官方玩家本地化网站模板，与 NEXON、NAT GAMES 及相关权利方无隶属或授权关系。使用第三方补丁、客户端或资源前，请自行确认适用法律、平台条款与账号风险。
