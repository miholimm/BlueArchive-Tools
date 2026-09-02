import {
  Activity,
  BookOpen,
  Check,
  Copy,
  Eye,
  HelpCircle,
  Image,
  Key,
  LayoutDashboard,
  Link2,
  ListTodo,
  LogIn,
  LogOut,
  Megaphone,
  MessageSquare,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRefreshContent } from "../lib/ContentContext";
import {
  adminLogin,
  adminLogout,
  getContent,
  isAdmin,
  saveAdmin,
  authFetch,
  getAdminMe,
  type SiteContent,
} from "../lib/api";
import CountUp from "../components/CountUp";
import AdminUsersTab from "../components/AdminUsersTab";
import AdminStatusEditor from "../components/AdminStatusEditor";
import AdminTutorialEditor from "../components/AdminTutorialEditor";
import AdminFaqEditor from "../components/AdminFaqEditor";
import AdminAntiCheatEditor from "../components/AdminAntiCheatEditor";
import type { AdminIdentity, AdminPermission } from "../data/adminPermissions";
import { defaultModuleVisibility, siteModuleDefinitions } from "../data/siteModules";
import type { ModuleVisibility, SiteSettings, VisibilityMode } from "../types";
import type {
  ApiKeyEntry,
  CommentItem,
  FeedbackItem,
  GlossaryTerm,
  NewsItem,
  QAQuestion,
  StatusData,
  TaskEntry,
} from "../types";

const emptyNews: NewsItem = {
  id: "",
  title: "",
  date: new Date().toISOString().slice(0, 10),
  author: "",
  cover: "",
  content: "",
};

type Toast = { id: number; message: string; type: "success" | "error" };

const adminTabTitles: Record<string, string> = {
  news: "公告管理",
  download: "下载链接",
  status: "维护状态",
  tutorial: "安装教程",
  faq: "常见问题",
  antiCheat: "反作弊追踪",
  settings: "站点视觉",
  overview: "数据概览",
  visitors: "访问记录",
  comments: "评论审核",
  feedback: "反馈管理",
  apiKeys: "API 管理",
  tasks: "任务管理",
  glossary: "术语管理",
  "qa-admin": "问答审核",
  admins: "组员账号",
  security: "安全中心",
};

