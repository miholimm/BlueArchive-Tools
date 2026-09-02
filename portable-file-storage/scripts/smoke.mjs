import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = await mkdtemp(path.join(os.tmpdir(), "ba-file-storage-smoke-"));
const port = await getPort();
const password = `test-${randomBytes(16).toString("hex")}`;
const baseUrl = `http://127.0.0.1:${port}`;
let output = "";
const child = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "test", FILE_STORAGE_HOST: "127.0.0.1", FILE_STORAGE_PORT: String(port), FILE_STORAGE_DIR: dataDir, FILE_STORAGE_ADMIN_PASSWORD: password, FILE_STORAGE_ADMIN_USER: "admin" },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", chunk => { output += chunk; });
child.stderr.on("data", chunk => { output += chunk; });

try {
  await waitForHealth();
  const login = await call("/api/auth/login", { method: "POST", body: { username: "admin", password } });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get("set-cookie").split(";", 1)[0];
  const form = new FormData();
  const contents = Buffer.from("blue archive installer");
  form.append("file", new Blob([contents], { type: "application/octet-stream" }), "installer.bin");
  form.append("name", "回归安装包");
  form.append("version", "1.0.0");
  form.append("platform", "windows");
  form.append("kind", "installer");
  form.append("description", "用于验证文件入库和下载");
  form.append("published", "true");
  const uploaded = await call("/api/files", { method: "POST", cookie, body: form });
  assert.equal(uploaded.response.status, 201);
  assert.equal(uploaded.data.file.size, contents.length);
  assert.equal(uploaded.data.file.sha256.length, 64);
  const id = uploaded.data.file.id;
  const publicList = await call("/api/files");
  assert.equal(publicList.response.status, 200);
  assert.equal(publicList.data.files.some(file => file.id === id), true);
  const range = await call(`/files/${id}/download`, { headers: { Range: "bytes=0-3" }, binary: true });
  assert.equal(range.response.status, 206);
  assert.equal(range.data.toString(), "blue");
  const hidden = await call(`/api/files/${id}`, { method: "PATCH", cookie, body: { published: false } });
  assert.equal(hidden.response.status, 200);
  assert.equal((await call("/api/files")).data.files.some(file => file.id === id), false);
  assert.equal((await call("/api/files", { cookie })).data.files.some(file => file.id === id), true);
  assert.equal((await call(`/api/files/${id}`, { method: "DELETE", cookie })).response.status, 200);
  assert.equal((await call(`/api/files/${id}`)).response.status, 404);
  process.stdout.write("File storage smoke test passed\n");
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
    await Promise.race([once(child, "exit"), delay(2000)]);
  }
  await rm(dataDir, { recursive: true, force: true });
  if (child.exitCode && child.exitCode !== 0) process.stderr.write(output);
}

function getPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`File storage failed to start: ${output}`);
    try {
      if ((await fetch(`${baseUrl}/api/health`)).ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`File storage start timed out: ${output}`);
}

async function call(route, options = {}) {
  const { body, cookie, binary, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers || {});
  if (cookie) headers.set("Cookie", cookie);
  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    requestOptions.body = JSON.stringify(body);
  } else if (body) {
    requestOptions.body = body;
  }
  const response = await fetch(`${baseUrl}${route}`, { ...requestOptions, headers });
  if (binary) return { response, data: Buffer.from(await response.arrayBuffer()) };
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data };
}

function delay(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }
