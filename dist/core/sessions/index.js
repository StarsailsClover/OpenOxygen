/**
 * OpenOxygen �?Session Management
 *
 * 会话生命周期管理：创建、持久化、路由绑定�? * 接口协议兼容 OpenClaw �?session-key 规范�? */
import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
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
export function buildMainSessionKey(agentId) {
    if (agentId === DEFAULT_AGENT_ID)
        return DEFAULT_MAIN_KEY;
    return `agent:${normalizeAgentId(agentId)}:main`;
}
export function buildPeerSessionKey(agentId, channel, peerId) {
    const agent = normalizeAgentId(agentId);
    const safePeer = peerId.replace(/[^a-zA-Z0-9_@.+-]/g, "_");
    return `agent:${agent}:${channel}:${safePeer}`;
}
export function normalizeAgentId(id) {
    return id.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}
export function parseSessionKey(key) {
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
const SESSIONS_FILENAME = "sessions.json";
function resolveSessionStorePath() {
    return path.join(resolveStateDir(), SESSIONS_FILENAME);
}
export async function loadSessionStore() {
    const storePath = resolveSessionStorePath();
    try {
        const raw = await fs.readFile(storePath, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return { sessions: {}, version: 1 };
    }
}
export async function saveSessionStore(store) {
    const storePath = resolveSessionStorePath();
    const dir = path.dirname(storePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}
// ─── Session CRUD ───────────────────────────────────────────────────────────
export async function createSession(agentId, channelId) {
    const store = await loadSessionStore();
    const key = channelId
        ? buildPeerSessionKey(agentId, channelId, generateId())
        : buildMainSessionKey(agentId);
    const entry = {
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
export async function getSession(key) {
    const store = await loadSessionStore();
    return store.sessions[key] ?? null;
}
export async function touchSession(key) {
    const store = await loadSessionStore();
    const entry = store.sessions[key];
    if (entry) {
        entry.lastActiveAt = nowMs();
        await saveSessionStore(store);
    }
}
export async function deleteSession(key) {
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
export async function listSessions(agentId) {
    const store = await loadSessionStore();
    const all = Object.values(store.sessions);
    if (!agentId)
        return all;
    return all.filter((s) => s.agentId === agentId);
}
