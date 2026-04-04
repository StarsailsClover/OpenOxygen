/**
<<<<<<< HEAD
 * OpenOxygen ¡ª Gateway Server (Hardened)
 *
 * °²È«¼Ó¹Ì°æÍø¹Ø£º
 * - ËÙÂÊÏÞÖÆ (·À ClawJacked ±©Á¦ÆÆ½â)
 * - Origin Ð£Ñé (·À¿çÕ¾ WebSocket ½Ù³Ö)
 * - Ê±¼ä°²È«ÈÏÖ¤ (·À¼ÆÊ±¹¥»÷)
 * - °ó¶¨µØÖ·Ð£Ñé (·À¹«Íø±©Â¶)
 * - ÇëÇóÌå´óÐ¡ÏÞÖÆ (·À DoS)
 * - ÌáÊ¾×¢Èë¼ì²â (·ÀÈÕÖ¾Í¶¶¾)
=======
 * OpenOxygen - Gateway Server (Hardened)
 *
 * å®‰å…¨åŠ å›ºç‰ˆç½‘å…³ï¼š
 * - é€ŸçŽ‡é™åˆ¶ (é˜²æš´åŠ›ç ´è§£)
 * - Origin æ ¡éªŒ (é˜²è·¨ç«™ WebSocket åŠ«æŒ)
 * - æ—¶é—´å®‰å…¨è®¤è¯ (é˜²è®¡æ—¶æ”»å‡»)
 * - ç»‘å®šåœ°å€æ ¡éªŒ (é˜²å…¬ç½‘æš´éœ²)
 * - è¯·æ±‚ä½“å¤§å°é™åˆ¶ (é˜² DoS)
 * - æç¤ºæ³¨å…¥æ£€æµ‹ (é˜²æ—¥å¿—æŠ•æ¯’)
>>>>>>> dev
 */

import type { Server as HttpServer, IncomingMessage } from "node:http";
import { createServer } from "node:http";
import process from "node:process";
import { createSubsystemLogger } from "../../logging/index.js";
import type {
  OxygenConfig,
  OxygenEvent,
  OxygenEventHandler,
} from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type {
  InferenceEngine,
  ChatMessage,
} from "../../inference/engine/index.js";

const log = createSubsystemLogger("gateway");

<<<<<<< HEAD
// ©¤©¤©¤ Constants ©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB max request body

// ©¤©¤©¤ Types ©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤
=======
// === Constants ===

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB max request body

// === Types ===
>>>>>>> dev

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
  readonly httpServer: import("node:http").Server | null;
};

type RequestContext = {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
  authenticated: boolean;
  clientIp: string;
};

<<<<<<< HEAD
// ©¤©¤©¤ Auth (timing-safe) ©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤
=======
// === Rate Limiter ===
>>>>>>> dev

class RateLimiter {
  private requests = new Map<string, number[]>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(clientId: string): boolean {
    const now = nowMs();
    const windowStart = now - this.windowMs;

    // Get existing requests
    let timestamps = this.requests.get(clientId) || [];

    // Filter to current window
    timestamps = timestamps.filter(t => t > windowStart);

    // Check limit
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(clientId, timestamps);

    return true;
  }

  getRemaining(clientId: string): number {
    const now = nowMs();
    const windowStart = now - this.windowMs;
    const timestamps = (this.requests.get(clientId) || [])
      .filter(t => t > windowStart);
    return Math.max(0, this.maxRequests - timestamps.length);
  }
}

<<<<<<< HEAD
// ©¤©¤©¤ Helpers ©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤

