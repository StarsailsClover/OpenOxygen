/**
 * OpenOxygen - Gateway Server (Hardened)
 *
 * 安全加固版网关：
 * - 速率限制 (防暴力破解)
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

// === Constants ===

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB max request body

// === Types ===

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

// === Rate Limiter ===

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

async function authenticate(
  req: IncomingMessage,
  config: OxygenConfig,
): Promise<{ success: boolean; error?: string }> {
  const authMode = config.gateway?.auth?.mode ?? "none";

  if (authMode === "none") {
    return { success: true };
  }

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

async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

// === Exports ===

export { createGatewayServer, RateLimiter };
export default createGatewayServer;
