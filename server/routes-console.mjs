import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";

const router = express.Router();

const DATA_FILE = path.join(config.dataDirectory, "user_resources.json");

// Helper: load user resources
async function loadUserResources() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      BAONLINE: {
        text: "cn",
        voice: "cn",
        media: "cn",
        updatedAt: new Date().toISOString(),
      },
    };
  }
}

// Helper: save user resources
async function saveUserResources(data) {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save user resources:", err);
  }
}

// Resolve UID from request (query, body, cookie)
function resolveUid(req) {
  let uid =
    req.query.uid ||
    req.query.user ||
    req.query.userId ||
    req.body?.uid ||
    req.body?.user ||
    req.body?.userId;

  if (typeof uid === "string" && uid.trim()) {
    return uid.trim();
  }

  // Cookie fallback
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)(?:uid|user|serverinfo)=([^;]+)/i);
    if (match?.[1]) {
      try {
        const decoded = decodeURIComponent(match[1]).trim();
        if (decoded && !/[=:{[\]}]/.test(decoded)) {
          return decoded;
        }
      } catch {
        // ignore
      }
    }
  }

  return "BAONLINE";
}

// Standardize config fields
function normalizeLocaleValue(val, fallback = "cn") {
  if (val === true) return "cn";
  if (val === false) return "jp";
  if (!val || typeof val !== "string") return fallback;
  const lower = val.trim().toLowerCase();
  if (lower === "cn" || lower === "jp" || lower === "kr" || lower === "default") {
    return lower;
  }
  return fallback;
}

// --- 1. /resource-api/get_resource ---
router.get("/resource-api/get_resource", async (req, res) => {
  const uid = resolveUid(req);
  const allUsers = await loadUserResources();
  const cfg = allUsers[uid] || { text: "cn", voice: "cn", media: "cn" };

  res.json({
    success: true,
    data: {
      user: uid,
      text: cfg.text.toUpperCase(),
      voice: cfg.voice === "default" ? "Default" : cfg.voice.toUpperCase(),
      media: cfg.media.toUpperCase(),
    },
  });
});

// --- 2. /resource-api/set_resource ---
router.post("/resource-api/set_resource", async (req, res) => {
  const uid = resolveUid(req);
  const allUsers = await loadUserResources();
  const prev = allUsers[uid] || { text: "cn", voice: "cn", media: "cn" };

  const updated = {
    text: req.body.text !== undefined ? normalizeLocaleValue(req.body.text, prev.text) : prev.text,
    voice: req.body.voice !== undefined ? normalizeLocaleValue(req.body.voice, prev.voice) : prev.voice,
    media: req.body.media !== undefined ? normalizeLocaleValue(req.body.media, prev.media) : prev.media,
    updatedAt: new Date().toISOString(),
  };

  allUsers[uid] = updated;
  await saveUserResources(allUsers);

  res.json({
    success: true,
    data: {
      user: uid,
      text: updated.text.toUpperCase(),
      voice: updated.voice === "default" ? "Default" : updated.voice.toUpperCase(),
      media: updated.media.toUpperCase(),
    },
  });
});

// --- 3. /config/get ---
router.get("/config/get", async (req, res) => {
  const uid = resolveUid(req);
  const allUsers = await loadUserResources();
  const cfg = allUsers[uid] || { text: "cn", voice: "cn", media: "cn" };

  res.json({
    env: "prod",
    text: cfg.text.toLowerCase(),
    voice: cfg.voice.toLowerCase(),
    media: cfg.media.toLowerCase(),
  });
});

