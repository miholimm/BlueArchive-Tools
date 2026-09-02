# Blue Archive 资源控制台

一个独立的 Web 控制台，用来查看并修改用户在 Blue Archive 资源系统中的三项配置：文本汉化、主线语音和图文汉化。

## 功能

- 通过 `?user=用户ID` 自动读取用户资源配置。
- URL 中没有 `user` 时，尝试读取当前站点可访问的 `serverinfo` Cookie。
- Cookie 不可访问或不存在时提供手动用户 ID 输入。
- 文本汉化和图文汉化使用开关，严格映射为 `CN` 与 `JP`。
- 兼容资源服务读取时返回的布尔值：`true` 映射为 `CN`，`false` 映射为 `JP`。
- 主线语音使用选择框，严格映射为 `Default`、`CN` 与 `KR`。
- 保存时仅发送发生变化的字段，并始终附带 `user`。
- 支持读取、保存、无改动、网络异常、HTTP 异常、JSON 异常和 API 错误提示。
- 提供可折叠的只读调试信息，不暴露任何修改入口。
- 提供桌面和移动端响应式布局。

## 技术栈

- React 19
- TypeScript
- Vite
- Lucide React
- Vitest

## 本地启动

要求 Node.js 22.12 或更高版本。

```bash
npm install
npm run dev
```

开发服务器默认地址为 `http://127.0.0.1:5186/`。使用 URL 参数测试真实 API：

```text
http://127.0.0.1:5186/?user=你的用户ID
```

开发环境会将 `/resource-api/*` 代理至 `https://api.bluearchive.help/*`，前端不会直接请求跨域 API。

## 本地 Mock 验证

本地 Mock API 只服务于开发验证，不会调用真实资源服务。

在第一个终端启动 Mock API：

```bash
npm run dev:mock-api
```

在第二个终端启动前端，并将代理指向 Mock API：

```powershell
$env:RESOURCE_API_ORIGIN='http://127.0.0.1:8787'
npm run dev
```

打开：

```text
http://127.0.0.1:5186/?user=demo-123
```

Mock 用户的初始配置为：

```json
{
  "text": "CN",
  "voice": "Default",
  "media": "CN"
}
```

Mock API 的 `/_last_update` 路径仅用于检查最后一次本地测试请求，不属于生产接口。

## 环境变量

复制 `.env.example` 为 `.env` 后可调整：

```dotenv
RESOURCE_API_ORIGIN=https://api.bluearchive.help
```

默认情况下，浏览器请求会使用当前 Vite 基路径下的 `resource-api`：根路径开发为 `/resource-api`，以 `/resource-console/` 构建时为 `/resource-console/resource-api`。如有特殊部署需求，可通过 `VITE_RESOURCE_API_BASE_URL` 显式覆盖该前缀。`RESOURCE_API_ORIGIN` 仅用于 Vite 开发代理。生产环境应使用 Web 服务器反向代理。

## 生产部署

构建静态文件：

```bash
npm run build
```

将 `dist/` 部署到静态站点目录，并参考 [nginx/resource-console.conf.template](nginx/resource-console.conf.template) 配置：

1. 静态站点的 `root` 指向构建后的 `dist` 目录。
2. 保留 `/resource-api/` 到 `https://api.bluearchive.help/` 的反向代理。
3. 将 `console.example.com` 改为正式域名。
4. 在 HTTPS 站点上配置证书。

该反向代理让浏览器只访问当前站点的 `/resource-api/*`，避免浏览器 CORS 限制。

如果部署在主站子路径 `/resource-console/`，使用：

```bash
npm run build -- --base=/resource-console/
```

并参考 [nginx/hh.flha.ru-resource-console.conf](nginx/hh.flha.ru-resource-console.conf) 将静态文件和 `/resource-console/resource-api/` 代理加入同一 Nginx `server` 块。

## 用户 ID 与 Cookie

用户 ID 的读取顺序为：

1. URL 参数 `?user=...`。
2. 当前页面可读的 `serverinfo` Cookie。
3. 手动输入。

要读取 `serverinfo` Cookie，控制台必须部署在 Cookie 所覆盖的 `bluearchive.help` 域名范围内，Cookie 不能设置为 `HttpOnly`，并且浏览器需允许该 Cookie 在当前页面读取。若控制台部署在其他域名，浏览器无法读取 `.bluearchive.help` 的 Cookie；这时 `?user=` 和手动输入仍然可用。

## API 载荷规则

读取：

```http
GET /resource-api/get_resource?user=123
```

保存文本和语音变化时，页面发送：

```json
{
  "user": "123",
  "text": "JP",
  "voice": "KR"
}
```

未改变的 `media` 不会出现在 POST 载荷中。

## 验证

```bash
npm test
npm run build
```

测试覆盖文本/图文映射、语音映射、URL 与 Cookie 的优先级、空字段默认值、最小更新载荷、API 成功响应、API 错误和 JSON 解析异常。
