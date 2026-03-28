/**
 * OpenOxygen — Gateway Server (Hardened)
 *
 * 安全加固版网关：
 * - 速率限制 (防 ClawJacked 暴力破解)
 * - Origin 校验 (防跨站 WebSocket 劫持)
 * - 时间安全认证 (防计时攻击)
 * - 绑定地址校验 (防公网暴露)
 * - 请求体大小限制 (防 DoS)
 * - 提示注入检测 (防日志投毒)
 */
import { createServer } from "node";
import process from "node";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { RateLimiter, validateGatewayBinding, timingSafeEqual, detectPromptInjection, sanitizeLogContent, } from "../../security/hardening.js";
import { DASHBOARD_HTML } from "../../dashboard/index.js";
const log = createSubsystemLogger("gateway");
// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB max request body
inferenceEngine ?  : ;
onEvent ?  : ;
;
stop: () => Promise;
port;
isRunning;
httpServer("node").Server | null;
;
method;
path;
startTime;
authenticated;
clientIp;
;
// ─── Auth (timing-safe) ─────────────────────────────────────────────────────
function validateAuth(config, authHeader, , undefined) {
    const { auth } = config.gateway;
    if (auth.mode === "none")
        return true;
    if (!authHeader)
        return false;
    if (auth.mode === "token" && auth.token) {
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            :
        ;
        return timingSafeEqual(token, auth.token);
    }
    if (auth.mode === "password" && auth.password) {
        if (!authHeader.startsWith("Basic "))
            return false;
        try {
            const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
            const [, password] = decoded.split(":");
            return password ? timingSafeEqual(password, auth.password) : ;
        }
        catch {
            return false;
        }
    }
    return false;
}
// ─── Helpers ────────────────────────────────────────────────────────────────
function getClientIp(req) {
    // 不信任 X-Forwarded-For（防止 IP 伪造）
    return req.socket.remoteAddress ?? "unknown";
}
function respond(res) { }
("node").ServerResponse,
    status,
    body,
    headers ?  : ,
