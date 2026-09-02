import { Code, Server, Shield } from "lucide-react";

const adminEndpoints = [
  ["POST", "/api/admin/login", "管理员登录并获取 session token"],
  ["POST", "/api/admin/logout", "注销当前 session token"],
  ["GET", "/api/admin/me", "读取当前管理员身份"],
  ["GET", "/api/admin/users", "主管理员查看组员账号"],
  ["POST", "/api/admin/users", "主管理员创建组员账号"],
  ["PATCH", "/api/admin/users/:id", "主管理员更新组员账号"],
  ["DELETE", "/api/admin/users/:id", "主管理员删除组员账号"],
  ["PUT", "/api/admin/content/:name", "保存公告、下载、成员或状态数据"],
  ["GET", "/api/admin/site-data/:module", "读取安装教程、常见问题或反作弊追踪草稿"],
  ["PUT", "/api/admin/site-data/:module", "保存安装教程、常见问题或反作弊追踪数据"],
  ["PUT", "/api/admin/settings", "保存站点视觉设置"],
  ["GET", "/api/admin/visitors", "查看访客记录"],
  ["GET", "/api/admin/comments/pending", "查看待审核评论"],
  ["PUT", "/api/admin/comments/:id", "审核评论"],
  ["GET", "/api/admin/feedback", "读取完整翻译反馈"],
  ["PUT", "/api/admin/feedback/:id", "处理翻译反馈"],
  ["GET", "/api/admin/audit", "读取安全审计日志"],
  ["POST", "/api/admin/sessions/revoke-members", "主管理员撤销组员会话"],
  ["GET", "/api/admin/api-keys", "获取 API Key 列表"],
  ["POST", "/api/admin/api-keys", "创建新 API Key"],
  ["DELETE", "/api/admin/api-keys/:id", "吊销 API Key"],
  ["POST", "/api/tasks/admin", "主管理员创建任务"],
  ["GET", "/api/tasks/admin", "查看全部任务"],
  ["PUT", "/api/tasks/admin/:id", "更新任务状态"],
  ["DELETE", "/api/tasks/admin/:id", "主管理员删除任务"],
  ["POST", "/api/glossary/admin", "新增术语"],
  ["PUT", "/api/glossary/admin/:id", "编辑术语"],
  ["DELETE", "/api/glossary/admin/:id", "删除术语"],
  ["GET", "/api/qa/admin", "查看全部问题"],
  ["PUT", "/api/qa/:id/accept/:answerId", "采纳问答答案"],
  ["DELETE", "/api/qa/admin/:id", "删除问题"],
  ["GET", "/api/archive", "读取管理员历史归档"],
];

const publicEndpoints = [
  ["GET", "/api/content", "读取游客可见站点内容"],
  ["GET", "/api/glossary", "术语库查询"],
  ["GET", "/api/qa", "问答列表"],
  ["POST", "/api/qa", "提问"],
  ["POST", "/api/qa/:id/answer", "回答"],
  ["POST", "/api/qa/:id/vote", "点赞"],
  ["POST", "/api/qa/:id/vote/:answerId", "为答案点赞"],
  ["GET", "/api/comments/:announcementId", "读取已通过评论"],
  ["POST", "/api/comments", "提交评论"],
  ["GET", "/api/feedback", "读取反馈状态"],
  ["POST", "/api/feedback", "提交翻译反馈"],
  ["GET", "/api/auth/qq/status", "读取 QQ 社区身份状态"],
  ["GET", "/api/auth/qq/start", "发起 QQ OAuth 登录"],
  ["POST", "/api/auth/qq/logout", "退出 QQ 社区身份"],
  ["GET", "/api/site-data/:module", "读取受模块策略保护的扩展数据"],
  ["GET", "/api/story/index", "读取剧情索引"],
  ["GET", "/api/story/:volume/:chapter", "读取指定剧情章节"],
];

const memberEndpoints = [
  ["GET", "/api/tasks", "读取协作任务（需要任务权限）"],
  ["POST", "/api/tasks/:id/claim", "认领任务（需要任务权限）"],
  ["POST", "/api/tasks/:id/submit", "提交任务（需要任务权限）"],
];

