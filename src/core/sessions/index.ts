/**
 * OpenOxygen — Session Management
 *
 * 会话生命周期管理：创建、持久化、路由绑定。
 * 接口协议兼容 OpenClaw 的 session-key 规范。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import type { SessionEntry } from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { resolveStateDir } from "../config/index.js";

const log = createSubsystemLogger("sessions");

// ─── Session Key Convention ─────────────────────────────────────────────────
// Compatible with OpenClaw's session key format:
//   default key:  "main"
//   agent key:    "agent:<agentId>:main"
//   peer key:     "agent:<agentId>:<channel>:<peerId>"

export const DEFAULT_AGENT_ID = "default";
export const DEFAULT_ACCOUNT_ID = "default";
export const DEFAULT_MAIN_KEY = "main";

export function buildMainSessionKey(agentId: string): string {
  if (agentId === DEFAULT_AGENT_ID) return DEFAULT_MAIN_KEY;
  return `agent:${normalizeAgentId(agentId)}:main`;
}

export function buildPeerSessionKey(
  agentId: string,
  channel: string,
  peerId: string,
): string {
  const agent = normalizeAgentId(agentId);
  const safePeer = peerId.replace(/[^a-zA-Z0-9_@.+-]/g, "_");
  return `agent:${agent}:${channel}:${safePeer}`;
}

export function normalizeAgentId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

export function parseSessionKey(key: string): {
  agentId: string;
  channel?: string;
  peerId?: string;
} {
  if (key === DEFAULT_MAIN_KEY) {
    return { agentId: DEFAULT_AGENT_ID };
  }
  const parts = key.split(":");
  if (parts[0] !== "agent" || parts.length < 3) {
    return { agentId: DEFAULT_AGENT_ID };
  }
  const agentId = parts[1] ?? DEFAULT_AGENT_ID;
  if (parts[2] === "main") {
    return { agentId };
  }
  return {
    agentId,
    channel: parts[2],
    peerId: parts.slice(3).join(":"),
  };
}

// ─── Session Store ──────────────────────────────────────────────────────────

export type SessionStore = {
  sessions: Record<string, SessionEntry>;
  version: number;
};

const SESSIONS_FILENAME = "sessions.json";

function resolveSessionStorePath(): string {
  return path.join(resolveStateDir(), SESSIONS_FILENAME);
}

export async function loadSessionStore(): Promise<SessionStore> {
  const storePath = resolveSessionStorePath();
  try {
    const raw = await fs.readFile(storePath, "utf-8");
    return JSON.parse(raw) as SessionStore;
  } catch {
    return { sessions: {}, version: 1 };
  }
}

export async function saveSessionStore(store: SessionStore): Promise<void> {
  const storePath = resolveSessionStorePath();
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

// ─── Session CRUD ───────────────────────────────────────────────────────────

export async function createSession(
  agentId: string,
  channelId?: string,
): Promise<SessionEntry> {
  const store = await loadSessionStore();
  const key = channelId
    ? buildPeerSessionKey(agentId, channelId, generateId())
    : buildMainSessionKey(agentId);

  const entry: SessionEntry = {
    id: generateId("session"),
    key,
    agentId,
    channelId,
    createdAt: nowMs(),
    lastActiveAt: nowMs(),
  };

  store.sessions[key] = entry;
  store.version += 1;
  await saveSessionStore(store);
  log.info(`Session created: ${key}`);
  return entry;
}

export async function getSession(key: string): Promise<SessionEntry | null> {
  const store = await loadSessionStore();
  return store.sessions[key] ?? null;
}

export async function touchSession(key: string): Promise<void> {
  const store = await loadSessionStore();
  const entry = store.sessions[key];
  if (entry) {
    entry.lastActiveAt = nowMs();
    await saveSessionStore(store);
  }
}

export async function deleteSession(key: string): Promise<boolean> {
  const store = await loadSessionStore();
  if (store.sessions[key]) {
    delete store.sessions[key];
    store.version += 1;
    await saveSessionStore(store);
    log.info(`Session deleted: ${key}`);
    return true;
  }
  return false;
}

export async function listSessions(agentId?: string): Promise<SessionEntry[]> {
  const store = await loadSessionStore();
  const all = Object.values(store.sessions);
  if (!agentId) return all;
  return all.filter((s) => s.agentId === agentId);
}
