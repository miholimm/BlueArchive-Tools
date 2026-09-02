import { createServer } from "node:http";

const port = Number(process.env.MOCK_RESOURCE_API_PORT || 8787);
const users = new Map([[
  "demo-123",
  {
    user: "demo-123",
    text: "CN",
    voice: "Default",
    media: "CN",
    management: "",
    api: "",
    gateway: "",
    use: 0,
  },
]]);
let lastUpdate = null;

function send(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("invalid-json"));
      }
    });
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/get_resource") {
    const user = url.searchParams.get("user") || "";
    const data = users.get(user);
    if (!data) return send(response, 404, { success: false, error: "User not found" });
    return send(response, 200, { success: true, data });
  }

  if (request.method === "POST" && url.pathname === "/set_resource") {
    try {
      const payload = await readJson(request);
      const user = typeof payload.user === "string" ? payload.user : "";
      const current = users.get(user);
      if (!current) return send(response, 404, { success: false, error: "User not found" });
      lastUpdate = payload;
      for (const field of ["text", "voice", "media"]) {
        if (typeof payload[field] === "string") current[field] = payload[field];
      }
      return send(response, 200, { success: true });
    } catch {
      return send(response, 400, { success: false, error: "Invalid JSON" });
    }
  }

  if (request.method === "GET" && url.pathname === "/_last_update") {
    return send(response, 200, { success: true, data: lastUpdate });
  }

  return send(response, 404, { success: false, error: "Not Found" });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Mock resource API listening on http://127.0.0.1:${port}\n`);
});