function EndpointTable({ endpoints }: { endpoints: string[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        className="api-table"
        style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <th
              style={{
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--ink-dim)",
              }}
            >
              方法
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--ink-dim)",
              }}
            >
              路径
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--ink-dim)",
              }}
            >
              说明
            </th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map(([method, path, description]) => (
            <tr
              key={`${method}-${path}`}
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <td style={{ padding: "8px 12px", fontSize: 13 }}>
                <span
                  style={{
                    background:
                      method === "GET"
                        ? "var(--accent)"
                        : method === "POST"
                          ? "#22c55e"
                          : method === "PUT"
                            ? "#f59e0b"
                            : "#ef4444",
                    color: "#000",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                >
                  {method}
                </span>
              </td>
              <td
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                }}
              >
                {path}
              </td>
              <td
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                }}
              >
                {description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiDocs() {
  return (
    <main className="page api-docs-page">
      <div className="page-hero">
        <span className="eyebrow">DEVELOPER</span>
        <h1>API 文档</h1>
        <p>面向开发者的开放 API 接口参考文档</p>
      </div>
      <div
        className="docs-container"
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "20px",
          display: "grid",
          gap: 24,
        }}
      >
        <section
          className="glass-card"
          style={{ padding: 28, borderRadius: 16 }}
        >
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "0 0 16px",
            }}
          >
            <Server size={22} />
            GET /api/v1/status
          </h2>
          <p
            style={{
              color: "var(--ink-soft)",
              margin: "0 0 16px",
              lineHeight: 1.7,
            }}
          >
            查询汉化翻译进度。此接口不是游客公开接口，必须在请求头携带有效的
            <code>X-API-Key</code>。返回各章节的翻译和校对进度数据。
          </p>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>请求参数</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              className="api-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 520,
                marginBottom: 16,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--ink-dim)",
                    }}
                  >
                    参数
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--ink-dim)",
                    }}
                  >
                    类型
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--ink-dim)",
                    }}
                  >
                    必填
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--ink-dim)",
                    }}
                  >
                    说明
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      fontFamily: "monospace",
                    }}
                  >
                    chapter
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 13 }}>string</td>
                  <td style={{ padding: "8px 12px", fontSize: 13 }}>否</td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      color: "var(--ink-soft)",
                    }}
                  >
                    章节名称模糊筛选
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>响应示例</h3>
          <pre
            className="api-code"
            style={{
              background: "var(--glass-input)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: 16,
              fontSize: 12,
              fontFamily: "monospace",
              color: "var(--ink-soft)",
              overflow: "auto",
            }}
          >
            {`{
  "code": 0,
  "data": [
    {
      "chapter": "Vol.1 对策委员会篇 第1章",
      "total": 320,
      "translated": 280,
      "reviewed": 200,
      "lastUpdated": "2026-01-18T10:00:00.000Z"
    }
  ]
}`}
          </pre>
        </section>

        <section
          className="glass-card"
          style={{ padding: 28, borderRadius: 16 }}
        >
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "0 0 16px",
            }}
          >
            <Shield size={22} />
            管理员 API
          </h2>
          <p
            style={{
              color: "var(--ink-soft)",
              margin: "0 0 16px",
              lineHeight: 1.7,
            }}
          >
            管理员 API 需要先调用 <code>POST /api/admin/login</code> 获取临时
            session token，再携带{" "}
            <code>Authorization: Bearer &lt;token&gt;</code>。session token
            只保存在服务器内存中，并会在过期后失效。
          </p>
          <div
            className="api-auth-note"
            style={{
              background: "var(--glass-input)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: 16,
              color: "var(--ink-soft)",
              lineHeight: 1.8,
              fontSize: 13,
            }}
          >
            登录成功后，后续请求只需添加：
            <br />
            <code>Authorization: Bearer {"{token}"}</code>
          </div>
          <h3 style={{ fontSize: 14, margin: "16px 0 8px" }}>可用端点</h3>
          <EndpointTable endpoints={adminEndpoints} />
        </section>

        <section className="glass-card" style={{ padding: 28, borderRadius: 16 }}>
          <h2 style={{ margin: "0 0 12px" }}>API Key 访问</h2>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, margin: 0 }}>
            <code>GET /api/v1/status</code> 需要主管理员在后台创建 API Key，并通过
            <code> X-API-Key</code> 请求头发送。API Key 只在创建成功时显示一次；吊销后立即失效。
            每个 Key 独立执行每分钟和每小时配额限制。
          </p>
        </section>

        <section className="glass-card" style={{ padding: 28, borderRadius: 16 }}>
          <h2 style={{ margin: "0 0 12px" }}>QQ 社区身份</h2>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, margin: 0 }}>
            问答页预留 <code>/api/auth/qq/status</code>、<code>/api/auth/qq/start</code> 和
            <code>/api/auth/qq/logout</code>。QQ OAuth 只用于问答昵称与头像，不会获得管理后台权限。
            未配置 QQ OAuth 环境变量时，问答页会显示未启用状态。
          </p>
        </section>

        <section
          className="glass-card"
          style={{ padding: 28, borderRadius: 16 }}
        >
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "0 0 16px",
            }}
          >
          <Code size={22} />
            公共 API
          </h2>
          <EndpointTable endpoints={publicEndpoints} />
          <h3 style={{ fontSize: 14, margin: "20px 0 8px" }}>组员 API</h3>
          <EndpointTable endpoints={memberEndpoints} />
        </section>
      </div>
    </main>
  );
}
