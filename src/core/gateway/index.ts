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

import type { Server as HttpServer, IncomingMessage } from "node:http";
import { createServer } from "node:http";
import process from "node:process";
import { createSubsystemLogger } from "../../logging/index.js";
import type { OxygenConfig, OxygenEvent, OxygenEventHandler } from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type { InferenceEngine, ChatMessage } from "../../inference/engine/index.js";
import {
  RateLimiter,
  validateGatewayBinding,
  timingSafeEqual,
  detectPromptInjection,
  sanitizeLogContent,
} from "../../security/hardening.js";

const log = createSubsystemLogger("gateway");

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB max request body

// ─── Types ──────────────────────────────────────────────────────────────────

export type GatewayServerOptions = {
  config: OxygenConfig;
  inferenceEngine?: InferenceEngine;
  onEvent?: OxygenEventHandler;
};

export type GatewayServer = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  readonly port: number;
  readonly isRunning: boolean;
};

type RequestContext = {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
  authenticated: boolean;
  clientIp: string;
};

// ─── Auth (timing-safe) ─────────────────────────────────────────────────────

function validateAuth(
  config: OxygenConfig,
  authHeader: string | undefined,
): boolean {
  const { auth } = config.gateway;
  if (auth.mode === "none") return true;
  if (!authHeader) return false;

  if (auth.mode === "token" && auth.token) {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    return timingSafeEqual(token, auth.token);
  }

  if (auth.mode === "password" && auth.password) {
    if (!authHeader.startsWith("Basic ")) return false;
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
      const [, password] = decoded.split(":");
      return password ? timingSafeEqual(password, auth.password) : false;
    } catch {
      return false;
    }
  }

  return false;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getClientIp(req: IncomingMessage): string {
  // 不信任 X-Forwarded-For（防止 IP 伪造）
  return req.socket.remoteAddress ?? "unknown";
}

