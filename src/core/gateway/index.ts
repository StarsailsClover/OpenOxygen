/**
 * OpenOxygen — Gateway Server
 *
 * HTTP/WebSocket 网关服务器，统一接入层。
 * 提供 REST API + WebSocket 实时通信。
 * 独立实现，接口协议兼容 OpenClaw Gateway。
 */

import type { Server as HttpServer } from "node:http";
import { createServer } from "node:http";
import process from "node:process";
import { createSubsystemLogger } from "../../logging/index.js";
import type { OxygenConfig, OxygenEvent, OxygenEventHandler } from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type { InferenceEngine, ChatMessage } from "../../inference/engine/index.js";

const log = createSubsystemLogger("gateway");

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
};

// ─── Auth ───────────────────────────────────────────────────────────────────

function validateAuth(
  config: OxygenConfig,
  authHeader: string | undefined,
): boolean {
  const { auth } = config.gateway;
  if (auth.mode === "none") return true;
  if (!authHeader) return false;

  if (auth.mode === "token") {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    return token === auth.token;
  }

  if (auth.mode === "password") {
    if (!authHeader.startsWith("Basic ")) return false;
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
      const [, password] = decoded.split(":");
      return password === auth.password;
    } catch {
      return false;
    }
  }

  return false;
}

// ─── Server Factory ─────────────────────────────────────────────────────────

export function createGatewayServer(options: GatewayServerOptions): GatewayServer {
  const { config, inferenceEngine, onEvent } = options;
  let server: HttpServer | null = null;
  let running = false;

  const emitEvent = (event: OxygenEvent) => {
    onEvent?.(event);
  };

  const httpServer = createServer(async (req, res) => {
    const ctx: RequestContext = {
      requestId: generateId("req"),
      method: req.method ?? "GET",
      path: req.url ?? "/",
      startTime: nowMs(),
      authenticated: false,
    };

    // CORS
    const origins = config.gateway.cors?.origins ?? ["*"];
    res.setHeader("Access-Control-Allow-Origin", origins.join(","));
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Auth (skip for health endpoint)
    if (ctx.path !== "/health") {
      ctx.authenticated = validateAuth(config, req.headers.authorization);
      if (!ctx.authenticated) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
    }

    // Parse body for POST/PUT
    let body: unknown = null;
    if (req.method === "POST" || req.method === "PUT") {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const raw = Buffer.concat(chunks).toString("utf-8");
        body = raw ? JSON.parse(raw) : null;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
    }

    try {
      // ─── Route Dispatch ───────────────────────────────────────────
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

      // POST /api/v1/chat — Main inference endpoint
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

        // Support both single message and full messages array
        let messages: ChatMessage[];
        if (chatBody.messages) {
          messages = chatBody.messages;
        } else if (chatBody.message) {
          messages = [{ role: "user", content: chatBody.message }];
        } else {
          respond(res, 400, { error: "Either 'message' or 'messages' field required" });
          return;
        }

        log.info(`Chat request ${ctx.requestId}: ${messages.length} messages, mode=${chatBody.mode ?? "auto"}`);

        emitEvent({ type: "agent.message", agentId: "default", sessionKey: "main", content: messages[messages.length - 1]?.content ?? "" });

        const inferenceResult = await inferenceEngine.infer({
          messages,
          mode: chatBody.mode,
          systemPrompt: chatBody.systemPrompt,
        });

        const elapsed = nowMs() - ctx.startTime;
        log.info(`Chat response ${ctx.requestId}: ${inferenceResult.usage?.totalTokens ?? "?"} tokens in ${elapsed}ms`);

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

      // POST /api/v1/plan — Task planning endpoint
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

        // Import planner dynamically to avoid circular deps
        const { TaskPlanner } = await import("../../inference/planner/index.js");
        const planner = new TaskPlanner(inferenceEngine);
        const plan = await planner.generatePlan(planBody.goal, planBody.context);

        emitEvent({ type: "plan.created", planId: plan.id });

        respond(res, 200, plan);
        return;
      }

      // 404
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
        httpServer.listen(config.gateway.port, config.gateway.host, () => {
          running = true;
          server = httpServer;
          log.info(`Gateway started on ${config.gateway.host}:${config.gateway.port}`);
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

function respond(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