export default function Admin() {
  const [logged, setLogged] = useState(isAdmin());
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("news");
  const [content, setContent] = useState<SiteContent>();
  const refreshContent = useRefreshContent();
  const [contentError, setContentError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [newsDraft, setNewsDraft] = useState<NewsItem>(emptyNews);
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>({
    siteTitle: "",
    siteSubtitle: "",
    wallpaper: "",
    backgroundDim: 0,
    accent: "cyan",
    theme: "system",
    moduleVisibility: defaultModuleVisibility,
  });
  const [saved, setSaved] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [identity, setIdentity] = useState<AdminIdentity>();
  useEffect(() => {
    if (!logged) return;
    let active = true;
    setContentError("");
    const load = async () => {
      const session = await getAdminMe().catch(() => null);
      if (!session) {
        localStorage.removeItem("ba_admin_token");
        localStorage.removeItem("ba_admin_identity");
        if (active) {
          setError("登录状态已过期，请重新登录");
          setLogged(false);
        }
        return;
      }
      setIdentity(session);
      const value = await getContent();
      if (!active) return;
      setContent(value);
      setSettingsDraft(value.settings);
    };
    load().catch((value) => {
      if (active)
        setContentError(
          value instanceof Error ? value.message : "内容读取失败",
        );
    });
    return () => {
      active = false;
    };
  }, [logged, reloadKey]);
  const can = (permission: AdminPermission) => Boolean(identity?.isRoot || identity?.permissions.includes(permission));
  const navItems = [
    { id: "news", permission: "news" as AdminPermission, icon: Megaphone, label: "公告管理" },
    { id: "download", permission: "downloads" as AdminPermission, icon: Link2, label: "下载链接" },
    { id: "status", permission: "status" as AdminPermission, icon: Activity, label: "维护状态" },
    { id: "tutorial", permission: "tutorial" as AdminPermission, icon: BookOpen, label: "安装教程" },
    { id: "faq", permission: "faq" as AdminPermission, icon: HelpCircle, label: "常见问题" },
    { id: "antiCheat", permission: "antiCheat" as AdminPermission, icon: ShieldAlert, label: "反作弊追踪" },
    { id: "settings", permission: "settings" as AdminPermission, icon: Image, label: "站点视觉" },
    { id: "overview", permission: null, icon: LayoutDashboard, label: "数据概览" },
    { id: "visitors", permission: "visitors" as AdminPermission, icon: Eye, label: "访问记录" },
    { id: "comments", permission: "comments" as AdminPermission, icon: MessageSquare, label: "评论审核" },
    { id: "feedback", permission: "feedback" as AdminPermission, icon: ThumbsUp, label: "反馈管理" },
    { id: "apiKeys", permission: "apiKeys" as AdminPermission, icon: Key, label: "API 管理" },
    { id: "tasks", permission: "tasks" as AdminPermission, icon: ListTodo, label: "任务管理" },
    { id: "glossary", permission: "glossary" as AdminPermission, icon: BookOpen, label: "术语管理" },
    { id: "qa-admin", permission: "qa" as AdminPermission, icon: HelpCircle, label: "问答审核" },
    ...(identity?.isRoot ? [{ id: "admins", permission: null, icon: ShieldCheck, label: "组员账号" }] : []),
    { id: "security", permission: "security" as AdminPermission, icon: ShieldAlert, label: "安全中心" },
  ].filter((item) => !item.permission || can(item.permission));
  useEffect(() => {
    if (!identity) return;
    if (navItems.length && !navItems.some((item) => item.id === tab)) setTab(navItems[0].id);
  }, [identity, tab]);
  if (!logged)
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <div className="brand-mark">BA</div>
          <span className="eyebrow">CONTROL ROOM / ADMIN</span>
          <h1>管理后台</h1>
          <p>登录后可管理公告、下载、维护状态、安装教程、常见问题、反作弊追踪和站点设置。</p>
          <label>
            管理员账号
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            管理员密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <div className="admin-error">{error}</div>}
          <button
            className="button button-primary admin-submit"
            onClick={async () => {
              try {
                await adminLogin(username, password);
                setError("");
                setContent(undefined);
                setLogged(true);
              } catch (value) {
                setError(value instanceof Error ? value.message : "登录失败");
              }
            }}
          >
            <LogIn size={16} /> 登录控制台
          </button>
        </div>
      </main>
    );
  if (!content)
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <span className="eyebrow">
            {contentError ? "CONTENT ERROR" : "LOADING"}
          </span>
          <h1>{contentError ? "内容读取失败" : "正在读取内容"}</h1>
          {contentError && <p className="admin-error">{contentError}</p>}
          {contentError && (
            <button
              className="button button-primary admin-submit"
              onClick={() => {
                setContentError("");
                setReloadKey((value) => value + 1);
              }}
            >
              <RefreshCw size={16} /> 重新读取
            </button>
          )}
        </div>
      </main>
    );
  const notify = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      2600,
    );
  };
  const addNews = () => {
    if (!newsDraft.title.trim() || !newsDraft.content.trim()) {
      notify("请至少填写公告标题和正文", "error");
      return;
    }
    setContent({
      ...content,
      news: [{ ...newsDraft, id: String(Date.now()) }, ...content.news],
    });
    setNewsDraft({ ...emptyNews, date: new Date().toISOString().slice(0, 10) });
    notify("新公告已加入草稿，请保存全部");
  };
  const saveNews = async () => {
    try {
      await saveAdmin("content/news", content.news);
      await refreshContent().catch(() => {});
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      notify("公告已保存");
    } catch {
      setSaved(false);
      notify("保存失败，请重试", "error");
    }
  };
  const updateNews = (index: number, value: Partial<NewsItem>) =>
    setContent({
      ...content,
      news: content.news.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...value } : item,
      ),
    });
  return (
    <main className="admin-shell">
      <aside className="admin-side">
        <div className="brand">
          <span className="brand-mark">BA</span>
          <span>
            <strong>管理后台</strong>
            <small>CONTROL ROOM</small>
          </span>
        </div>
        <div className="admin-nav">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
        <a className="admin-back" href="/">
          返回网站首页
        </a>
      </aside>
      <section className="admin-main">
        <header className="admin-header">
          <div>
            <span className="eyebrow">BLUE ARCHIVE / ADMIN</span>
            <h1>{adminTabTitles[tab] || "数据概览"}</h1>
          </div>
          <div className="admin-online">
            <span className="live-dot" /> {identity?.displayName || identity?.username || "ADMIN"}
            <button className="button button-ghost button-sm" onClick={async () => { await adminLogout(); setLogged(false); setIdentity(undefined); }}>
              <LogOut size={14} /> 退出
            </button>
          </div>
        </header>
        {tab === "news" && (
          <NewsEditor
            notify={notify}
            content={content}
            setContent={setContent}
            saved={saved}
            saveNews={saveNews}
            updateNews={updateNews}
            newsDraft={newsDraft}
            setNewsDraft={setNewsDraft}
            addNews={addNews}
          />
        )}
        {tab === "download" && (
          <DownloadEditor
            notify={notify}
            refreshContent={refreshContent}
            content={content}
            setContent={setContent}
          />
        )}
        {tab === "status" && (
          <AdminStatusEditor
            value={content.status}
            notify={notify}
            onSaved={async (value) => {
              setContent({ ...content, status: value });
              await refreshContent().catch(() => {});
            }}
          />
        )}
        {tab === "tutorial" && <AdminTutorialEditor notify={notify} />}
        {tab === "faq" && <AdminFaqEditor notify={notify} />}
        {tab === "antiCheat" && <AdminAntiCheatEditor notify={notify} />}
        {tab === "settings" && (
          <SettingsEditor
            notify={notify}
            refreshContent={refreshContent}
            settingsDraft={settingsDraft}
            setSettingsDraft={setSettingsDraft}
          />
        )}
        {tab === "overview" && <OverviewTab content={content} />}
        {tab === "visitors" && <VisitorTab />}
        {tab === "comments" && <CommentReviewTab notify={notify} />}
        {tab === "feedback" && <FeedbackManageTab notify={notify} />}
        {tab === "apiKeys" && <ApiKeyTab notify={notify} />}
        {tab === "tasks" && <TaskManageTab notify={notify} isRoot={Boolean(identity?.isRoot)} />}
        {tab === "glossary" && <GlossaryManageTab notify={notify} />}
        {tab === "qa-admin" && <QAAdminTab notify={notify} />}
        {tab === "admins" && identity?.isRoot && <AdminUsersTab notify={notify} />}
        {tab === "security" && <SecurityCenter notify={notify} isRoot={Boolean(identity?.isRoot)} />}
      </section>
      {toasts.length > 0 && (
        <div className="admin-toast-wrap">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={
                t.type === "error"
                  ? "admin-toast admin-toast-error"
                  : "admin-toast"
              }
            >
              {t.type === "error" ? <X size={15} /> : <Check size={15} />}{" "}
              {t.message}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ── News Editor ──
function NewsEditor({
  content,
  setContent,
  saved,
  saveNews,
  addNews,
  updateNews,
  notify,
  newsDraft,
  setNewsDraft,
}: {
  content: SiteContent;
  setContent: (v: SiteContent) => void;
  saved: boolean;
  saveNews: () => void;
  addNews: () => void;
  updateNews: (index: number, value: Partial<NewsItem>) => void;
  notify: (message: string, type?: "success" | "error") => void;
  newsDraft: NewsItem;
  setNewsDraft: (value: NewsItem) => void;
}) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>更新公告</h2>
          <p>支持 Markdown 内容，修改后立即同步到前台。</p>
        </div>
        <div className="panel-actions">
          {saved && (
            <span className="saved-tip">
              <Check size={15} /> 已保存
            </span>
          )}
          <button className="button button-primary" onClick={saveNews}>
            <Save size={15} /> 保存全部
          </button>
        </div>
      </div>
      <div className="news-editor-list">
        {content.news.map((item, index) => (
          <div className="news-editor" key={item.id}>
            <div className="editor-number">0{index + 1}</div>
            <div className="editor-fields">
              <input
                value={item.title}
                onChange={(event) =>
                  updateNews(index, { title: event.target.value })
                }
                placeholder="公告标题"
              />
              <div className="editor-row">
                <input
                  value={item.date}
                  onChange={(event) =>
                    updateNews(index, { date: event.target.value })
                  }
                  placeholder="日期"
                />
                <input
                  value={item.author}
                  onChange={(event) =>
                    updateNews(index, { author: event.target.value })
                  }
                  placeholder="作者"
                />
              </div>
              <input
                value={item.cover}
                onChange={(event) =>
                  updateNews(index, { cover: event.target.value })
                }
                placeholder="封面图片 URL"
              />
              <textarea
                value={item.content}
                onChange={(event) =>
                  updateNews(index, { content: event.target.value })
                }
                placeholder="Markdown 正文…"
              />
            </div>
          </div>
        ))}
        <div className="news-editor new-editor">
          <div className="editor-number">+</div>
          <div className="editor-fields">
            <input
              value={newsDraft.title}
              onChange={(event) =>
                setNewsDraft({ ...newsDraft, title: event.target.value })
              }
              placeholder="新公告标题"
            />
            <input
              value={newsDraft.date}
              onChange={(event) =>
                setNewsDraft({ ...newsDraft, date: event.target.value })
              }
              placeholder="日期"
            />
            <input
              value={newsDraft.author}
              onChange={(event) =>
                setNewsDraft({ ...newsDraft, author: event.target.value })
              }
              placeholder="作者"
            />
            <input
              value={newsDraft.cover}
              onChange={(event) =>
                setNewsDraft({ ...newsDraft, cover: event.target.value })
              }
              placeholder="封面图片 URL（可选）"
            />
            <textarea
              value={newsDraft.content}
              onChange={(event) =>
                setNewsDraft({ ...newsDraft, content: event.target.value })
              }
              placeholder="Markdown 正文"
            />
          </div>
          <button className="button button-primary" onClick={addNews}>
            添加新公告
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Download Editor ──
function DownloadEditor({
  content,
  setContent,
  notify,
  refreshContent,
}: {
  content: SiteContent;
  setContent: (value: SiteContent) => void;
  notify: (message: string, type?: "success" | "error") => void;
  refreshContent: () => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const platforms = Object.keys(content.download) as Array<
    keyof SiteContent["download"]
  >;
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>下载资源</h2>
          <p>直接编辑前台下载卡片的版本、说明和目标地址。</p>
        </div>
        <button
          className="button button-primary"
          onClick={async () => {
            try {
              await saveAdmin("content/download", content.download);
              await refreshContent().catch(() => {});
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
              notify("下载资源已保存");
            } catch {
              setSaved(false);
              notify("保存失败，请重试", "error");
            }
          }}
        >
          <Save size={15} /> {saved ? "已保存" : "保存全部"}
        </button>
      </div>
      {platforms.map((platform) => (
        <div className="download-editor-group" key={platform}>
          <h3>{platform.toUpperCase()}</h3>
          {content.download[platform].map((item, index) => (
            <div className="download-editor-row" key={`${platform}-${index}`}>
              <input
                value={item.name}
                onChange={(event) =>
                  setContent({
                    ...content,
                    download: {
                      ...content.download,
                      [platform]: content.download[platform].map(
                        (entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, name: event.target.value }
                            : entry,
                      ),
                    },
                  })
                }
              />
              <input
                value={item.version}
                onChange={(event) =>
                  setContent({
                    ...content,
                    download: {
                      ...content.download,
                      [platform]: content.download[platform].map(
                        (entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, version: event.target.value }
                            : entry,
                      ),
                    },
                  })
                }
              />
              <input
                className="wide-input"
                value={item.url}
                onChange={(event) =>
                  setContent({
                    ...content,
                    download: {
                      ...content.download,
                      [platform]: content.download[platform].map(
                        (entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, url: event.target.value }
                            : entry,
                      ),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

// ── Settings Editor ──
function SettingsEditor({
  settingsDraft,
  setSettingsDraft,
  notify,
  refreshContent,
}: {
  settingsDraft: SiteSettings;
  setSettingsDraft: (v: SiteSettings) => void;
  notify: (message: string, type?: "success" | "error") => void;
  refreshContent: () => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>站点视觉</h2>
            <p>自定义站点标题、副标题、壁纸、主题色与模块访问策略。</p>
        </div>
        <button
          className="button button-primary"
          onClick={async () => {
            try {
              await saveAdmin("settings", settingsDraft);
              await refreshContent().catch(() => {});
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
              notify("站点视觉已保存");
            } catch {
              setSaved(false);
              notify("保存失败，请重试", "error");
            }
          }}
        >
          <Save size={15} /> {saved ? "已保存" : "保存全部"}
        </button>
      </div>
      <div className="settings-editor">
        <label>
          站点标题
          <input
            value={settingsDraft.siteTitle}
            onChange={(e) =>
              setSettingsDraft({ ...settingsDraft, siteTitle: e.target.value })
            }
          />
        </label>
        <label>
          站点副标题
          <input
            value={settingsDraft.siteSubtitle}
            onChange={(e) =>
              setSettingsDraft({
                ...settingsDraft,
                siteSubtitle: e.target.value,
              })
            }
          />
        </label>
        <label>
          壁纸 URL
          <input
            value={settingsDraft.wallpaper}
            onChange={(e) =>
              setSettingsDraft({ ...settingsDraft, wallpaper: e.target.value })
            }
          />
        </label>
        <label className="background-dim-control">
          <span>全站背景压暗程度 <strong>{settingsDraft.backgroundDim}%</strong></span>
          <input
            type="range"
            min="0"
            max="80"
            step="1"
            value={settingsDraft.backgroundDim}
            style={{
              "--background-dim-progress": String(
                `${(settingsDraft.backgroundDim / 80) * 100}%`,
              ),
            } as React.CSSProperties}
            onChange={(e) =>
              setSettingsDraft({
                ...settingsDraft,
                backgroundDim: Number(e.target.value),
              })
            }
          />
          <small>仅压暗站点底色与自定义壁纸，不影响文字、卡片和按钮。</small>
        </label>
        {settingsDraft.wallpaper && (
          <div
            className="wallpaper-preview"
            style={{
              backgroundImage: `linear-gradient(rgba(15,23,42,${settingsDraft.backgroundDim / 100}), rgba(15,23,42,${settingsDraft.backgroundDim / 100})), url(${settingsDraft.wallpaper})`,
            }}
          />
        )}
        <label>
          主题色
          <input
            value={settingsDraft.accent}
            onChange={(e) =>
              setSettingsDraft({ ...settingsDraft, accent: e.target.value })
            }
          />
        </label>
        <label>
          默认显示模式
          <select
            value={settingsDraft.theme}
            onChange={(event) =>
              setSettingsDraft({
                ...settingsDraft,
                theme: event.target.value as SiteSettings["theme"],
              })
            }
          >
            <option value="system">跟随设备</option>
            <option value="light">日间学园</option>
            <option value="dark">夜间特别行动</option>
          </select>
        </label>
      </div>
      <div className="settings-access-panel">
        <div className="settings-access-heading">
          <div>
            <span className="admin-section-kicker"><SlidersHorizontal size={14} /> ACCESS POLICY</span>
            <h3>模块访问策略</h3>
            <p>控制游客是否可以看到各个站点模块。协作工作台和历史归档始终仅限管理员。</p>
          </div>
          <LockKeyhole size={20} />
        </div>
        <div className="settings-module-grid">
          {siteModuleDefinitions.map((module) => {
            const locked = module.lockedVisibility
            const value = locked || settingsDraft.moduleVisibility?.[module.id] || module.defaultVisibility
            return (
              <label className="settings-module-row" key={module.id}>
                <span>
                  <strong>{module.label}</strong>
                  <small>{module.description}</small>
                </span>
                <select
                  value={value}
                  disabled={Boolean(locked)}
                  onChange={(event) => setSettingsDraft({
                    ...settingsDraft,
                    moduleVisibility: {
                      ...settingsDraft.moduleVisibility,
                      [module.id]: event.target.value as VisibilityMode,
                    },
                  })}
                >
                  <option value="public">游客可见</option>
                  <option value="admin">仅管理员</option>
                  <option value="disabled">关闭模块</option>
                </select>
              </label>
            )
          })}
        </div>
      </div>
    </section>
  );
}

// ── Overview Tab ──
function OverviewTab({ content }: { content: SiteContent }) {
  return (
    <section className="admin-stats">
      <div>
        <span>公告总数</span>
        <strong>
          <CountUp value={content.news.length} />
        </strong>
      </div>
      <div>
        <span>下载资源</span>
        <strong>
          <CountUp value={Object.values(content.download).flat().length} />
        </strong>
      </div>
      <div>
        <span>团队成员</span>
        <strong>
          <CountUp
            value={Array.isArray(content.team) ? content.team.length : 0}
          />
        </strong>
      </div>
    </section>
  );
}

// ── Visitor Tab ──
type VisitorEntry = {
  ip: string;
  path: string;
  ua: string;
  ref: string;
  time: string;
};

function VisitorTab() {
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitors();
    const timer = setInterval(fetchVisitors, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchVisitors = async () => {
    try {
      const r = await authFetch("/api/admin/visitors?limit=100");
      if (r.ok) setVisitors(await r.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const uaShort = (ua: string) => {
    if (!ua) return "-";
    if (ua.includes("Mobile")) return "Mobile";
    if (ua.includes("Windows")) return "Win";
    if (ua.includes("Mac")) return "Mac";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("curl")) return "curl";
    if (ua.includes("bot") || ua.includes("Bot")) return "Bot";
    return ua.slice(0, 20);
  };

  const formatTime = (t: string) => {
    try {
      const d = new Date(t);
      return d.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return t;
    }
  };

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>访问记录</h2>
          <p>最近 100 条页面访问记录，每 30 秒自动刷新。</p>
        </div>
        <div className="panel-actions">
          <span className="saved-tip">
            {loading ? "加载中..." : `${visitors.length} 条记录`}
          </span>
          <button className="button button-primary" onClick={fetchVisitors}>
            <Save size={15} /> 刷新
          </button>
        </div>
      </div>
      <div className="visitor-table-wrap">
        <table className="visitor-table">
          <thead>
            <tr>
              <th>IP 地址</th>
              <th>访问路径</th>
              <th>设备</th>
              <th>来源</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {visitors.length === 0 ? (
              <tr>
                <td colSpan={5} className="visitor-empty">
                  暂无访问记录
                </td>
              </tr>
            ) : (
              visitors.map((v, i) => (
                <tr key={i}>
                  <td className="visitor-ip">{v.ip}</td>
                  <td className="visitor-path">{v.path}</td>
                  <td>{uaShort(v.ua)}</td>
                  <td className="visitor-ref">
                    {v.ref ? v.ref.slice(0, 40) : "-"}
                  </td>
                  <td className="visitor-time">{formatTime(v.time)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Comment Review Tab ──
function CommentReviewTab({
  notify,
}: {
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const r = await authFetch("/api/admin/comments/pending");
      if (r.ok) setComments(await r.json());
    } catch {
      /* server may not be running */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    try {
      const r = await authFetch(`/api/admin/comments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("bad status");
      notify(status === "approved" ? "评论已通过" : "评论已拒绝");
    } catch {
      notify("操作失败，请重试", "error");
    }
    fetchComments();
  };

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>评论审核</h2>
          <p>审核用户提交的公告评论。</p>
        </div>
        <button className="button button-primary" onClick={fetchComments}>
          刷新
        </button>
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>加载中…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)", padding: "20px 0" }}>
          暂无待审核评论
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {comments.map((c: CommentItem) => (
            <div
              key={c.id}
              className="news-editor"
              style={{ display: "block" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong style={{ fontSize: 13 }}>{c.author}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--ink-muted)",
                      marginLeft: 12,
                    }}
                  >
                    {new Date(c.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  margin: "0 0 12px",
                  lineHeight: 1.6,
                }}
              >
                {c.content}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="button button-primary button-sm"
                  onClick={() => handleReview(c.id, "approved")}
                >
                  通过
                </button>
                <button
                  className="button button-ghost button-sm"
                  onClick={() => handleReview(c.id, "rejected")}
                >
                  拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Feedback Management Tab ──
function FeedbackManageTab({
  notify,
}: {
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const fetchItems = async () => {
    try {
      const r = await authFetch("/api/admin/feedback");
      const value = await r.json().catch(() => null);
      if (!r.ok) throw new Error(value?.message || value?.error || `读取失败（${r.status}）`);
      setItems(Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "反馈读取失败", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAction = async (id: string, updates: Partial<FeedbackItem>) => {
    try {
      const r = await authFetch(`/api/admin/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      const value = await r.json().catch(() => null);
      if (!r.ok) throw new Error(value?.message || value?.error || `操作失败（${r.status}）`);
      const label =
        updates.status === "adopted"
          ? "反馈已采纳"
          : updates.status === "replied"
            ? "回复已发送"
            : "反馈已拒绝";
      notify(label);
      await fetchItems();
      setReplyText((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "操作失败，请重试", "error");
    }
  };

  const filtered =
    statusFilter === "all"
      ? items
      : items.filter((f) => f.status === statusFilter);

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>反馈管理</h2>
          <p>管理用户提交的翻译反馈。</p>
        </div>
        <div className="panel-actions">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              border: "1px solid var(--border-subtle)",
              background: "var(--glass-input)",
              color: "var(--ink)",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="replied">已回复</option>
            <option value="adopted">已采纳</option>
            <option value="rejected">已拒绝</option>
          </select>
          <button className="button button-primary" onClick={fetchItems}>
            刷新
          </button>
        </div>
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>加载中…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)", padding: "20px 0" }}>
          暂无匹配的反馈
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((f: FeedbackItem) => (
            <div
              key={f.id}
              className="news-editor"
              style={{ display: "block" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong style={{ fontSize: 13 }}>{f.chapter}</strong>
                <span
                  className={`feedback-status feedback-status-${f.status}`}
                  style={{ fontSize: 11 }}
                >
                  {f.status}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-dim)",
                  marginBottom: 4,
                }}
              >
                原文：{f.original}
              </div>
              {f.translation && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-dim)",
                    marginBottom: 4,
                  }}
                >
                  译文：{f.translation}
                </div>
              )}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  marginBottom: 8,
                }}
              >
                建议：{f.suggestion}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-muted)",
                  marginBottom: 10,
                }}
              >
                {new Date(f.createdAt).toLocaleString("zh-CN")}
              </div>
              {/* Reply input */}
              <textarea
                value={replyText[f.id] || ""}
                onChange={(e) =>
                  setReplyText((prev) => ({ ...prev, [f.id]: e.target.value }))
                }
                placeholder="回复内容（可选）"
                rows={2}
                style={{
                  width: "100%",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--glass-input)",
                  color: "var(--ink)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  marginBottom: 8,
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="button button-primary button-sm"
                  onClick={() =>
                    handleAction(f.id, {
                      status: "adopted",
                      reply: replyText[f.id] || "",
                    })
                  }
                >
                  采纳
                </button>
                <button
                  className="button button-ghost button-sm"
                  onClick={() =>
                    handleAction(f.id, {
                      status: "replied",
                      reply: replyText[f.id] || "",
                    })
                  }
                >
                  回复
                </button>
                <button
                  className="button button-ghost button-sm"
                  style={{ color: "var(--ink-muted)" }}
                  onClick={() =>
                    handleAction(f.id, {
                      status: "rejected",
                      reply: replyText[f.id] || "",
                    })
                  }
                >
                  拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── API Key Management Tab ──
function ApiKeyTab({
  notify,
}: {
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPreview, setNewKeyPreview] = useState("");
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = async () => {
    try {
      const r = await authFetch("/api/admin/api-keys");
      if (r.ok) setKeys(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const createKey = async () => {
    try {
      const r = await authFetch("/api/admin/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName || "默认" }),
      });
      if (r.ok) {
        const data = await r.json();
        setNewKeyPreview(data.apiKey);
        setShowKey(true);
        setNewKeyName("");
        fetchKeys();
        notify("API Key 已创建");
      } else {
        notify("创建失败，请重试", "error");
      }
    } catch {
      notify("创建失败，请重试", "error");
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm("确认吊销此 API Key？")) return;
    try {
      const r = await authFetch(`/api/admin/api-keys/${id}`, {
        method: "DELETE",
      });
      if (r.ok) {
        fetchKeys();
        notify("API Key 已吊销");
      } else {
        notify("吊销失败，请重试", "error");
      }
    } catch {
      notify("吊销失败，请重试", "error");
    }
  };

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>API 管理</h2>
          <p>管理对外开放的 API Key，创建后仅显示一次明文。</p>
        </div>
        <button className="button button-primary" onClick={fetchKeys}>
          <RefreshCw size={15} /> 刷新
        </button>
      </div>
      {showKey && (
        <div
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong style={{ color: "#22c55e", fontSize: 13 }}>
              新 API Key 已创建（仅显示一次）
            </strong>
            <button
              className="button button-ghost button-sm"
              onClick={() => setShowKey(false)}
            >
              <X size={14} />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              alignItems: "center",
            }}
          >
            <code
              style={{
                background: "var(--glass-input)",
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 12,
                flex: 1,
                wordBreak: "break-all",
              }}
            >
              {newKeyPreview}
            </code>
            <button
              className="button button-primary button-sm"
              onClick={() => {
                navigator.clipboard.writeText(newKeyPreview);
                alert("已复制到剪贴板");
              }}
            >
              <Copy size={14} /> 复制
            </button>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key 名称（可选）"
            style={{
              flex: 1,
              border: "1px solid var(--border-subtle)",
              background: "var(--glass-input)",
              color: "var(--ink)",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <button className="button button-primary" onClick={createKey}>
            创建 Key
          </button>
        </div>
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>加载中…</p>
      ) : keys.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)", padding: "20px 0" }}>
          暂无 API Key
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  名称
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  预览
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  速率/分
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  状态
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  创建时间
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr
                  key={k.id}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>
                    {k.name}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: "var(--ink-dim)",
                    }}
                  >
                    {k.keyPreview}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>
                    {k.rateLimitPerMin}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 8,
                        background: k.revoked
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(34,197,94,0.15)",
                        color: k.revoked ? "#ef4444" : "#22c55e",
                      }}
                    >
                      {k.revoked ? "已吊销" : "正常"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: 11,
                      color: "var(--ink-dim)",
                    }}
                  >
                    {new Date(k.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {!k.revoked && (
                      <button
                        className="button button-ghost button-sm"
                        style={{ color: "#ef4444" }}
                        onClick={() => revokeKey(k.id)}
                      >
                        吊销
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Task Management Tab ──
function TaskManageTab({
  notify,
  isRoot,
}: {
  notify: (message: string, type?: "success" | "error") => void;
  isRoot: boolean;
}) {
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [draft, setDraft] = useState({ chapter: "", title: "", description: "" });
  const [creating, setCreating] = useState(false);

  const fetchTasks = async () => {
    try {
      const r = await authFetch("/api/tasks/admin");
      if (r.ok) setTasks(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const r = await authFetch(`/api/tasks/admin/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("bad status");
      const labels: Record<string, string> = {
        approved: "任务已通过",
        rejected: "任务已退回",
        open: "任务已重新开放",
        claimed: "任务已释放",
      };
      notify(labels[status] || "任务状态已更新");
    } catch {
      notify("操作失败，请重试", "error");
    }
    fetchTasks();
  };

  const createTask = async () => {
    if (!draft.chapter.trim() || !draft.title.trim() || !draft.description.trim()) {
      notify("请填写章节、标题和描述", "error");
      return;
    }
    setCreating(true);
    try {
      const response = await authFetch("/api/tasks/admin", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.message || value.error || "任务创建失败");
      setDraft({ chapter: "", title: "", description: "" });
      notify("任务已创建");
      await fetchTasks();
    } catch (error) {
      notify(error instanceof Error ? error.message : "任务创建失败", "error");
    } finally {
      setCreating(false);
    }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm("确认删除这个任务？删除后无法恢复。")) return;
    try {
      const response = await authFetch(`/api/tasks/admin/${id}`, { method: "DELETE" });
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.message || value.error || "任务删除失败");
      notify("任务已删除");
      await fetchTasks();
    } catch (error) {
      notify(error instanceof Error ? error.message : "任务删除失败", "error");
    }
  };

  const statusLabels: Record<string, string> = {
    open: "待认领",
    claimed: "进行中",
    submitted: "待审核",
    approved: "已通过",
    rejected: "已退回",
  };
  const statusColors: Record<string, string> = {
    open: "#6b7280",
    claimed: "#3b82f6",
    submitted: "#f59e0b",
    approved: "#22c55e",
    rejected: "#ef4444",
  };

  const filtered =
    statusFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === statusFilter);

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>任务管理</h2>
          <p>管理协作翻译任务的状态。</p>
        </div>
        <div className="panel-actions">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              border: "1px solid var(--border-subtle)",
              background: "var(--glass-input)",
              color: "var(--ink)",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            <option value="all">全部</option>
            <option value="open">待认领</option>
            <option value="claimed">进行中</option>
            <option value="submitted">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已退回</option>
          </select>
          <button className="button button-primary" onClick={fetchTasks}>
            <RefreshCw size={15} /> 刷新
          </button>
        </div>
      </div>
      {isRoot && (
        <div className="glass-card" style={{ padding: 18, borderRadius: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Plus size={16} />
            <strong style={{ fontSize: 14 }}>创建翻译任务</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(220px, 1fr)", gap: 10, marginBottom: 10 }}>
            <input value={draft.chapter} onChange={(event) => setDraft({ ...draft, chapter: event.target.value })} placeholder="章节，例如 Vol.1 Ch.1" style={adminInputStyle} />
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="任务标题" style={adminInputStyle} />
          </div>
          <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="任务描述、数量和注意事项" rows={3} style={{ ...adminInputStyle, resize: "vertical", marginBottom: 10 }} />
          <button className="button button-primary button-sm" onClick={createTask} disabled={creating}>
            <Plus size={14} /> {creating ? "创建中…" : "创建任务"}
          </button>
        </div>
      )}
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>加载中…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)", padding: "20px 0" }}>
          暂无任务
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              className="news-editor"
              style={{ display: "block" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong style={{ fontSize: 13 }}>{t.title}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--ink-muted)",
                      marginLeft: 12,
                    }}
                  >
                    {t.chapter}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 8,
                    background: statusColors[t.status] + "20",
                    color: statusColors[t.status],
                  }}
                >
                  {statusLabels[t.status]}
                </span>
              </div>
              {t.claimant && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginBottom: 8,
                  }}
                >
                  认领人：{t.claimant} · {t.contact}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {t.status === "submitted" && (
                  <>
                    <button
                      className="button button-primary button-sm"
                      onClick={() => updateStatus(t.id, "approved")}
                    >
                      通过
                    </button>
                    <button
                      className="button button-ghost button-sm"
                      onClick={() => updateStatus(t.id, "rejected")}
                    >
                      退回
                    </button>
                  </>
                )}
                {t.status === "claimed" && (
                  <button
                    className="button button-ghost button-sm"
                    onClick={() => updateStatus(t.id, "open")}
                  >
                    释放任务
                  </button>
                )}
                {t.status === "approved" && (
                  <button
                    className="button button-ghost button-sm"
                    onClick={() => updateStatus(t.id, "open")}
                  >
                    重新开放
                  </button>
                )}
                {isRoot && (
                  <button className="button button-ghost button-sm" style={{ color: "#ef4444" }} onClick={() => deleteTask(t.id)}>
                    <Trash2 size={14} /> 删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Glossary Management Tab ──
function GlossaryManageTab({
  notify,
}: {
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    ja: "",
    zh: "",
    romaji: "",
    category: "",
    note: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTerms = async () => {
    try {
      const r = await authFetch("/api/glossary");
      if (r.ok) setTerms(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handleSubmit = async () => {
    if (!form.ja || !form.zh) return;
    try {
      const r = editingId
        ? await authFetch(`/api/glossary/admin/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(form),
          })
        : await authFetch("/api/glossary/admin", {
            method: "POST",
            body: JSON.stringify(form),
          });
      if (!r.ok) throw new Error("bad status");
      notify(editingId ? "术语已更新" : "术语已添加");
      setForm({ ja: "", zh: "", romaji: "", category: "", note: "" });
      setEditingId(null);
      fetchTerms();
    } catch {
      notify("保存失败，请重试", "error");
    }
  };

  const handleEdit = (t: GlossaryTerm) => {
    setForm({
      ja: t.ja,
      zh: t.zh,
      romaji: t.romaji,
      category: t.category,
      note: t.note,
    });
    setEditingId(t.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此术语？")) return;
    try {
      const r = await authFetch(`/api/glossary/admin/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("bad status");
      notify("术语已删除");
    } catch {
      notify("删除失败，请重试", "error");
    }
    fetchTerms();
  };

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>术语管理</h2>
          <p>维护中日译名对照表，确保翻译一致性。</p>
        </div>
        <button className="button button-primary" onClick={fetchTerms}>
          <RefreshCw size={15} /> 刷新
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <input
          value={form.ja}
          onChange={(e) => setForm((p) => ({ ...p, ja: e.target.value }))}
          placeholder="日文 *"
          style={adminInputStyle}
        />
        <input
          value={form.zh}
          onChange={(e) => setForm((p) => ({ ...p, zh: e.target.value }))}
          placeholder="中文 *"
          style={adminInputStyle}
        />
        <input
          value={form.romaji}
          onChange={(e) => setForm((p) => ({ ...p, romaji: e.target.value }))}
          placeholder="罗马音"
          style={adminInputStyle}
        />
        <input
          value={form.category}
          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          placeholder="分类"
          style={adminInputStyle}
        />
        <input
          value={form.note}
          onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          placeholder="备注"
          style={adminInputStyle}
        />
        <button className="button button-primary" onClick={handleSubmit}>
          {editingId ? "更新术语" : "添加术语"}
        </button>
        {editingId && (
          <button
            className="button button-ghost"
            onClick={() => {
              setForm({ ja: "", zh: "", romaji: "", category: "", note: "" });
              setEditingId(null);
            }}
          >
            取消
          </button>
        )}
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>加载中…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  日文
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  中文
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  分类
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                  }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr
                  key={t.id}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <td style={{ padding: "8px 12px", fontSize: 13 }}>{t.ja}</td>
                  <td style={{ padding: "8px 12px", fontSize: 13 }}>{t.zh}</td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--ink-dim)",
                    }}
                  >
                    {t.category}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <button
                      className="button button-ghost button-sm"
                      onClick={() => handleEdit(t)}
                    >
                      编辑
                    </button>
                    <button
                      className="button button-ghost button-sm"
                      style={{ color: "#ef4444" }}
                      onClick={() => handleDelete(t.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const adminInputStyle: React.CSSProperties = {
  border: "1px solid var(--border-subtle)",
  background: "var(--glass-input)",
  color: "var(--ink)",
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 12,
  boxSizing: "border-box",
  width: "100%",
};

// ── QA Admin Tab ──
function QAAdminTab({
  notify,
}: {
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    try {
      const r = await authFetch("/api/qa/admin");
      if (r.ok) setQuestions(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此问题及其所有回答？")) return;
    try {
      const r = await authFetch(`/api/qa/admin/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("bad status");
      notify("问答已删除");
    } catch {
      notify("删除失败，请重试", "error");
    }
    fetchQuestions();
  };

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>问答审核</h2>
          <p>管理社区问答内容。</p>
        </div>
        <button className="button button-primary" onClick={fetchQuestions}>
          <RefreshCw size={15} /> 刷新
        </button>
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>加载中…</p>
      ) : questions.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-dim)", padding: "20px 0" }}>
          暂无问题
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {questions.map((q) => (
            <div
              key={q.id}
              className="news-editor"
              style={{ display: "block" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong style={{ fontSize: 13 }}>{q.title}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--ink-muted)",
                      marginLeft: 12,
                    }}
                  >
                    {q.author} · {new Date(q.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 8,
                    background:
                      q.status === "closed" ? "#22c55e20" : "#3b82f620",
                    color: q.status === "closed" ? "#22c55e" : "#3b82f6",
                  }}
                >
                  {q.status}
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  margin: "0 0 4px",
                  lineHeight: 1.5,
                }}
              >
                {q.content.slice(0, 200)}
              </p>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  marginBottom: 8,
                }}
              >
                回答：{q.answers?.length || 0} · 投票：{q.votes} · 标签：
                {q.tags?.join(", ") || "无"}
              </div>
              <button
                className="button button-ghost button-sm"
                style={{ color: "#ef4444" }}
                onClick={() => handleDelete(q.id)}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type AuditEntry = {
  id: string
  time: string
  actor: string
  action: string
  target: string
  details: string
}

function SecurityCenter({
  notify,
  isRoot,
}: {
  notify: (message: string, type?: "success" | "error") => void
  isRoot: boolean
}) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const response = await authFetch("/api/admin/audit?limit=100")
      const value = await response.json().catch(() => [])
      if (!response.ok) throw new Error(value.message || "审计日志读取失败")
      setEntries(Array.isArray(value) ? value : [])
    } catch (error) {
      notify(error instanceof Error ? error.message : "审计日志读取失败", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const revokeMembers = async () => {
    if (!window.confirm("确认撤销所有组员账号的当前登录会话？根管理员会话不会受影响。")) return
    setRevoking(true)
    try {
      const response = await authFetch("/api/admin/sessions/revoke-members", { method: "POST" })
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.message || "会话撤销失败")
      notify("所有组员会话已撤销")
      await load()
    } catch (error) {
      notify(error instanceof Error ? error.message : "会话撤销失败", "error")
    } finally {
      setRevoking(false)
    }
  }

  return (
    <section className="admin-panel security-center-panel">
      <div className="panel-heading">
        <div>
          <span className="admin-section-kicker"><ShieldAlert size={14} /> SECURITY CENTER</span>
          <h2>安全中心</h2>
          <p>查看关键管理操作记录。主管理员可在账号异常时一键撤销所有组员会话。</p>
        </div>
        <div className="panel-actions">
          {isRoot && <button className="button button-danger" onClick={revokeMembers} disabled={revoking}>
            <LockKeyhole size={15} /> {revoking ? "撤销中…" : "撤销组员会话"}
          </button>}
          <button className="button button-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> 刷新日志
          </button>
        </div>
      </div>
      <div className="security-center-note">
        <ShieldCheck size={17} />
        <span>根管理员账号由运行环境配置管理，本站不会在页面或数据文件中保存、显示或修改根管理员密码。</span>
      </div>
      {loading ? (
        <div className="admin-users-empty">正在读取审计日志…</div>
      ) : entries.length === 0 ? (
        <div className="admin-users-empty">暂无审计记录。</div>
      ) : (
        <div className="audit-log-list">
          {entries.map((entry) => (
            <article className="audit-log-row" key={entry.id}>
              <div className="audit-log-icon"><ShieldCheck size={16} /></div>
              <div className="audit-log-copy">
                <strong>{entry.action}</strong>
                <span>{entry.actor} · {entry.target || "-"}</span>
                {entry.details && <small>{entry.details}</small>}
              </div>
              <time>{new Date(entry.time).toLocaleString("zh-CN", { hour12: false })}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
