import express from "express";
import path from "node:path";
import { config } from "./config.mjs";
import { initRepository, logVisitor } from "./repository.mjs";
import { api } from "./routes.mjs";
import { apiV1 } from "./routes-api-v1.mjs";
import { apiKeyRoutes } from "./routes-apikeys.mjs";
import { taskRoutes } from "./routes-tasks.mjs";
import { glossaryRoutes } from "./routes-glossary.mjs";
import { qaRoutes } from "./routes-qa.mjs";
import { qqOAuthRoutes } from "./routes-qq-oauth.mjs";
import { staticDataRoutes, storyDataRoutes } from "./routes-static.mjs";
import { handleStoryProxy } from "./routes-story-proxy.mjs";
import { storyCatalogRoutes } from "./routes-story-catalog.mjs";
import { rateLimit, securityHeaders, getRequestIp } from "./security.mjs";
import { initScheduler } from "./scheduler.mjs";

await initRepository(config.root);
initScheduler();
const app = express();
app.set("trust proxy", config.trustProxy ? 1 : false);
app.use(express.json({ limit: "2mb" }));

// ── 全局安全响应头 ──
app.use(securityHeaders);

// IP tracking middleware
app.use((req, res, next) => {
  const entry = {
    ip: getRequestIp(req).replace("::ffff:", ""),
    path: req.originalUrl,
    ua: req.headers["user-agent"]?.slice(0, 200) || "",
    ref: req.headers["referer"]?.slice(0, 500) || "",
    time: new Date().toISOString(),
  };
  if (
    !entry.path.startsWith("/api/") &&
    !entry.path.includes("/assets/") &&
    !entry.path.startsWith("/.vite")
  ) {
    logVisitor(entry).catch(() => {});
  }
  next();
});

// ── API 速率限制（全局 /api/* ）──
app.use("/api", rateLimit);

// ── 阶段四新路由挂载 ──
// 开放 API（仅 rateLimit）
app.use("/api/v1", apiV1);
app.use("/api/auth/qq", qqOAuthRoutes);
app.use("/api/site-data", staticDataRoutes);
app.use("/api/story", storyDataRoutes);
app.get("/api/story-proxy", handleStoryProxy);
app.get("/api/story-proxy/", handleStoryProxy);
// 剧情目录（碧蓝档案剧情站仓库全量剧情索引，内存缓存 1h）
app.use("/api/story-catalog", storyCatalogRoutes);
// API Key 管理（需认证）
app.use("/api/admin/api-keys", apiKeyRoutes);
// 任务池（公开 GET，管理操作需认证）
app.use("/api/tasks", taskRoutes);
// 术语库（公开 GET，管理操作需认证）
app.use("/api/glossary", glossaryRoutes);
// QA 板块（公开操作，管理需认证）
app.use("/api/qa", qaRoutes);

app.use("/api", api);

app.use("/api", (req, res) =>
  res.status(404).json({ error: "API endpoint not found" }),
);

app.use(express.static(path.join(config.root, "dist")));
app.use((req, res) =>
  res.sendFile(path.join(config.root, "dist", "index.html")),
);
const host = process.env.HOST || "0.0.0.0";
app.listen(config.port, host, () =>
  console.log(`Blue Archive server listening on ${host}:${config.port}`),
);