// --- 4. /config/set ---
const handleConfigSet = async (req, res) => {
  const uid = resolveUid(req);
  const allUsers = await loadUserResources();
  const prev = allUsers[uid] || { text: "cn", voice: "cn", media: "cn" };

  const textVal = req.query.text ?? req.body.text;
  const voiceVal = req.query.voice ?? req.body.voice;
  const mediaVal = req.query.media ?? req.body.media;

  const updated = {
    text: textVal !== undefined ? normalizeLocaleValue(textVal, prev.text) : prev.text,
    voice: voiceVal !== undefined ? normalizeLocaleValue(voiceVal, prev.voice) : prev.voice,
    media: mediaVal !== undefined ? normalizeLocaleValue(mediaVal, prev.media) : prev.media,
    updatedAt: new Date().toISOString(),
  };

  allUsers[uid] = updated;
  await saveUserResources(allUsers);

  res.json({
    code: 200,
    msg: "OK",
    success: true,
    data: {
      uid,
      text: updated.text,
      voice: updated.voice,
      media: updated.media,
    },
  });
};

router.get("/config/set", handleConfigSet);
router.post("/config/set", handleConfigSet);

// --- 5. /status/list ---
router.get("/status/list", (req, res) => {
  res.json({
    android: {
      official: { version: "1.73.459696", time: "2026-09-23 12:10:01" },
      localized: { version: "1.73.459696", time: "2026-09-23 13:03:43" },
    },
    windows: {
      official: { version: "1.73.459696", time: "2026-09-23 12:10:02" },
      localized: { version: "1.73.459696", time: "2026-09-23 12:38:37" },
    },
    text: {
      official: { version: "r96_nvji95owgkbcxlmkb8mi", time: "2026-10-07 10:25:07" },
      localized: { version: "r96_nvji95owgkbcxlmkb8mi", time: "2026-10-13 01:02:09" },
    },
    voice: {
      official: { version: "r96_nvji95owgkbcxlmkb8mi", time: "2026-10-07 10:25:07" },
      localized: { version: "r96_nvji95owgkbcxlmkb8mi", time: "2026-10-07 15:54:15" },
    },
    media: {
      official: { version: "r96_nvji95owgkbcxlmkb8mi", time: "2026-10-07 10:25:07" },
      localized: { version: "r96_nvji95owgkbcxlmkb8mi", time: "2026-10-07 16:38:28" },
    },
  });
});

// Cache for upstream notice index
let noticeIndexCache = null;
let noticeIndexCacheTime = 0;

// --- 6. /prod/index.json & /notice/index.json ---
const handleNoticeIndex = async (req, res) => {
  const uid = resolveUid(req);
  const now = Date.now();

  let baseData = null;
  if (noticeIndexCache && now - noticeIndexCacheTime < 60000) {
    baseData = JSON.parse(JSON.stringify(noticeIndexCache));
  } else {
    try {
      const resp = await fetch("https://prod-noticeindex.bluearchive.cafe/prod/index.json", {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(4000),
      });
      if (resp.ok) {
        baseData = await resp.json();
        noticeIndexCache = JSON.parse(JSON.stringify(baseData));
        noticeIndexCacheTime = now;
      }
    } catch {
      // fallback
    }
  }

  if (!baseData) {
    baseData = {
      Notices: [
        {
          NoticeId: 1065,
          StartDate: "2026-10-01T15:00:00",
          EndDate: "2026-10-31T23:00:00",
          Url: "https://hh.flha.ru/prod/1065/3706/index32901686.html",
          Title: "学生生日日历",
          DisplayOrder: 0,
        },
        {
          NoticeId: 1069,
          StartDate: "2026-10-19T19:00:00",
          EndDate: "2026-10-25T19:00:00",
          Url: "https://hh.flha.ru/prod/1069/3713/index474736377.html",
          Title: "第九次Live直播信息",
          DisplayOrder: 0,
        },
      ],
      Events: [
        {
          NoticeId: 1066,
          StartDate: "2026-10-06T14:00:00",
          EndDate: "2026-10-21T11:00:00",
          Url: "https://hh.flha.ru/prod/1066/3710/index215574367.html",
          Title: "限时招募",
          DisplayOrder: 0,
        },
      ],
      Issues: [],
      Maintenance: {
        StartDate: "2026-10-07T10:00:00",
        EndDate: "2026-10-07T16:00:00",
        Text: "维护已完成",
      },
      Banners: [],
      GuidePopup: [],
    };
  }

  // Rewrite URLs to our official domain
  const rewriteUrl = (u) => {
    if (typeof u !== "string") return u;
    return u.replace(/https?:\/\/prod-notice\.bluearchive\.cafe/g, "https://hh.flha.ru/prod");
  };

  if (Array.isArray(baseData.Notices)) {
    baseData.Notices = baseData.Notices.map((n) => ({
      ...n,
      Url: rewriteUrl(n.Url),
    }));
  }

  // Ensure Events has our own 控制面板
  const events = Array.isArray(baseData.Events)
    ? baseData.Events.filter((e) => e.Title !== "控制面板" && !e.Url?.includes("dash.bluearchive.cafe"))
    : [];

  events.push({
    NoticeId: 0,
    StartDate: "2026-01-01T00:00:00",
    EndDate: "2099-12-31T23:59:59",
    Url: `https://hh.flha.ru/console?uid=${encodeURIComponent(uid)}`,
    Title: "控制面板",
    DisplayOrder: 0,
  });
  baseData.Events = events;

  // Ensure Issues has our UID link
  baseData.Issues = [
    {
      NoticeId: 0,
      StartDate: "2026-01-01T00:00:00",
      EndDate: "2099-12-31T23:59:59",
      Url: "https://hh.flha.ru/guide",
      Title: `UID: ${uid}`,
      DisplayOrder: 0,
    },
  ];

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json(baseData);
};