function getClientIp(req: IncomingMessage): string {
  // ²»ÐÅÈÎ X-Forwarded-For£¨·ÀÖ¹ IP Î±Ôì£©
=======
// === Gateway Server ===

export function createGatewayServer(options: GatewayServerOptions): GatewayServer {
  const { config } = options;
  const rateLimiter = new RateLimiter(
    config.gateway?.rateLimit?.windowMs ?? 60000,
    config.gateway?.rateLimit?.maxRequests ?? 100,
  );

  let server: HttpServer | null = null;
  let isRunning = false;

  const start = async (): Promise<void> => {
    if (isRunning) {
      throw new Error("Gateway already running");
    }

    // Validate binding
    const host = config.gateway?.host ?? "127.0.0.1";
    const port = config.gateway?.port ?? 4800;

    if (host === "0.0.0.0" || host === "::") {
      log.warn("Binding to 0.0.0.0 exposes the gateway to public network");
    }

    server = createServer(async (req, res) => {
      const context: RequestContext = {
        requestId: generateId("req"),
        method: req.method ?? "GET",
        path: req.url ?? "/",
        startTime: nowMs(),
        authenticated: false,
        clientIp: getClientIp(req),
      };

      try {
        // CORS headers
        setCorsHeaders(res, config.gateway?.cors?.origins);

        // Handle preflight
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        // Rate limiting
        if (!rateLimiter.isAllowed(context.clientIp)) {
          res.writeHead(429, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: "Too many requests",
            retryAfter: Math.ceil((config.gateway?.rateLimit?.windowMs ?? 60000) / 1000),
          }));
          return;
        }

        // Body size check
        const contentLength = parseInt(req.headers["content-length"] ?? "0", 10);
        if (contentLength > MAX_BODY_BYTES) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Request body too large" }));
          return;
        }

        // Authentication
        const authResult = await authenticate(req, config);
        if (!authResult.success) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: authResult.error }));
          return;
        }
        context.authenticated = true;

        // Route handling
        const result = await handleRequest(req, res, context, options);

        // Log request
        const duration = nowMs() - context.startTime;
        log.info(`${context.method} ${context.path} - ${result.statusCode} (${duration}ms)`);

      } catch (error) {
        log.error(`Request error: ${error}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });

    return new Promise((resolve, reject) => {
      server!.listen(port, host, () => {
        isRunning = true;
        log.info(`Gateway listening on ${host}:${port}`);
        resolve();
      });

      server!.on("error", (error) => {
        reject(error);
      });
    });
  };

  const stop = async (): Promise<void> => {
    if (!server || !isRunning) {
      return;
    }

    return new Promise((resolve) => {
      server!.close(() => {
        isRunning = false;
        log.info("Gateway stopped");
        resolve();
      });
    });
  };

  return {
    start,
    stop,
    get port() { return config.gateway?.port ?? 4800; },
    get isRunning() { return isRunning; },
    get httpServer() { return server; },
  };
}

// === Request Handling ===

async function handleRequest(
  req: IncomingMessage,
  res: import("node:http").ServerResponse,
  context: RequestContext,
  options: GatewayServerOptions,
): Promise<{ statusCode: number }> {
  const { path, method } = context;

  // Health check
  if (path === "/health" && method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: nowMs() }));
    return { statusCode: 200 };
  }

  // API routes
  if (path.startsWith("/api/v1/")) {
    return handleApiRequest(req, res, context, options);
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
  return { statusCode: 404 };
}

async function handleApiRequest(
  req: IncomingMessage,
  res: import("node:http").ServerResponse,
  context: RequestContext,
  options: GatewayServerOptions,
): Promise<{ statusCode: number }> {
  const { path, method } = context;
  const route = path.replace("/api/v1/", "");

  // Parse body
  const body = await parseBody(req);

  switch (route) {
    case "chat":
      if (method === "POST") {
        return handleChatRequest(body, res, options);
      }
      break;

    case "execute":
      if (method === "POST") {
        return handleExecuteRequest(body, res, options);
      }
      break;

    case "status":
      if (method === "GET") {
        return handleStatusRequest(res);
      }
      break;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "API endpoint not found" }));
  return { statusCode: 404 };
}

async function handleChatRequest(
  body: unknown,
  res: import("node:http").ServerResponse,
  options: GatewayServerOptions,
): Promise<{ statusCode: number }> {
  const { inferenceEngine } = options;

  if (!inferenceEngine) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Inference engine not available" }));
    return { statusCode: 503 };
  }

  try {
    const request = body as { messages: ChatMessage[] };
    const response = await inferenceEngine.infer({
      messages: request.messages,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      id: response.id,
      content: response.content,
      model: response.model,
      usage: response.usage,
    }));
    return { statusCode: 200 };
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(error) }));
    return { statusCode: 500 };
  }
}

async function handleExecuteRequest(
  body: unknown,
  res: import("node:http").ServerResponse,
  options: GatewayServerOptions,
): Promise<{ statusCode: number }> {
  // TODO: Implement execution endpoint
  res.writeHead(501, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not implemented" }));
  return { statusCode: 501 };
}

async function handleStatusRequest(
  res: import("node:http").ServerResponse,
): Promise<{ statusCode: number }> {
  const status = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version ?? "unknown",
    timestamp: nowMs(),
  };

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(status));
  return { statusCode: 200 };
}

// === Utilities ===

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]!.trim();
  }
>>>>>>> dev
  return req.socket.remoteAddress ?? "unknown";
}

function setCorsHeaders(
  res: import("node:http").ServerResponse,
  allowedOrigins?: string[],
): void {
  const origin = allowedOrigins?.[0] ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

<<<<<<< HEAD
// ©¤©¤©¤ Server Factory ©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤
=======
async function authenticate(
  req: IncomingMessage,
  config: OxygenConfig,
): Promise<{ success: boolean; error?: string }> {
  const authMode = config.gateway?.auth?.mode ?? "none";
>>>>>>> dev

  if (authMode === "none") {
    return { success: true };
  }

<<<<<<< HEAD
  // ³õÊ¼»¯ËÙÂÊÏÞÖÆÆ÷
  const rateLimiter = new RateLimiter(config.gateway.rateLimit);

  // ¶¨ÆÚÇåÀíËÙÂÊÏÞÖÆ¼ÇÂ¼
  const cleanupInterval = setInterval(() => rateLimiter.cleanup(), 60_000);

  const emitEvent = (event: OxygenEvent) => {
    onEvent?.(event);
  };

  const httpServer = createServer(async (req, res) => {
    const clientIp = getClientIp(req);
    const ctx: RequestContext = {
      requestId: generateId("req"),
      method: req.method ?? "GET",
      path: req.url?.split("?")[0] ?? "/", // °þÀë query string£¨·À CVE-2026-25253£©
      startTime: nowMs(),
      authenticated: false,
      clientIp,
    };

    // ©¤©¤ ËÙÂÊÏÞÖÆ ©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤
    const rateCheck = rateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      log.warn(`Rate limited: ${clientIp} ¡ª ${rateCheck.reason}`);
      respond(
        res,
        429,
        { error: rateCheck.reason },
        {
          "Retry-After": String(
            Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000),
          ),
        },
      );
      return;
    }

    // ©¤©¤ CORS£¨ÑÏ¸ñÄ£Ê½£©©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤
    const allowedOrigins = config.gateway.cors?.origins ?? [
      "http://127.0.0.1",
      "http://localhost",
    ];
    const requestOrigin = req.headers.origin;
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    }
    // ²»ÉèÖÃÍ¨Åä·û "*"£¬·ÀÖ¹¿çÓò¹¥»÷
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Access-Control-Max-Age", "3600");

    // °²È«ÏìÓ¦Í·
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
=======
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { success: false, error: "Authorization required" };
  }

  if (authMode === "token") {
    const expectedToken = config.gateway?.auth?.token ?? process.env.OPENOXYGEN_GATEWAY_TOKEN;
    if (!expectedToken) {
      return { success: false, error: "Server configuration error" };
    }

    const providedToken = authHeader.replace("Bearer ", "");
    
    // Timing-safe comparison
    if (!timingSafeEqual(providedToken, expectedToken)) {
      return { success: false, error: "Invalid token" };
    }
  }

  return { success: true };
}
>>>>>>> dev

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

<<<<<<< HEAD
    // ©¤©¤ ÈÏÖ¤£¨Ìø¹ý /health£©©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤
    if (ctx.path !== "/health") {
      ctx.authenticated = validateAuth(config, req.headers.authorization);
      if (!ctx.authenticated) {
        rateLimiter.recordAuthFailure(clientIp);
        respond(res, 401, { error: "Unauthorized" });
        return;
      }
      rateLimiter.resetAuthFailures(clientIp);
    }

    // ©¤©¤ ½âÎöÇëÇóÌå£¨´ø´óÐ¡ÏÞÖÆ£©©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤
    let body: unknown = null;
    if (req.method === "POST" || req.method === "PUT") {
=======
async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => {
>>>>>>> dev
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
<<<<<<< HEAD
    }

    try {
      const { method, path } = ctx;

      // GET /health
      if (method === "GET" && path === "/health") {
        respond(res, 200, {
          status: "ok",
          timestamp: nowMs(),
          version: "0.1.0",
        });
        return;
      }

      // GET / ¡ª Dashboard
      if (method === "GET" && (path === "/" || path === "/dashboard")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(DASHBOARD_HTML);
        return;
      }

      // GET /api/v1/status
      if (method === "GET" && path === "/api/v1/status") {
        respond(res, 200, {
          gateway: { host: config.gateway.host, port: config.gateway.port },
          agents: config.agents.list.map((a) => ({ id: a.id, name: a.name })),
          channels: config.channels.map((c) => ({
            id: c.id,
            type: c.type,
            enabled: c.enabled,
          })),
          plugins: config.plugins.map((p) => ({
            name: p.name,
            enabled: p.enabled,
          })),
          models: config.models.map((m) => ({
            provider: m.provider,
            model: m.model,
            hasKey: !!m.apiKey,
          })),
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
          respond(res, 400, {
            error: "Either 'message' or 'messages' field required",
          });
          return;
        }

        // ©¤©¤ ÌáÊ¾×¢Èë¼ì²â ©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤
        for (const msg of messages) {
          if (msg.role === "user" && msg.content) {
            const injection = detectPromptInjection(msg.content);
            if (injection.risk === "high") {
              log.error(
                `Blocked high-risk prompt injection from ${clientIp}: ${injection.patterns.join(", ")}`,
              );
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

        log.info(
          `Chat ${ctx.requestId} from ${clientIp}: ${messages.length} msgs, mode=${chatBody.mode ?? "auto"}`,
        );

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

        const { TaskPlanner } =
          await import("../../inference/planner/index.js");
        const planner = new TaskPlanner(inferenceEngine);
        const plan = await planner.generatePlan(
          planBody.goal,
          planBody.context,
        );

        emitEvent({ type: "plan.created", planId: plan.id });
        respond(res, 200, plan);
        return;
      }

      // POST /api/v1/task/:id/cancel ¡ª Cancel running task
      if (
        method === "POST" &&
        path.startsWith("/api/v1/task/") &&
        path.endsWith("/cancel")
      ) {
        const taskId = path.split("/")[4];
        // ¹ã²¥È¡ÏûÊÂ¼þµ½ WebSocket
        emitEvent({
          type: "plan.failed",
          planId: taskId || "",
          error: "User cancelled",
        });
        respond(res, 200, { cancelled: true, taskId });
        return;
      }

      // GET /api/v1/ws/status ¡ª WebSocket channel status
      if (method === "GET" && path === "/api/v1/ws/status") {
        respond(res, 200, {
          websocket: true,
          path: "/ws",
          message: "Connect via WebSocket at ws://host:port/ws",
        });
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
    get httpServer() {
      return server;
    },
    start: () =>
      new Promise<void>((resolve, reject) => {
        // °ó¶¨µØÖ·°²È«¼ì²é
        const bindCheck = validateGatewayBinding(
          config.gateway.host,
          config.gateway.port,
        );
        if (!bindCheck.safe) {
          const err = new Error(`Unsafe gateway binding: ${bindCheck.reason}`);
          log.error(err.message);
          reject(err);
          return;
        }

        httpServer.listen(config.gateway.port, config.gateway.host, () => {
          running = true;
          server = httpServer;
          log.info(
            `Gateway started on ${config.gateway.host}:${config.gateway.port} (hardened)`,
          );
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
=======
    });
    req.on("error", reject);
  });
>>>>>>> dev
}

// === Exports ===

export { createGatewayServer, RateLimiter };
export default createGatewayServer;
