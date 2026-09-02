const state = { publicFiles: [], adminFiles: [], admin: false, maxUploadBytes: 0 };
const $ = selector => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let current = value;
  let unit = -1;
  while (current >= 1024 && unit < units.length - 1) { current /= 1024; unit += 1; }
  return `${current.toFixed(current >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function platformLabel(value) {
  return { android: "ANDROID", windows: "WINDOWS", ios: "IOS", macos: "MACOS", other: "OTHER" }[value] || "OTHER";
}

function kindLabel(value) {
  return { installer: "安装包", patch: "补丁", resource: "资源包", launcher: "启动器", other: "其他" }[value] || "其他";
}

function showToast(message, tone = "") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function renderPublicList() {
  const list = $("#public-list");
  if (!state.publicFiles.length) {
    list.innerHTML = '<div class="empty-state"><span>NO PUBLIC PACKAGES</span><p>暂时没有已发布的安装包。</p></div>';
    updateMetrics();
    return;
  }
  list.innerHTML = state.publicFiles.map(file => `
    <article class="file-row">
      <div class="file-sigil">${escapeHtml(platformLabel(file.platform).slice(0, 2))}</div>
      <div class="file-main">
        <div class="file-title-line"><h3>${escapeHtml(file.name)}</h3><span class="version">v${escapeHtml(file.version || "未标注")}</span></div>
        <p>${escapeHtml(file.description || "未提供简介")}</p>
        <div class="file-meta"><span>${escapeHtml(platformLabel(file.platform))}</span><span>${escapeHtml(kindLabel(file.kind))}</span><span>${formatBytes(file.size)}</span><span>更新于 ${formatDate(file.updatedAt || file.createdAt)}</span></div>
      </div>
      <a class="icon-button download-link" href="${escapeHtml(file.downloadUrl)}" title="下载 ${escapeHtml(file.name)}" aria-label="下载 ${escapeHtml(file.name)}">↓</a>
    </article>
  `).join("");
  updateMetrics();
}

function renderAdminList() {
  const list = $("#admin-list");
  $("#admin-count").textContent = String(state.adminFiles.length);
  if (!state.adminFiles.length) {
    list.innerHTML = '<div class="admin-empty">还没有文件入库。</div>';
    return;
  }
  list.innerHTML = state.adminFiles.map(file => `
    <article class="admin-file-row" data-id="${escapeHtml(file.id)}">
      <div><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.version || "未标注")} · ${formatBytes(file.size)} · SHA ${escapeHtml(file.sha256.slice(0, 12))}…</small></div>
      <div class="admin-file-actions">
        <button class="mini-button toggle-publish" type="button" data-published="${file.published}" title="切换公开状态">${file.published ? "公开" : "隐藏"}</button>
        <button class="mini-button copy-link" type="button" title="复制下载链接">复制</button>
        <button class="mini-button danger delete-file" type="button" title="删除文件">删除</button>
      </div>
    </article>
  `).join("");
}

function updateMetrics() {
  const files = state.admin ? state.adminFiles : state.publicFiles;
  $("#metric-public").textContent = String(state.publicFiles.length).padStart(2, "0");
  $("#metric-size").textContent = formatBytes(files.reduce((sum, file) => sum + Number(file.size || 0), 0));
  $("#metric-latest").textContent = files[0] ? formatDate(files[0].createdAt) : "—";
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: text }; }
  if (!response.ok) throw new Error(body?.error || `请求失败（${response.status}）`);
  return body;
}

async function loadPublicFiles() {
  const platform = $("#platform-filter").value;
  const query = platform ? `?platform=${encodeURIComponent(platform)}` : "";
  const result = await api(`/api/files${query}`);
  state.publicFiles = result.files || [];
  renderPublicList();
}

async function loadAdminFiles() {
  const result = await api("/api/files");
  state.adminFiles = result.files || [];
  renderAdminList();
  updateMetrics();
}

function setAdminMode(enabled) {
  state.admin = enabled;
  $("#admin-panel").classList.toggle("is-hidden", !enabled);
  $("#login-toggle").classList.toggle("is-hidden", enabled);
  $("#logout-button").classList.toggle("is-hidden", !enabled);
}

async function checkSession() {
  try {
    await api("/api/auth/me");
    setAdminMode(true);
    await loadAdminFiles();
  } catch {
    setAdminMode(false);
  }
}

function uploadFile(form) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files");
    xhr.withCredentials = true;
    xhr.upload.addEventListener("progress", event => {
      if (!event.lengthComputable) return;
      $("#upload-progress").classList.remove("is-hidden");
      $("#upload-progress span").style.width = `${Math.round(event.loaded / event.total * 100)}%`;
    });
    xhr.addEventListener("load", () => {
      let body = null;
      try { body = JSON.parse(xhr.responseText); } catch { body = {}; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error || `上传失败（${xhr.status}）`));
    });
    xhr.addEventListener("error", () => reject(new Error("网络连接失败")));
    xhr.send(new FormData(form));
  });
}

$("#login-toggle").addEventListener("click", () => $("#login-dialog").showModal());
$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $("#login-message");
  message.textContent = "正在验证…";
  try {
    await api("/api/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    $("#login-dialog").close();
    form.reset();
    setAdminMode(true);
    await loadAdminFiles();
    showToast("管理员会话已建立", "success");
  } catch (error) {
    message.textContent = error.message;
  }
});

$("#logout-button").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  setAdminMode(false);
  state.adminFiles = [];
  showToast("已退出管理员会话");
});

$("#platform-filter").addEventListener("change", () => loadPublicFiles().catch(error => showToast(error.message, "error")));
$("#file-input").addEventListener("change", event => {
  const file = event.target.files[0];
  $("#file-label").textContent = file ? `${file.name} · ${formatBytes(file.size)}` : "选择安装包";
});
$("[name=visibility]").addEventListener("change", event => {
  $("[name=published]").disabled = event.target.checked;
  if (event.target.checked) $("[name=published]").checked = false;
});
$("#upload-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    await uploadFile(form);
    form.reset();
    $("#file-label").textContent = "选择安装包";
    $("#upload-progress").classList.add("is-hidden");
    $("#upload-progress span").style.width = "0%";
    await Promise.all([loadPublicFiles(), loadAdminFiles()]);
    showToast("文件已入库并完成 SHA-256 计算", "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

$("#admin-list").addEventListener("click", async event => {
  const button = event.target.closest("button");
  const row = event.target.closest("[data-id]");
  if (!button || !row) return;
  const file = state.adminFiles.find(item => item.id === row.dataset.id);
  if (!file) return;
  try {
    if (button.classList.contains("toggle-publish")) {
      await api(`/api/files/${file.id}`, { method: "PATCH", body: JSON.stringify({ published: !file.published, visibility: "public" }) });
      await Promise.all([loadPublicFiles(), loadAdminFiles()]);
      showToast(file.published ? "文件已隐藏" : "文件已公开", "success");
    }
    if (button.classList.contains("copy-link")) {
      await navigator.clipboard.writeText(new URL(file.downloadUrl, window.location.href).href);
      showToast("下载链接已复制", "success");
    }
    if (button.classList.contains("delete-file")) {
      if (!window.confirm(`确定删除“${file.name}”吗？删除后文件无法下载。`)) return;
      await api(`/api/files/${file.id}`, { method: "DELETE" });
      await Promise.all([loadPublicFiles(), loadAdminFiles()]);
      showToast("文件已删除", "success");
    }
  } catch (error) {
    showToast(error.message, "error");
  }
});

async function bootstrap() {
  try {
    const config = await api("/api/config");
    state.maxUploadBytes = config.maxUploadBytes;
    $("#max-upload-label").textContent = `UPLOAD LIMIT · ${formatBytes(config.maxUploadBytes)}`;
    await loadPublicFiles();
    await checkSession();
  } catch (error) {
    showToast(error.message, "error");
  }
}

bootstrap();
