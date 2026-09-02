import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "ba-api-smoke-"));
const rootUsername = `root_${randomBytes(4).toString("hex")}`;
const rootPassword = randomBytes(24).toString("base64url");
const memberUsername = `member_${randomBytes(4).toString("hex")}`;
const memberPassword = randomBytes(24).toString("base64url");
const replacementPassword = randomBytes(24).toString("base64url");
const apiSecret = randomBytes(32).toString("base64url");
const port = await getAvailablePort();
const baseUrl = `http://127.0.0.1:${port}`;
let output = "";

const server = spawn(process.execPath, ["server/server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: String(port),
    TRUST_PROXY: "false",
    DATA_DIR: dataDirectory,
    DATABASE_URL: "",
    DATABASE_SSL: "false",
    ADMIN_USER: rootUsername,
    ADMIN_PASSWORD: rootPassword,
    API_KEY_SECRET: apiSecret,
    QQ_OAUTH_APP_ID: "",
    QQ_OAUTH_APP_SECRET: "",
    QQ_OAUTH_REDIRECT_URI: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => {
  output += chunk;
});
server.stderr.on("data", (chunk) => {
  output += chunk;
});

try {
  await waitForServer();
  const initial = await call("/api/content");
  expectStatus(initial, 200, "游客内容");
  assert.equal(initial.response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(initial.data.status.resources.length, 9);
  assert.equal(new Set(initial.data.status.resources.map((resource) => resource.id)).size, 9);
  assert.equal(initial.data.status.resources.every((resource) => resource.forcedStatus === "none"), true);

  const unknown = await call("/api/route-that-does-not-exist");
  expectStatus(unknown, 404, "未知 API");
  assert.equal(unknown.data.error, "API endpoint not found");
  expectStatus(await call("/api/archive"), 401, "游客归档限制");
  expectStatus(await call("/api/tasks"), 401, "游客工作台限制");

  const qqStatus = await call("/api/auth/qq/status");
  expectStatus(qqStatus, 200, "QQ 状态");
  assert.equal(qqStatus.data.configured, false);
  expectStatus(await call("/api/auth/qq/start", { redirect: "manual" }), 503, "未配置 QQ 登录");

  expectStatus(
    await call("/api/admin/login", { method: "POST", body: { username: rootUsername, password: "invalid-password" } }),
    401,
    "错误管理员密码",
  );
  const rootLogin = await call("/api/admin/login", {
    method: "POST",
    body: { username: rootUsername, password: rootPassword },
  });
  expectStatus(rootLogin, 200, "主管理员登录");
  const rootToken = rootLogin.data.token;
  assert.equal(rootLogin.data.isRoot, true);
  expectStatus(await call("/api/admin/me", { token: rootToken }), 200, "主管理员会话");
  expectStatus(await call("/api/archive", { token: rootToken }), 200, "主管理员归档");
  expectStatus(await call("/api/tasks", { token: rootToken }), 200, "主管理员工作台");

  const adminContent = await call("/api/content", { token: rootToken });
  expectStatus(adminContent, 200, "管理员内容");
  assert.equal(adminContent.data.status.resources.length, 9);

  const tutorialGuest = await call("/api/site-data/tutorial");
  expectStatus(tutorialGuest, 200, "游客安装教程");
  const tutorialAdmin = await call("/api/admin/site-data/tutorial", { token: rootToken });
  expectStatus(tutorialAdmin, 200, "管理员安装教程");
  const tutorial = structuredClone(tutorialAdmin.data);
  tutorial[0].label = "API 回归教程";
  expectStatus(
    await call("/api/admin/site-data/tutorial", { method: "PUT", token: rootToken, body: tutorial }),
    200,
    "安装教程保存",
  );
  const savedTutorialGuest = await call("/api/site-data/tutorial");
  expectStatus(savedTutorialGuest, 200, "游客读取已保存教程");
  assert.equal(savedTutorialGuest.data[0].label, "API 回归教程");

  const faqAdmin = await call("/api/admin/site-data/faq", { token: rootToken });
  expectStatus(faqAdmin, 200, "管理员常见问题");
  const faq = structuredClone(faqAdmin.data);
  faq[0].category = "API 回归";
  expectStatus(
    await call("/api/admin/site-data/faq", { method: "PUT", token: rootToken, body: faq }),
    200,
    "常见问题保存",
  );
  const savedFaqGuest = await call("/api/site-data/faq");
  expectStatus(savedFaqGuest, 200, "游客读取已保存常见问题");
  assert.equal(savedFaqGuest.data[0].category, "API 回归");

  const antiCheatAdmin = await call("/api/admin/site-data/antiCheat", { token: rootToken });
  expectStatus(antiCheatAdmin, 200, "管理员反作弊追踪");
  const antiCheat = structuredClone(antiCheatAdmin.data);
  antiCheat[0].lastUpdate = "2026-08-13 API 回归";
  expectStatus(
    await call("/api/admin/site-data/antiCheat", { method: "PUT", token: rootToken, body: antiCheat }),
    200,
    "反作弊追踪保存",
  );
  const savedAntiCheatGuest = await call("/api/site-data/antiCheat");
  expectStatus(savedAntiCheatGuest, 200, "游客读取已保存反作弊追踪");
  assert.equal(savedAntiCheatGuest.data[0].lastUpdate, "2026-08-13 API 回归");

  const versionStatus = structuredClone(adminContent.data.status);
  versionStatus.resources[0] = {
    ...versionStatus.resources[0],
    resourceVersion: "1.2.3",
    resourceUpdatedAt: "2026-08-13 18:00",
    officialVersion: "1.2.3",
    officialUpdatedAt: "2026-08-13 17:30",
  };
  versionStatus.resources[1] = {
    ...versionStatus.resources[1],
    resourceVersion: "1.2.2",
    officialVersion: "1.2.3",
    forcedStatus: "normal",
  };
  const invalidCountStatus = structuredClone(versionStatus);
  invalidCountStatus.resources.pop();
  expectStatus(
    await call("/api/admin/content/status", { method: "PUT", token: rootToken, body: invalidCountStatus }),
    400,
    "缺少资源状态",
  );
  const duplicateStatus = structuredClone(versionStatus);
  duplicateStatus.resources[1].id = duplicateStatus.resources[0].id;
  expectStatus(
    await call("/api/admin/content/status", { method: "PUT", token: rootToken, body: duplicateStatus }),
    400,
    "重复资源状态",
  );
  const invalidOverrideStatus = structuredClone(versionStatus);
  invalidOverrideStatus.resources[2].forcedStatus = "maintenance";
  expectStatus(
    await call("/api/admin/content/status", { method: "PUT", token: rootToken, body: invalidOverrideStatus }),
    400,
    "非法强制状态",
  );
  const savedStatus = await call("/api/admin/content/status", { method: "PUT", token: rootToken, body: versionStatus });
  expectStatus(
    savedStatus,
    200,
    "版本状态保存",
  );
  assert.equal(savedStatus.data.value.resources[0].resourceVersion, "1.2.3");
  assert.equal(savedStatus.data.value.resources[1].forcedStatus, "normal");
  const download = structuredClone(adminContent.data.download);
  download.android[0].checksum = { md5: "0123456789abcdef0123456789abcdef" };
  expectStatus(
    await call("/api/admin/content/download", { method: "PUT", token: rootToken, body: download }),
    200,
    "下载内容保存",
  );
  const guestDownload = await call("/api/content");
  const authenticatedDownload = await call("/api/content", { token: rootToken });
  assert.equal(Object.hasOwn(guestDownload.data.download.android[0], "checksum"), false);
  assert.equal(authenticatedDownload.data.download.android[0].checksum.md5, "0123456789abcdef0123456789abcdef");

  const announcementId = String(initial.data.news[0].id);
  const firstComment = await call("/api/comments", {
    method: "POST",
    body: { announcementId, author: "测试访客", content: "这是一条待审核评论" },
  });
  expectStatus(firstComment, 201, "评论提交");
  expectStatus(
    await call(`/api/admin/comments/${firstComment.data.id}`, { method: "PUT", token: rootToken, body: { status: "approved" } }),
    200,
    "评论通过",
  );
  const secondComment = await call("/api/comments", {
    method: "POST",
    body: { announcementId, author: "测试访客", content: "这是一条被拒绝评论" },
  });
  expectStatus(secondComment, 201, "第二条评论提交");
  expectStatus(
    await call(`/api/admin/comments/${secondComment.data.id}`, { method: "PUT", token: rootToken, body: { status: "rejected" } }),
    200,
    "评论拒绝",
  );
  const publicComments = await call(`/api/comments/${announcementId}`);
  expectStatus(publicComments, 200, "公开评论");
  assert.equal(publicComments.data.some((item) => item.id === firstComment.data.id), true);
  assert.equal(publicComments.data.some((item) => item.id === secondComment.data.id), false);

  const feedbackIds = [];
  for (const index of [1, 2, 3]) {
    const feedback = await call("/api/feedback", {
      method: "POST",
      body: {
        chapter: `Vol.1 Ch.${index}`,
        original: `原文 ${index}`,
        translation: `译文 ${index}`,
        suggestion: `建议 ${index}`,
      },
    });
    expectStatus(feedback, 201, `反馈提交 ${index}`);
    feedbackIds.push(feedback.data.id);
  }
  const publicFeedback = await call("/api/feedback");
  expectStatus(publicFeedback, 200, "游客反馈列表");
  for (const item of publicFeedback.data) {
    assert.equal(Object.hasOwn(item, "original"), false);
    assert.equal(Object.hasOwn(item, "translation"), false);
    assert.equal(Object.hasOwn(item, "suggestion"), false);
  }
  const fullFeedback = await call("/api/admin/feedback", { token: rootToken });
  expectStatus(fullFeedback, 200, "管理员反馈列表");
  assert.equal(fullFeedback.data.some((item) => item.original === "原文 1"), true);
  expectStatus(
    await call(`/api/admin/feedback/${feedbackIds[0]}`, { method: "PUT", token: rootToken, body: { status: "adopted", reply: "已处理" } }),
    200,
    "反馈采纳",
  );
  expectStatus(
    await call(`/api/admin/feedback/${feedbackIds[1]}`, { method: "PUT", token: rootToken, body: { status: "replied", reply: "感谢反馈" } }),
    200,
    "反馈回复",
  );
  expectStatus(
    await call(`/api/admin/feedback/${feedbackIds[2]}`, { method: "PUT", token: rootToken, body: { status: "rejected", reply: "暂不采用" } }),
    200,
    "反馈拒绝",
  );
  const feedbackBeforeConcurrency = (await call("/api/admin/feedback", { token: rootToken })).data.length;
  const concurrentFeedback = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      call("/api/feedback", {
        method: "POST",
        body: { chapter: `并发章节 ${index}`, original: `并发原文 ${index}`, translation: "", suggestion: `并发建议 ${index}` },
      }),
    ),
  );
  concurrentFeedback.forEach((result, index) => expectStatus(result, 201, `并发反馈 ${index}`));
  const feedbackAfterConcurrency = (await call("/api/admin/feedback", { token: rootToken })).data.length;
  assert.equal(feedbackAfterConcurrency, feedbackBeforeConcurrency + 8);

  const question = await call("/api/qa", {
    method: "POST",
    body: { title: "测试问题", content: "如何验证问答接口？", tags: ["测试"], author: "测试用户" },
  });
  expectStatus(question, 201, "问答提问");
  const questionId = question.data.question.id;
  const answer = await call(`/api/qa/${questionId}/answer`, {
    method: "POST",
    body: { content: "通过隔离回归验证。", author: "回答者" },
  });
  expectStatus(answer, 201, "问答回答");
  const answerId = answer.data.answer.id;
  expectStatus(await call(`/api/qa/${questionId}/vote`, { method: "POST" }), 200, "问题投票");
  expectStatus(await call(`/api/qa/${questionId}/vote/${answerId}`, { method: "POST" }), 200, "回答投票");
  expectStatus(
    await call(`/api/qa/${questionId}/accept/${answerId}`, { method: "PUT", token: rootToken }),
    200,
    "答案采纳",
  );
  const questions = await call("/api/qa");
  const acceptedQuestion = questions.data.find((item) => item.id === questionId);
  assert.equal(acceptedQuestion.status, "closed");
  assert.equal(acceptedQuestion.answers[0].accepted, true);

  const term = await call("/api/glossary/admin", {
    method: "POST",
    token: rootToken,
    body: { ja: "テスト", zh: "测试", romaji: "tesuto", category: "回归", note: "初始" },
  });
  expectStatus(term, 201, "术语创建");
  const termId = term.data.term.id;
  expectStatus(
    await call(`/api/glossary/admin/${termId}`, { method: "PUT", token: rootToken, body: { zh: "测试项", note: "已编辑" } }),
    200,
    "术语编辑",
  );
  const glossary = await call("/api/glossary?search=%E6%B5%8B%E8%AF%95%E9%A1%B9");
  assert.equal(glossary.data.some((item) => item.id === termId), true);
  expectStatus(await call(`/api/glossary/admin/${termId}`, { method: "DELETE", token: rootToken }), 200, "术语删除");

  const concurrentTerms = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      call("/api/glossary/admin", {
        method: "POST",
        token: rootToken,
        body: { ja: `同時-${index}`, zh: `并发术语-${index}`, category: "回归" },
      }),
    ),
  );
  concurrentTerms.forEach((result) => expectStatus(result, 201, "并发术语创建"));
  const concurrentTermIds = concurrentTerms.map((result) => result.data.term.id);
  assert.equal(new Set(concurrentTermIds).size, concurrentTermIds.length, "并发术语 ID 应保持唯一");
  const glossaryAfterConcurrency = await call("/api/glossary");
  assert.equal(
    concurrentTermIds.every((id) => glossaryAfterConcurrency.data.some((item) => item.id === id)),
    true,
    "并发创建的术语应全部保存",
  );
  const concurrentDeletes = await Promise.all(
    concurrentTermIds.map((id) => call(`/api/glossary/admin/${id}`, { method: "DELETE", token: rootToken })),
  );
  concurrentDeletes.forEach((result) => expectStatus(result, 200, "并发术语删除"));

  const task = await call("/api/tasks/admin", {
    method: "POST",
    token: rootToken,
    body: { chapter: "Vol.2 Ch.1", title: "隔离翻译任务", description: "用于验证认领、提交与审核流程" },
  });
  expectStatus(task, 201, "任务创建");
  const taskId = task.data.task.id;
  const member = await call("/api/admin/users", {
    method: "POST",
    token: rootToken,
    body: { username: memberUsername, displayName: "测试组员", password: memberPassword, permissions: ["tasks", "tutorial"], active: true },
  });
  expectStatus(member, 201, "组员创建");
  const memberId = member.data.user.id;
  const memberLogin = await call("/api/admin/login", {
    method: "POST",
    body: { username: memberUsername, password: memberPassword },
  });
  expectStatus(memberLogin, 200, "组员登录");
  let memberToken = memberLogin.data.token;
  expectStatus(await call("/api/admin/site-data/tutorial", { token: memberToken }), 200, "组员安装教程权限");
  expectStatus(await call("/api/admin/site-data/faq", { token: memberToken }), 403, "组员常见问题权限");
  expectStatus(
    await call("/api/admin/content/status", { method: "PUT", token: memberToken, body: versionStatus }),
    403,
    "组员维护状态权限",
  );
  expectStatus(await call(`/api/tasks/${taskId}/claim`, { method: "POST", token: memberToken }), 200, "任务认领");
  expectStatus(await call(`/api/tasks/${taskId}/submit`, { method: "POST", token: memberToken }), 200, "任务提交");
  expectStatus(
    await call(`/api/tasks/admin/${taskId}`, { method: "PUT", token: rootToken, body: { status: "approved" } }),
    200,
    "任务审核",
  );
  expectStatus(await call("/api/admin/users", { token: memberToken }), 403, "组员账号管理权限");
  expectStatus(await call("/api/admin/api-keys", { token: memberToken }), 403, "组员 API Key 权限");
  expectStatus(
    await call("/api/admin/settings", { method: "PUT", token: memberToken, body: adminContent.data.settings }),
    403,
    "组员站点设置权限",
  );

  const originalSettings = adminContent.data.settings;
  const restrictedSettings = structuredClone(originalSettings);
  restrictedSettings.backgroundDim = 47;
  restrictedSettings.moduleVisibility.feedback = "disabled";
  restrictedSettings.moduleVisibility.news = "admin";
  restrictedSettings.moduleVisibility.status = "admin";
  expectStatus(
    await call("/api/admin/settings", { method: "PUT", token: rootToken, body: restrictedSettings }),
    200,
    "模块可见性保存",
  );
  const restrictedAdminContent = await call("/api/content", { token: rootToken });
  assert.equal(restrictedAdminContent.data.settings.backgroundDim, 47);
  const restrictedPublicContent = await call("/api/content");
  assert.equal(restrictedPublicContent.data.settings.backgroundDim, 47);
  expectStatus(await call("/api/feedback"), 404, "关闭模块游客限制");
  expectStatus(await call("/api/feedback", { token: rootToken }), 200, "关闭模块管理员访问");
  expectStatus(await call(`/api/comments/${announcementId}`), 401, "仅管理员公告评论限制");
  const restrictedContent = await call("/api/content");
  assert.deepEqual(restrictedContent.data.news, []);
  assert.deepEqual(restrictedContent.data.status, { resources: [] });
  const cappedSettings = structuredClone(originalSettings);
  cappedSettings.backgroundDim = 999;
  const cappedResult = await call("/api/admin/settings", {
    method: "PUT",
    token: rootToken,
    body: cappedSettings,
  });
  expectStatus(cappedResult, 200, "背景压暗程度范围限制");
  assert.equal(cappedResult.data.value.backgroundDim, 80);
  const invalidSettings = structuredClone(originalSettings);
  invalidSettings.backgroundDim = "invalid";
  const invalidResult = await call("/api/admin/settings", {
    method: "PUT",
    token: rootToken,
    body: invalidSettings,
  });
  expectStatus(invalidResult, 200, "背景压暗程度无效值处理");
  assert.equal(invalidResult.data.value.backgroundDim, 0);
  expectStatus(
    await call("/api/admin/settings", { method: "PUT", token: rootToken, body: originalSettings }),
    200,
    "模块可见性恢复",
  );

  const apiKeyResult = await call("/api/admin/api-keys", {
    method: "POST",
    token: rootToken,
    body: { name: "隔离回归", rateLimitPerMin: 20, rateLimitPerHour: 100 },
  });
  expectStatus(apiKeyResult, 201, "API Key 创建");
  const apiKey = apiKeyResult.data.apiKey;
  const keyList = await call("/api/admin/api-keys", { token: rootToken });
  const keyEntry = keyList.data.find((item) => item.keyPreview === apiKeyResult.data.preview);
  assert.ok(keyEntry);
  expectStatus(await call("/api/v1/status", { apiKey }), 200, "API Key 调用");
  expectStatus(await call(`/api/admin/api-keys/${keyEntry.id}`, { method: "DELETE", token: rootToken }), 200, "API Key 吊销");
  expectStatus(await call("/api/v1/status", { apiKey }), 401, "吊销 API Key");

  expectStatus(
    await call(`/api/admin/users/${memberId}`, { method: "PATCH", token: rootToken, body: { password: replacementPassword } }),
    200,
    "组员密码重置",
  );
  expectStatus(await call("/api/admin/me", { token: memberToken }), 401, "密码重置撤销旧会话");
  expectStatus(
    await call("/api/admin/login", { method: "POST", body: { username: memberUsername, password: memberPassword } }),
    401,
    "旧组员密码失效",
  );
  const replacementLogin = await call("/api/admin/login", {
    method: "POST",
    body: { username: memberUsername, password: replacementPassword },
  });
  expectStatus(replacementLogin, 200, "新组员密码登录");
  memberToken = replacementLogin.data.token;
  expectStatus(
    await call(`/api/admin/users/${memberId}`, { method: "PATCH", token: rootToken, body: { active: false } }),
    200,
    "组员停用",
  );
  expectStatus(await call("/api/admin/me", { token: memberToken }), 401, "停用组员旧会话");
  expectStatus(
    await call(`/api/admin/users/${memberId}`, { method: "PATCH", token: rootToken, body: { active: true } }),
    200,
    "组员启用",
  );
  const enabledLogin = await call("/api/admin/login", {
    method: "POST",
    body: { username: memberUsername, password: replacementPassword },
  });
  expectStatus(enabledLogin, 200, "启用组员登录");
  expectStatus(await call(`/api/admin/users/${memberId}`, { method: "DELETE", token: rootToken }), 200, "组员删除");
  expectStatus(await call("/api/admin/me", { token: enabledLogin.data.token }), 401, "删除组员旧会话");

  expectStatus(await call("/api/admin/audit?limit=100", { token: rootToken }), 200, "安全审计");
  expectStatus(await call("/api/admin/visitors?limit=10", { token: rootToken }), 200, "访客记录");
  expectStatus(await call(`/api/tasks/admin/${taskId}`, { method: "DELETE", token: rootToken }), 200, "任务删除");

  console.log("API smoke test passed");
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    server.kill();
    await Promise.race([once(server, "exit"), delay(2_000)]);
  }
  await rm(dataDirectory, { recursive: true, force: true });
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const address = listener.address();
      const selectedPort = typeof address === "object" && address ? address.port : 0;
      listener.close((error) => (error ? reject(error) : resolve(selectedPort)));
    });
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`测试服务启动失败：${output.trim()}`);
    try {
      const response = await fetch(`${baseUrl}/api/content`);
      if (response.ok) return;
    } catch {
    }
    await delay(100);
  }
  throw new Error(`测试服务启动超时：${output.trim()}`);
}

async function call(route, options = {}) {
  const { token, apiKey, body, headers, ...requestOptions } = options;
  const response = await fetch(`${baseUrl}${route}`, {
    ...requestOptions,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

function expectStatus(result, expected, label) {
  assert.equal(result.response.status, expected, `${label}返回 ${result.response.status}`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
