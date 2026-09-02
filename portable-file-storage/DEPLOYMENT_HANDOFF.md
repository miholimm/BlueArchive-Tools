# 便携文件存储系统交接文档

## 用途

该系统用于集中存放蔚蓝档案汉化客户端、资源包、补丁和启动器。文件实体保存在独立 `storage/` 目录，元数据保存在 `storage/index.json`，不依赖官网的 `server/data`，也不应将安装包提交到 Git。

## 线上实例

- 访问地址：`https://files.hh.flha.ru/`
- 管理入口：访问地址首页右上角的管理员入口
- 服务名称：`blue-archive-files.service`
- 应用目录：`/opt/blue-archive-files`
- 数据目录：`/opt/blue-archive-files/storage`
- 后端监听：`127.0.0.1:4317`
- 反向代理：Nginx
- HTTPS：Let's Encrypt，Certbot 自动续期

管理员账号和密码只保存在本地的 `FILE_STORAGE_ACCESS.local.md` 以及服务器私有 `.env` 中，不写入代码、前端资源、发布包或 Git。

## 管理员操作

1. 打开管理入口并登录。
2. 选择文件并填写显示名称、版本、平台、文件类型和简介。
3. 上传完成后核对 SHA-256、文件大小和版本信息。
4. 只有设置为已发布且公开的文件会出现在游客列表中。
5. 隐藏文件仍保留在仓库中，登录后可以查看并重新发布。
6. 删除文件前先确认官网 `download.json` 或其他引用已经迁移。

平台值包括 `android`、`windows`、`ios`、`macos`；类型值包括 `installer`、`patch`、`resource`、`launcher`。

## 服务维护

查看服务状态：

```bash
systemctl status blue-archive-files.service
```

查看实时日志：

```bash
journalctl -u blue-archive-files.service -f
```

重启服务：

```bash
systemctl restart blue-archive-files.service
```

检查健康状态：

```bash
curl -fsS https://files.hh.flha.ru/api/health
```

## 备份与恢复

备份脚本位于 `scripts/backup.sh`，默认生成到 `backups/`，备份包含 `storage/index.json` 和所有实体文件，并生成 SHA-256 校验文件。

```bash
cd /opt/blue-archive-files
./scripts/backup.sh
```

恢复前先停止服务，将备份中的 `storage/` 恢复到 `/opt/blue-archive-files/storage/`，然后修正权限并启动服务：

```bash
systemctl stop blue-archive-files.service
chown -R bluearchive-files:bluearchive-files /opt/blue-archive-files/storage
systemctl start blue-archive-files.service
```

备份文件应复制到独立磁盘或其他服务器，不能只保存在同一块磁盘上。

## 发布新版本

便携目录中的发布包不包含 `node_modules`、`.env`、`storage/` 和本地访问信息。升级时先在本地执行测试：

```bash
npm install
npm test
```

生产环境升级流程：

```bash
systemctl stop blue-archive-files.service
cp -a /opt/blue-archive-files/storage /opt/blue-archive-files/storage.before-upgrade
npm ci --omit=dev
chown -R bluearchive-files:bluearchive-files /opt/blue-archive-files
systemctl start blue-archive-files.service
curl -fsS https://files.hh.flha.ru/api/health
```

升级前必须确认 `.env` 和 `storage/` 未被发布包覆盖。

## Nginx 与证书

独立站点配置位于服务器 `/etc/nginx/sites-available/blue-archive-files`，证书由 Certbot 管理。修改 Nginx 后先检查再 reload：

```bash
nginx -t
systemctl reload nginx
```

续期演练：

```bash
certbot renew --dry-run --cert-name files.hh.flha.ru
```

证书续期成功后会自动执行 Nginx reload。

## 故障排查

- 页面打不开：先检查 `systemctl is-active nginx blue-archive-files.service`。
- 上传失败：检查 Nginx 的 `client_max_body_size`、磁盘空间和 `FILE_STORAGE_MAX_UPLOAD_BYTES`。
- 下载中断：确认请求经过 Nginx，且保留 `proxy_request_buffering off`、`proxy_buffering off` 和长超时配置。
- 游客看不到文件：确认文件同时满足 `published=true` 和 `visibility=public`。
- 登录失败：检查服务器 `.env`，不要删除或覆盖管理员密码配置。
- 证书异常：检查 Certbot 日志、Cloudflare DNS API 凭据权限和 `files.hh.flha.ru` 解析结果。

## 安全边界

- 不要提交 `.env`、`storage/`、备份包、管理员密码或 SSH 凭据。
- 不要执行 `docker compose down -v`，除非已经确认不需要存储卷。
- 不要直接公开 `storage/index.json` 或 `storage/files/`。
- 安装包发布前应在管理界面核对 SHA-256、版本、平台和文件类型。
- 官网下载数据只保存公开下载 URL、版本、更新时间、大小和 SHA-256，不保存管理员凭据。
