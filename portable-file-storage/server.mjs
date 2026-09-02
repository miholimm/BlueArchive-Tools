import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import mime from "mime-types";
import multer from "multer";

const root = path.dirname(fileURLToPath(import.meta.url));

function parseBytes(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)?$/i);
  if (!match) return fallback;
  const units = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };
  return Math.floor(Number(match[1]) * (units[String(match[2] || "b").toLowerCase()] || 1));
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
}

function parseCookies(header) {
  return String(header || "").split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function formatContentDisposition(name) {
  const safeName = cleanText(name, "download.bin").replace(/["\\\r\n]/g, "_") || "download.bin";
  return `attachment; filename="${safeName.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

function createConfig(env = process.env) {
  const storageDir = path.resolve(root, env.FILE_STORAGE_DIR || "./storage");
  return {
    nodeEnv: env.NODE_ENV || "development",
    host: env.FILE_STORAGE_HOST || "127.0.0.1",
    port: Number(env.FILE_STORAGE_PORT || 4317),
    storageDir,
    filesDir: path.join(storageDir, "files"),
    tempDir: path.join(storageDir, "tmp"),
    indexFile: path.join(storageDir, "index.json"),
    adminUser: env.FILE_STORAGE_ADMIN_USER || "admin",
    adminPassword: env.FILE_STORAGE_ADMIN_PASSWORD || "",
    maxUploadBytes: parseBytes(env.FILE_STORAGE_MAX_UPLOAD_BYTES, 20 * 1024 ** 3),
    trustProxy: parseBoolean(env.FILE_STORAGE_TRUST_PROXY),
    publicOrigin: cleanText(env.FILE_STORAGE_PUBLIC_ORIGIN),
    sessionTtlMs: 12 * 60 * 60 * 1000,
  };
}

function validateConfig(config) {
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("FILE_STORAGE_PORT must be between 1 and 65535");
  if (config.nodeEnv === "production" && config.adminPassword.length < 16) throw new Error("FILE_STORAGE_ADMIN_PASSWORD must contain at least 16 characters in production");
  if (!Number.isSafeInteger(config.maxUploadBytes) || config.maxUploadBytes < 1) throw new Error("FILE_STORAGE_MAX_UPLOAD_BYTES is invalid");
}

async function ensureStorage(config) {
  await fsp.mkdir(config.filesDir, { recursive: true, mode: 0o750 });
  await fsp.mkdir(config.tempDir, { recursive: true, mode: 0o700 });
  try {
    await fsp.access(config.indexFile);
  } catch {
    await writeIndex(config, { version: 1, files: [] });
  }
}

async function readIndex(config) {
  try {
    const raw = await fsp.readFile(config.indexFile, "utf8");
    const value = JSON.parse(raw);
    if (!value || !Array.isArray(value.files)) throw new Error("index.json has an invalid shape");
    return value;
  } catch (error) {
    if (error.code === "ENOENT") return { version: 1, files: [] };
    throw error;
  }
}

async function writeIndex(config, value) {
  const temporary = `${config.indexFile}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fsp.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await fsp.rename(temporary, config.indexFile);
}

function createRepository(config) {
  let writeChain = Promise.resolve();
  return {
    read: () => readIndex(config),
    update(mutator) {
      const operation = writeChain.then(async () => {
        const current = await readIndex(config);
        const next = await mutator(current);
        await writeIndex(config, next);
        return next;
      });
      writeChain = operation.catch(() => {});
      return operation;
    },
  };
}

function createSessionStore(config) {
  const sessions = new Map();
  const prune = () => {
    const now = Date.now();
    for (const [token, session] of sessions) if (session.expiresAt <= now) sessions.delete(token);
  };
  return {
    create(username) {
      prune();
      const token = crypto.randomBytes(32).toString("base64url");
      sessions.set(token, { username, expiresAt: Date.now() + config.sessionTtlMs });
      return { token, expiresAt: sessions.get(token).expiresAt };
    },
    get(token) {
      prune();
      const session = sessions.get(token);
      if (!session) return null;
      session.expiresAt = Date.now() + config.sessionTtlMs;
      return session;
    },
    delete(token) {
      sessions.delete(token);
    },
    clear() {
      sessions.clear();
    },
  };
}

function tokenFromRequest(req) {
  const authorization = String(req.headers.authorization || "");
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return parseCookies(req.headers.cookie).ba_storage_session || "";
}

function isAdmin(req) {
  return Boolean(req.storageSession);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: "需要管理员登录" });
  return next();
}

function requireSameOrigin(req, res, next) {
  const origin = String(req.headers.origin || "");
  if (!origin) return next();
  const expected = req.storageConfig.publicOrigin || `${req.protocol}://${req.get("host")}`;
  if (origin !== expected) return res.status(403).json({ error: "请求来源不受信任" });
  return next();
}

function toRecord(file, req) {
  return {
    id: file.id,
    name: file.name,
    originalName: file.originalName,
    platform: file.platform,
    kind: file.kind,
    version: file.version,
    description: file.description,
    size: file.size,
    mimeType: file.mimeType,
    sha256: file.sha256,
    visibility: file.visibility,
    published: file.published,
    downloads: file.downloads,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    downloadUrl: `${req.baseUrl || ""}/files/${file.id}/download`,
  };
}

function canView(file, admin) {
  return admin || (file.visibility === "public" && file.published === true);
}

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function parseRange(value, size) {
  if (!value) return null;
  const match = String(value).match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (match[1] === "" && match[2] === "")) return { invalid: true };
  let start = match[1] === "" ? Math.max(size - Number(match[2]), 0) : Number(match[1]);
  let end = match[2] === "" ? size - 1 : Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size) return { invalid: true };
  end = Math.min(end, size - 1);
  return { start, end };
}

