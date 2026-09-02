# 便携安装包存储系统

这是一个独立的安装包文件仓库，用来存放蔚蓝档案汉化客户端、资源包、补丁和启动器。它不依赖官网的 `server/data`，不会把二进制安装包提交到 Git，也不会覆盖官网的账号和内容数据。

## 能力

- 管理员登录
- 大文件上传进度
- 上传后自动计算 SHA-256
- Android、Windows、iOS、MacOS 平台分类
- 安装包、补丁、资源包、启动器分类
- 文件公开、隐藏和删除
- 公共下载页
- HTTP Range 断点下载
- 随机磁盘文件名，下载时恢复显示名称
- JSON 元数据与实体文件分离
- Docker Compose、Node.js 手动部署、一键启动脚本
- 独立备份脚本

## 目录

```text
portable-file-storage/
├── public/                 管理界面和公共文件列表
├── nginx/                  HTTPS 反向代理模板
├── scripts/                启动、备份和回归脚本
├── server.mjs              Express 服务
├── storage/                运行时目录，不提交 Git
├── .env.example            环境变量模板
├── Dockerfile
├── docker-compose.yml
└── package.json
```

运行时目录结构：

```text
storage/
├── index.json              文件元数据、校验值、发布状态和下载计数
├── files/                  随机命名的实际安装包
└── tmp/                    上传中的临时文件
```

## Docker 部署

```bash
cp .env.example .env
```

至少修改：

```dotenv
FILE_STORAGE_ADMIN_USER=admin
FILE_STORAGE_ADMIN_PASSWORD=替换为至少16位的随机密码
FILE_STORAGE_MAX_UPLOAD_BYTES=20G
```

启动：

```bash
docker compose up -d --build
docker compose logs -f file-storage
```

管理界面：`http://服务器地址:4317/`

不要执行 `docker compose down -v`，否则会删除存储卷。备份前执行：

```bash
docker compose exec file-storage node -e "console.log('storage is mounted')"
```

然后把宿主机的 `storage/` 目录纳入离机备份。

## Node.js 手动部署

要求 Node.js 22 或更高版本：

```bash
cp .env.example .env
npm install --omit=dev
npm run start
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
npm install --omit=dev
npm run start
```

也可以直接运行：

```powershell
.\scripts\one-click-native.ps1
```

Linux：

```bash
chmod +x scripts/one-click-native.sh scripts/backup.sh
./scripts/one-click-native.sh
```

## 生产部署建议

建议使用专用系统用户、systemd 和 Nginx：

```ini
[Unit]
Description=Blue Archive Portable File Storage
After=network-online.target

[Service]
Type=simple
User=bluearchive-files
Group=bluearchive-files
WorkingDirectory=/opt/blue-archive-files
EnvironmentFile=/opt/blue-archive-files/.env
ExecStart=/usr/bin/node /opt/blue-archive-files/server.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/opt/blue-archive-files/storage
UMask=0077

[Install]
WantedBy=multi-user.target
```

Nginx 使用 `nginx/files-site.conf.template`，并把 `client_max_body_size` 设置为不小于最大安装包大小。上传大文件时保留 `proxy_request_buffering off` 和较长的读写超时。

## API

公共文件列表：

```http
GET /api/files
```

下载：

```http
GET /files/:id/download
```

登录：

```http
POST /api/auth/login
Content-Type: application/json

{"username":"admin","password":"your-password"}
```

管理员上传使用 `multipart/form-data`：

```bash
curl -b cookies.txt -c cookies.txt -X POST \
  -F 'file=@BlueArchive-Localization-1.0.0.exe' \
  -F 'name=蔚蓝档案汉化版' \
  -F 'version=1.0.0' \
  -F 'platform=windows' \
  -F 'kind=installer' \
  -F 'description=完整汉化客户端' \
  -F 'published=true' \
  https://files.example.com/api/files
```

返回的 `downloadUrl` 就是官网 `download.json` 中可使用的下载地址。发布到官网前，将地址、版本、更新时间、大小和 SHA-256 填入下载资源元数据。

## 备份与恢复

```bash
./scripts/backup.sh
```

备份包包含 `storage/index.json` 和所有实体文件。恢复前停止服务，将备份解压回 `storage/`，再启动服务并访问 `/api/health`。

安装包发布前建议核对：

1. 文件大小与磁盘剩余空间。
2. 管理界面显示的 SHA-256。
3. 下载链接是否返回 `200` 或 Range 请求是否返回 `206`。
4. 官网下载元数据中的版本和平台是否与文件一致。

## 安全边界

- `.env`、`storage/`、备份包和管理员密码不能提交到 Git。
- 管理员密码不写入前端代码和公开 JSON。
- 公共用户只能读取 `published=true` 且 `visibility=public` 的文件。
- 生产环境必须使用 HTTPS。
- 服务器磁盘需要预留安装包大小、临时上传和备份所需空间。
- 不要让 Nginx 或对象存储直接暴露 `storage/index.json`。

## 验证

```bash
npm test
```

回归测试会验证登录、上传、公共列表、Range 下载、隐藏、管理员读取和删除流程。