function respond(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
  headers?: Record<string, string>,
): void {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

// ─── Server Factory ─────────────────────────────────────────────────────────

export function createGatewayServer(options: GatewayServerOptions): GatewayServer {
  const { config, inferenceEngine, onEvent } = options;
  let server: HttpServer | null = null;
  let running = false;

  // 初始化速率限制器
  const rateLimiter = new RateLimiter(config.gateway.rateLimit);

  // 定期清理速率限制记录
  const cleanupInterval = setInterval(() => rateLimiter.cleanup(), 60_000);

  const emitEvent = (event: OxygenEvent) => {
    onEvent?.(event);
  };

  const httpServer = createServer(async (req, res) => {
    const clientIp = getClientIp(req);
    const ctx: RequestContext = {
      requestId: generateId("req"),
      method: req.method ?? "GET",
      path: req.url?.split("?")[0] ?? "/", // 剥离 query string（防 CVE-2026-25253）
      startTime: nowMs(),
      authenticated: false,
      clientIp,
    };

    // ── 速率限制 ──────────────────────────────────────────────
    const rateCheck = rateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      log.warn(`Rate limited: ${clientIp} — ${rateCheck.reason}`);
      respond(res, 429, { error: rateCheck.reason }, {
        "Retry-After": String(Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000)),
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
    let body: unknown = null;
    if (req.method === "POST" || req.method === "PUT") {
      try {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        for await (const chunk of req) {
          totalBytes += (chunk as Buffer).length;
          if (totalBytes > MAX_BODY_BYTES) {
            respond(res, 413, { error: "Request body too large (max 1MB)" });
            return;
          }
          chunks.push(chunk as Buffer);
        }

        const raw = Buffer.concat(chunks).toString("utf-8");
        body = raw ? JSON.parse(raw) : null;
      } catch {
        respond(res, 400, { error: "Invalid JSON body" });
        return;
      }
    }

    try {
      const { method, path } = ctx;

      // GET /health
      if (method === "GET" && path === "/health") {
        respond(res, 200, { status: "ok", timestamp: nowMs(), version: "0.1.0" });
        return;
      }

      // GET /api/v1/status
      if (method === "GET" && path === "/api/v1/status") {
        respond(res, 200, {
          gateway: { host: config.gateway.host, port: config.gateway.port },
          agents: config.agents.list.map((a) => ({ id: a.id, name: a.name })),
          channels: config.channels.map((c) => ({ id: c.id, type: c.type, enabled: c.enabled })),
          plugins: config.plugins.map((p) => ({ name: p.name, enabled: p.enabled })),
          models: config.models.map((m) => ({ provider: m.provider, model: m.model, hasKey: !!m.apiKey })),
          inferenceReady: !!inferenceEngine,
          uptime: process.uptime(),
        });
        return;
      }

      // GET /api/v1/agents
      if (method === "GET" && path === "/api/v1/agents") {
        respond(res, 200, { agents: config.agents.list });
        return;
      }

      // GET /api/v1/models
      if (method === "GET" && path === "/api/v1/models") {
        respond(res, 200, {
          models: config.models.map((m) => ({
            provider: m.provider,
            model: m.model,
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

        const chatBody = body as {
          message?: string;
          messages?: ChatMessage[];
          systemPrompt?: string;
          mode?: "fast" | "balanced" | "deep";
        } | null;

        if (!chatBody) {
          respond(res, 400, { error: "Request body required" });
          return;
        }

        let messages: ChatMessage[];
        if (chatBody.messages) {
          messages = chatBody.messages;
        } else if (chatBody.message) {
          messages = [{ role: "user", content: chatBody.message }];
        } else {
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
                entry: {
                  id: generateId("audit"),
                  timestamp: nowMs(),
                  operation: "prompt.injection",
                  actor: clientIp,
                  target: "chat",
                  severity: "critical",
                  details: { patterns: injection.patterns },
                  rollbackable: false,
                },
              });
              respond(res, 400, {
                error: "Request blocked: potentially harmful content detected",
                risk: injection.risk,
              });
              return;
            }
          }
        }

        log.info(`Chat ${ctx.requestId} from ${clientIp}: ${messages.length} msgs, mode=${chatBody.mode ?? "auto"}`);

        const inferenceResult = await inferenceEngine.infer({
          messages,
          mode: chatBody.mode,
          systemPrompt: chatBody.systemPrompt,
        });

        respond(res, 200, {
          id: ctx.requestId,
          content: inferenceResult.content,
          toolCalls: inferenceResult.toolCalls,
          model: inferenceResult.model,
          provider: inferenceResult.provider,
          mode: inferenceResult.mode,
          usage: inferenceResult.usage,
          durationMs: inferenceResult.durationMs,
        });
        return;
      }

      // POST /api/v1/plan
      if (method === "POST" && path === "/api/v1/plan") {
        if (!inferenceEngine) {
          respond(res, 503, { error: "Inference engine not available" });
          return;
        }

        const planBody = body as { goal?: string; context?: string } | null;
        if (!planBody?.goal) {
          respond(res, 400, { error: "'goal' field required" });
          return;
        }

        const { TaskPlanner } = await import("../../inference/planner/index.js");
        const planner = new TaskPlanner(inferenceEngine);
        const plan = await planner.generatePlan(planBody.goal, planBody.context);

        emitEvent({ type: "plan.created", planId: plan.id });
        respond(res, 200, plan);
        return;
      }

      respond(res, 404, { error: "Not found", path: ctx.path });
    } catch (err) {
      log.error(`Request ${ctx.requestId} failed:`, err);
      respond(res, 500, { error: "Internal server error" });
    }
  });

  return {
    get port() {
      return config.gateway.port;
    },
    get isRunning() {
      return running;
    },
    start: () =>
      new Promise<void>((resolve, reject) => {
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
          emitEvent({ type: "gateway.started", port: config.gateway.port });
          resolve();
        });
        httpServer.on("error", (err) => {
          log.error("Gateway failed to start:", err);
          reject(err);
        });
      }),
    stop: () =>
      new Promise<void>((resolve) => {
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
}