function createApp(config, repository, sessions) {
  const app = express();
  app.set("trust proxy", config.trustProxy);
  app.use((req, res, next) => {
    req.storageConfig = config;
    const session = sessions.get(tokenFromRequest(req));
    if (session) req.storageSession = session;
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    next();
  });
  app.use(express.json({ limit: "256kb" }));

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, config.tempDir),
      filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}.part`),
    }),
    limits: { fileSize: config.maxUploadBytes, files: 1 },
  });

  app.get("/api/health", async (_req, res) => {
    const index = await repository.read();
    res.json({ ok: true, files: index.files.length });
  });

  app.get("/api/config", (_req, res) => {
    res.json({ maxUploadBytes: config.maxUploadBytes });
  });

  app.post("/api/auth/login", requireSameOrigin, async (req, res) => {
    const username = cleanText(req.body?.username);
    const password = String(req.body?.password || "");
    if (!safeEqual(username, config.adminUser) || !safeEqual(password, config.adminPassword)) return res.status(401).json({ error: "用户名或密码错误" });
    const session = sessions.create(username);
    const secure = req.secure ? "; Secure" : "";
    res.setHeader("Set-Cookie", `ba_storage_session=${encodeURIComponent(session.token)}; Max-Age=${Math.floor(config.sessionTtlMs / 1000)}; Path=/; HttpOnly; SameSite=Lax${secure}`);
    res.json({ ok: true, user: { username }, expiresAt: session.expiresAt });
  });

  app.post("/api/auth/logout", requireSameOrigin, (req, res) => {
    sessions.delete(tokenFromRequest(req));
    res.setHeader("Set-Cookie", "ba_storage_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
    res.json({ ok: true });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.storageSession) return res.status(401).json({ error: "未登录" });
    res.json({ ok: true, user: { username: req.storageSession.username }, expiresAt: req.storageSession.expiresAt });
  });

  app.get("/api/files", async (req, res, next) => {
    try {
      const index = await repository.read();
      const admin = isAdmin(req);
      const platform = cleanText(req.query.platform);
      const files = index.files
        .filter(file => canView(file, admin))
        .filter(file => !platform || file.platform === platform)
        .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
        .map(file => toRecord(file, req));
      res.json({ files, admin });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/files/:id", async (req, res, next) => {
    try {
      const index = await repository.read();
      const file = index.files.find(item => item.id === req.params.id);
      if (!file || !canView(file, isAdmin(req))) return res.status(404).json({ error: "文件不存在" });
      res.json(toRecord(file, req));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/files", requireSameOrigin, requireAdmin, upload.single("file"), async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: "请选择要上传的文件" });
    const displayName = cleanText(req.body.name || req.file.originalname, req.file.originalname).slice(0, 240);
    const platform = ["android", "windows", "ios", "macos", "other"].includes(req.body.platform) ? req.body.platform : "other";
    const kind = ["installer", "patch", "resource", "launcher", "other"].includes(req.body.kind) ? req.body.kind : "installer";
    const visibility = req.body.visibility === "admin" ? "admin" : "public";
    const published = parseBoolean(req.body.published);
    const id = crypto.randomUUID();
    const storedName = `${id}.bin`;
    const destination = path.join(config.filesDir, storedName);
    try {
      const stat = await fsp.stat(req.file.path);
      const sha256 = await hashFile(req.file.path);
      await fsp.rename(req.file.path, destination);
      const now = new Date().toISOString();
      const file = {
        id,
        name: displayName,
        originalName: cleanText(req.file.originalname, displayName).slice(0, 240),
        storageName: storedName,
        platform,
        kind,
        version: cleanText(req.body.version).slice(0, 80),
        description: cleanText(req.body.description).slice(0, 1000),
        size: stat.size,
        mimeType: req.file.mimetype || mime.lookup(displayName) || "application/octet-stream",
        sha256,
        visibility,
        published: visibility === "public" && published,
        downloads: 0,
        createdAt: now,
        updatedAt: now,
      };
      await repository.update(index => ({ ...index, files: [...index.files, file] }));
      res.status(201).json({ file: toRecord(file, req) });
    } catch (error) {
      await fsp.rm(req.file.path, { force: true }).catch(() => {});
      await fsp.rm(destination, { force: true }).catch(() => {});
      next(error);
    }
  });

  app.patch("/api/files/:id", requireSameOrigin, requireAdmin, async (req, res, next) => {
    try {
      let updated;
      await repository.update(index => {
        const files = index.files.map(file => {
          if (file.id !== req.params.id) return file;
          const visibility = req.body?.visibility === "admin" ? "admin" : req.body?.visibility === "public" ? "public" : file.visibility;
          updated = {
            ...file,
            name: req.body?.name === undefined ? file.name : cleanText(req.body.name, file.name).slice(0, 240),
            platform: ["android", "windows", "ios", "macos", "other"].includes(req.body?.platform) ? req.body.platform : file.platform,
            kind: ["installer", "patch", "resource", "launcher", "other"].includes(req.body?.kind) ? req.body.kind : file.kind,
            version: req.body?.version === undefined ? file.version : cleanText(req.body.version).slice(0, 80),
            description: req.body?.description === undefined ? file.description : cleanText(req.body.description).slice(0, 1000),
            visibility,
            published: visibility === "public" && (req.body?.published === undefined ? file.published : parseBoolean(req.body.published)),
            updatedAt: new Date().toISOString(),
          };
          return updated;
        });
        return { ...index, files };
      });
      if (!updated) return res.status(404).json({ error: "文件不存在" });
      res.json({ file: toRecord(updated, req) });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/files/:id", requireSameOrigin, requireAdmin, async (req, res, next) => {
    try {
      const index = await repository.read();
      const file = index.files.find(item => item.id === req.params.id);
      if (!file) return res.status(404).json({ error: "文件不存在" });
      await fsp.rm(path.join(config.filesDir, file.storageName), { force: true });
      await repository.update(current => ({ ...current, files: current.files.filter(item => item.id !== file.id) }));
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  async function serveDownload(req, res, next) {
    try {
      const index = await repository.read();
      const file = index.files.find(item => item.id === req.params.id);
      if (!file || !canView(file, isAdmin(req))) return res.status(404).json({ error: "文件不存在" });
      const filePath = path.join(config.filesDir, file.storageName);
      const stat = await fsp.stat(filePath);
      const range = parseRange(req.headers.range, stat.size);
      if (range?.invalid) {
        res.setHeader("Content-Range", `bytes */${stat.size}`);
        return res.status(416).end();
      }
      const start = range?.start ?? 0;
      const end = range?.end ?? stat.size - 1;
      const length = end - start + 1;
      res.status(range ? 206 : 200);
      res.set({
        "Accept-Ranges": "bytes",
        "Content-Length": String(length),
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": formatContentDisposition(file.name || file.originalName),
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${stat.size}` } : {}),
      });
      await repository.update(current => ({
        ...current,
        files: current.files.map(item => item.id === file.id ? { ...item, downloads: Number(item.downloads || 0) + 1, updatedAt: new Date().toISOString() } : item),
      }));
      if (req.method === "HEAD") return res.end();
      const stream = fs.createReadStream(filePath, { start, end });
      stream.on("error", next);
      stream.pipe(res);
    } catch (error) {
      if (error.code === "ENOENT") return res.status(404).json({ error: "文件不存在" });
      next(error);
    }
  }

  app.get("/files/:id/download", serveDownload);
  app.head("/files/:id/download", serveDownload);

  app.use(express.static(path.join(root, "public"), { index: "index.html", extensions: ["html"] }));
  app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found" }));
  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "文件超过上传大小限制" });
    if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: "服务器内部错误" });
  });
  return app;
}

export async function createServer(env = process.env) {
  const config = createConfig(env);
  validateConfig(config);
  await ensureStorage(config);
  const repository = createRepository(config);
  const sessions = createSessionStore(config);
  const app = createApp(config, repository, sessions);
  const server = http.createServer(app);
  return { config, app, server, sessions };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const { config, server } = await createServer();
  server.listen(config.port, config.host, () => {
    process.stdout.write(`File storage listening on http://${config.host}:${config.port}\n`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
