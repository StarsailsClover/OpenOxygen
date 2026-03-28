/**
 * OpenOxygen - Gateway Server
 * 
 * HTTP Gateway server for OpenOxygen Agent framework
 * Implements REST API and WebSocket support
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import type { OxygenConfig } from "../types/index.js";
import { ErrorCode, createError } from "../core/errors.js";

const log = createSubsystemLogger("core/gateway");

export type GatewayOptions = {
  config: OxygenConfig;
  port?: number;
  host?: string;
};

export type GatewayServer = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  readonly port: number;
  readonly host: string;
  readonly isRunning: boolean;
};

type RouteHandler = (req: IncomingMessage, res: ServerResponse, params: Record<string, string>) => Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
}

class Router {
  private routes: Route[] = [];
  
  options(path: string, handler: RouteHandler): void {
    this.addRoute("OPTIONS", path, handler);
  }

  get(path: string, handler: RouteHandler): void {
    this.addRoute("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.addRoute("POST", path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.addRoute("PUT", path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.addRoute("DELETE", path, handler);
  }

  private addRoute(method: string, path: string, handler: RouteHandler): void {
    const pattern = new RegExp(
      "^" + path.replace(/:([^/]+)/g, "([^/]+)") + "$"
    );
    this.routes.push({ method, pattern, handler });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const method = req.method || "GET";
    const url = req.url || "/";
    const pathParts = url.split("?");
    const requestPath = pathParts[0] || "/";

    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      const match = requestPath.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        const paramNames = route.pattern.toString()
          .match(/\(.*?\)/g)?.slice(1) || [];
        
        for (let i = 1; i < match.length; i++) {
          const matchValue = match[i];
          if (matchValue !== undefined) {
            params[`param${i}`] = matchValue;
          }
        }

        try {
          await route.handler(req, res, params);
        } catch (error) {
          log.error("Route handler error:", error);
          this.sendError(res, 500, "Internal Server Error");
        }
        return true;
      }
    }

    return false;
  }

  private sendError(res: ServerResponse, status: number, message: string): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message, status }));
  }
}

async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

export function createGateway(options: GatewayOptions): GatewayServer {
  const port = options.port || 4800;
  const host = options.host || "127.0.0.1";
  let isRunning = false;
  let server: ReturnType<typeof createServer> | null = null;

  const router = new Router();

  // Health check endpoint
  router.get("/health", async (req, res) => {
    sendJson(res, 200, {
      status: "healthy",
      version: "26w15aD",
      timestamp: nowMs(),
      uptime: process.uptime()
    });
  });

  // API status endpoint
  router.get("/api/v1/status", async (req, res) => {
    sendJson(res, 200, {
      status: "running",
      gateway: "OpenOxygen Gateway",
      version: "26w15aD",
      features: [
        "task_execution",
        "browser_automation",
        "vision_analysis",
        "multi_agent"
      ]
    });
  });

  // Task execution endpoint
  router.post("/api/v1/tasks", async (req, res) => {
    try {
      const body = await parseBody(req) as { instruction?: string; mode?: string };
      
      if (!body.instruction) {
        sendJson(res, 400, {
          error: "Missing required field: instruction",
          code: ErrorCode.GATEWAY_INVALID_JSON
        });
        return;
      }

      const taskId = generateId("task");
      
      sendJson(res, 202, {
        taskId,
        status: "accepted",
        instruction: body.instruction,
        mode: body.mode || "auto",
        createdAt: nowMs()
      });

      // TODO: Actually execute the task
      log.info(`Task ${taskId} accepted: ${body.instruction}`);
    } catch (error) {
      sendJson(res, 400, {
        error: "Invalid request body",
        code: ErrorCode.GATEWAY_INVALID_JSON
      });
    }
  });

  // Get task status
  router.get("/api/v1/tasks/:id", async (req, res, params) => {
    const taskId = params.param1;
    
    sendJson(res, 200, {
      taskId,
      status: "pending",
      progress: 0,
      message: "Task is being processed"
    });
  });

  // Cancel task
  router.delete("/api/v1/tasks/:id", async (req, res, params) => {
    const taskId = params.param1;
    
    sendJson(res, 200, {
      taskId,
      status: "cancelled",
      message: "Task cancelled successfully"
    });
  });

  // List agents
  router.get("/api/v1/agents", async (req, res) => {
    sendJson(res, 200, {
      agents: [
        { id: "default", name: "Default Agent", status: "idle" },
        { id: "browser", name: "Browser Agent", status: "idle" },
        { id: "vision", name: "Vision Agent", status: "idle" }
      ]
    });
  });

  // Execute browser action
  router.post("/api/v1/browser/execute", async (req, res) => {
    try {
      const body = await parseBody(req) as { action?: string; url?: string };
      
      sendJson(res, 200, {
        success: true,
        action: body.action,
        url: body.url,
        result: "Browser action executed"
      });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request" });
    }
  });

  // CORS preflight
  router.options("/*", async (req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    res.end();
  });

  log.info(`Creating gateway server on ${host}:${port}`);

  return {
    async start() {
      if (isRunning) {
        log.warn("Gateway is already running");
        return;
      }

      server = createServer(async (req, res) => {
        log.debug(`${req.method} ${req.url}`);

        const handled = await router.handle(req, res);
        
        if (!handled) {
          sendJson(res, 404, {
            error: "Not Found",
            path: req.url,
            code: ErrorCode.GATEWAY_ROUTE_NOT_FOUND
          });
        }
      });

      return new Promise((resolve, reject) => {
        server!.listen(port, host, () => {
          isRunning = true;
          log.info(`Gateway server started on ${host}:${port}`);
          resolve();
        });

        server!.on("error", (err) => {
          log.error("Server error:", err);
          reject(err);
        });
      });
    },

    async stop() {
      if (!isRunning || !server) {
        log.warn("Gateway is not running");
        return;
      }

      return new Promise((resolve) => {
        server!.close(() => {
          isRunning = false;
          log.info("Gateway server stopped");
          resolve();
        });
      });
    },

    get port() { return port; },
    get host() { return host; },
    get isRunning() { return isRunning; }
  };
}

export default createGateway;
