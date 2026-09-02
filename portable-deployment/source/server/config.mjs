import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT 必须是 1-65535 之间的整数");
}
if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
  throw new Error("生产环境必须配置 ADMIN_PASSWORD");
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn("ADMIN_PASSWORD 未配置，当前使用开发占位密码");
}

export const config = {
  root: path.resolve(directory, ".."),
  port,
  adminUser: process.env.ADMIN_USER || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "change-this-admin-password",
  dataDirectory: path.resolve(process.env.DATA_DIR || path.join(directory, "data")),
  sessionTtlMs: 1000 * 60 * 60 * 12,
  trustProxy: process.env.TRUST_PROXY === "true",
  qqOAuthAppId: process.env.QQ_OAUTH_APP_ID || "",
  qqOAuthAppSecret: process.env.QQ_OAUTH_APP_SECRET || "",
  qqOAuthRedirectUri: process.env.QQ_OAUTH_REDIRECT_URI || "",
};

export const contentNames = ["news", "download", "team", "status"];
export const siteDataNames = ["tutorial", "faq", "antiCheat"];
export const siteDataFiles = {
  tutorial: "tutorial.json",
  faq: "faq.json",
  antiCheat: "anti-cheat.json",
};
export const settingsName = "settings";