router.get("/prod/index.json", handleNoticeIndex);
router.get("/notice/index.json", handleNoticeIndex);

// --- 6.1 ServerInfo endpoint for GameMainConfig redirect ---
router.get("/:fileName.json", (req, res, next) => {
  if (req.params.fileName.startsWith("r96_") || req.params.fileName.includes("serverinfo")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json({
      ConnectionGroups: [
        {
          Name: "Prod-Audit",
          ManagementDataUrl: "https://hh.flha.ru/prod/index.json",
          IsProductionAddressables: true,
          ApiUrl: "https://prod-game.bluearchiveyostar.com:5000/api/",
          GatewayUrl: "https://prod-gateway.bluearchiveyostar.com:5100/api/",
          KibanaLogUrl: "https://prod-logcollector.bluearchiveyostar.com:5300",
          ProhibitedWordBlackListUri: "https://prod-notice.bluearchiveyostar.com/prod/ProhibitedWord/blacklist.csv",
          ProhibitedWordWhiteListUri: "https://prod-notice.bluearchiveyostar.com/prod/ProhibitedWord/whitelist.csv",
          CustomerServiceUrl: "https://bluearchive.jp/contact-1-hint",
          OverrideConnectionGroups: [
            {
              Name: "1.0",
              AddressablesCatalogUrlRoot: "https://prod-clientpatch.bluearchiveyostar.com/m28_1_0_1_mashiro3",
            },
            {
              Name: "1.73",
              AddressablesCatalogUrlRoot: "https://prod-clientpatch.bluearchiveyostar.com/r96_nvji95owgkbcxlmkb8mi",
            },
          ],
          BundleVersion: "s8tloc7lo3",
          IsLivePublished: true,
        },
      ],
    });
  }
  next();
});

// --- 7. Proxy notice HTML pages ---
router.get("/prod/:noticeId/:subId/:file", async (req, res) => {
  const { noticeId, subId, file } = req.params;
  const upstreamUrl = `https://prod-notice.bluearchive.cafe/prod/${noticeId}/${subId}/${file}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send("Notice not found");
    }

    let html = await upstream.text();
    // Clean any cafe domain watermarks
    html = html.replace(/bluearchive\.cafe/g, "hh.flha.ru");
    html = html.replace(/蔚蓝咖啡厅/g, "蔚蓝档案官方本地化");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    res.status(502).send("Notice proxy error: " + err.message);
  }
});

export { router as consoleRoutes };