;
{
    res.writeHead(status, { "Content-Type": "application/json", ...headers });
    res.end(JSON.stringify(body));
}
// ─── Server Factory ─────────────────────────────────────────────────────────
export function createGatewayServer(options) {
    const { config, inferenceEngine, onEvent } = options;
    let server;
     | null;
    null;
    let running = false;
    // 初始化速率限制器
    const rateLimiter = new RateLimiter(config.gateway.rateLimit);
    // 定期清理速率限制记录
    const cleanupInterval = setInterval(() => rateLimiter.cleanup(), 60_000);
    const emitEvent = (event) => {
        onEvent?.(event);
    };
    const httpServer = createServer(async (req, res) => {
        const clientIp = getClientIp(req);
        const ctx = {
            requestId() { },
            method, : .method ?? "GET",
            path, : .url?.split("?")[0] ?? "/", // 剥离 query string（防 CVE-2026-25253）
            startTime() { },
            authenticated,
            clientIp,
        };
        // ── 速率限制 ──────────────────────────────────────────────
        const rateCheck = rateLimiter.check(clientIp);
        if (!rateCheck.allowed) {
            log.warn(`Rate limited: ${clientIp} — ${rateCheck.reason}`);
            respond(res, 429, { error, : .reason }, {
                "Retry-After"(Math) { }, : .ceil((rateCheck.retryAfterMs ?? 60000) / 1000)
            }),
            ;
        }
    });
    return;
}
// ── CORS（严格模式）──────────────────────────────────────
const allowedOrigins = config.gateway.cors?.origins ?? ["http://127.0.0.1", "http://localhost"];
const requestOrigin = req.headers.origin;
if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
}
// 不设置通配符 "*"，防止跨域攻击
res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
res.setHeader("Access-Control-Max-Age", "3600");
// 安全响应头
res.setHeader("X-Content-Type-Options", "nosniff");
res.setHeader("X-Frame-Options", "DENY");
res.setHeader("Content-Security-Policy", "default-src 'none'");
if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
}
// ── 认证（跳过 /health）──────────────────────────────────
if (ctx.path !== "/health") {
    ctx.authenticated = validateAuth(config, req.headers.authorization);
    if (!ctx.authenticated) {
        rateLimiter.recordAuthFailure(clientIp);
        respond(res, 401, { error: "Unauthorized" });
        return;
    }
    rateLimiter.resetAuthFailures(clientIp);
}
// ── 解析请求体（带大小限制）──────────────────────────────
let body = null;
if (req.method === "POST" || req.method === "PUT") {
    try {
        const chunks = [];
        let totalBytes = 0;
        for await (const chunk of req) {
            totalBytes += (chunk).length;
            if (totalBytes > MAX_BODY_BYTES) {
                respond(res, 413, { error: "Request body too large (max 1MB)" });
                return;
            }
            chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString("utf-8");
        body = raw ? JSON.parse(raw) : ;
    }
    catch {
        respond(res, 400, { error: "Invalid JSON body" });
        return;
    }
}
try {
    const { method, path } = ctx;
    // GET /health
    if (method === "GET" && path === "/health") {
        respond(res, 200, { status: "ok", timestamp() { }, version: "0.1.0" });
        return;
    }
    // GET / — Dashboard
    if (method === "GET" && (path === "/" || path === "/dashboard")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(DASHBOARD_HTML);
        return;
    }
    // GET /api/v1/status
    if (method === "GET" && path === "/api/v1/status") {
        respond(res, 200, {
            gateway,
            agents, : .agents.list.map((a) => ({ id, : .id, name, : .name })),
            channels, : .channels.map((c) => ({ id, : .id, type, : .type, enabled, : .enabled })),
            plugins, : .plugins.map((p) => ({ name, : .name, enabled, : .enabled })),
            models, : .models.map((m) => ({ provider, : .provider, model, : .model, hasKey: !!m.apiKey })),
            inferenceReady: !!inferenceEngine,
            uptime, : .uptime(),
        });
        return;
    }
    // GET /api/v1/agents
    if (method === "GET" && path === "/api/v1/agents") {
        respond(res, 200, { agents, : .agents.list });
        return;
    }
    // GET /api/v1/models
    if (method === "GET" && path === "/api/v1/models") {
        respond(res, 200, {
            models, : .models.map((m) => ({
                provider, : .provider,
                model, : .model,
                hasKey: !!m.apiKey,
            })),
        });
        return;
    }
    // POST /api/v1/chat
    if (method === "POST" && path === "/api/v1/chat") {
        if (!inferenceEngine) {
            respond(res, 503, { error: "Inference engine not available" });
            return;
        }
        const chatBody = body;
        if (!chatBody) {
            respond(res, 400, { error: "Request body required" });
            return;
        }
        let messages;
        if (chatBody.messages) {
            messages = chatBody.messages;
        }
        else if (chatBody.message) {
            messages = [{ role: "user", content, : .message }];
        }
        else {
            respond(res, 400, { error: "Either 'message' or 'messages' field required" });
            return;
        }
        // ── 提示注入检测 ──────────────────────────────────────
        for (const msg of messages) {
            if (msg.role === "user" && msg.content) {
                const injection = detectPromptInjection(msg.content);
                if (injection.risk === "high") {
                    log.error(`Blocked high-risk prompt injection from ${clientIp}: ${injection.patterns.join(", ")}`);
                    emitEvent({
                        type: "security.violation",
                        entry,
                        rollbackable,
                    });
                }
                ;
                respond(res, 400, {
                    error: "Request blocked harmful content detected",
                    risk, : .risk,
                });
                return;
            }
        }
    }
    log.info(`Chat ${ctx.requestId} from ${clientIp}: ${messages.length} msgs, mode=${chatBody.mode ?? "auto"}`);
    const inferenceResult = await inferenceEngine.infer({
        messages,
        mode, : .mode,
        systemPrompt, : .systemPrompt,
    });
    respond(res, 200, {
        id, : .requestId,
        content, : .content,
        toolCalls, : .toolCalls,
        model, : .model,
        provider, : .provider,
        mode, : .mode,
        usage, : .usage,
        durationMs, : .durationMs,
    });
    return;
}
// POST /api/v1/plan
finally {
}
// POST /api/v1/plan
if (method === "POST" && path === "/api/v1/plan") {
    if (!inferenceEngine) {
        respond(res, 503, { error: "Inference engine not available" });
        return;
    }
    const planBody = body;
    if (!planBody?.goal) {
        respond(res, 400, { error: "'goal' field required" });
        return;
    }
    const { TaskPlanner } = await import("../../inference/planner/index.js");
    const planner = new TaskPlanner(inferenceEngine);
    const plan = await planner.generatePlan(planBody.goal, planBody.context);
    emitEvent({ type: "plan.created", planId, : .id });
    respond(res, 200, plan);
    return;
}
// POST /api/v1/task//cancel — Cancel running task
if (method === "POST" && path.startsWith("/api/v1/task/") && path.endsWith("/cancel")) {
    const taskId = path.split("/")[4];
    // 广播取消事件到 WebSocket
    emitEvent({ type: "plan.failed", planId } || "", error, "User cancelled");
}
;
respond(res, 200, { cancelled, taskId });
return;
// GET /api/v1/ws/status — WebSocket channel status
if (method === "GET" && path === "/api/v1/ws/status") {
    respond(res, 200, {
        websocket,
        path: "/ws",
        message: "Connect via WebSocket at ws://host/ws",
    });
    return;
}
respond(res, 404, { error: "Not found", path, : .path });
try { }
catch (err) {
    log.error(`Request ${ctx.requestId} failed:`, err);
    respond(res, 500, { error: "Internal server error" });
}
;
return {
    get port() {
        return config.gateway.port;
    },
    get isRunning() {
        return running;
    },
    get httpServer() {
        return server;
    },
    start: () => new Promise((resolve, reject) => {
        // 绑定地址安全检查
        const bindCheck = validateGatewayBinding(config.gateway.host, config.gateway.port);
        if (!bindCheck.safe) {
            const err = new Error(`Unsafe gateway binding: ${bindCheck.reason}`);
            log.error(err.message);
            reject(err);
            return;
        }
        httpServer.listen(config.gateway.port, config.gateway.host, () => {
            running = true;
            server = httpServer;
            log.info(`Gateway started on ${config.gateway.host}:${config.gateway.port} (hardened)`);
            emitEvent({ type: "gateway.started", port, : .gateway.port });
            resolve();
        });
        httpServer.on("error", (err) => {
            log.error("Gateway failed to start:", err);
            reject(err);
        });
    }),
    stop: () => new Promise((resolve) => {
        clearInterval(cleanupInterval);
        if (!server) {
            resolve();
            return;
        }
        server.close(() => {
            running = false;
            server = null;
            log.info("Gateway stopped");
            emitEvent({ type: "gateway.stopped" });
            resolve();
        });
    }),
};
