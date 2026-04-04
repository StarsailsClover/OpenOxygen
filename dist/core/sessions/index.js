/**
<<<<<<< HEAD
 * OpenOxygen �?Session Management
=======
 * OpenOxygen - Session Management
>>>>>>> dev
 *
 * 会话生命周期管理：创建、持久化、路由绑定�? * 接口协议兼容 OpenClaw �?session-key 规范�? */
import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { resolveStateDir } from "../config/index.js";
const log = createSubsystemLogger("sessions");
// === Session Key Convention ===
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
    const agentId = parts[1];
    if (parts.length === 3) {
        return { agentId, channel: parts[2] };
    }
    return { agentId, channel: parts[2], peerId: parts[3] };
}
// === Session Store ===
const sessions = new Map();
const SESSIONS_FILE = "sessions.json";
/**
 * Create a new session
 */
export async function createSession(agentId = DEFAULT_AGENT_ID, metadata) {
    const sessionKey = buildMainSessionKey(agentId);
    const session = {
        id: generateId("sess"),
        key: sessionKey,
        agentId,
        createdAt: nowMs(),
        lastActiveAt: nowMs(),
        metadata: {
            ...metadata,
            version: "1.0",
        },
    };
    sessions.set(sessionKey, session);
    log.info(`Created session: ${sessionKey} (${session.id})`);
    await persistSessions();
    return session;
}
/**
 * Get session by key
 */
export function getSession(key) {
    return sessions.get(key);
}
/**
 * Get or create session
 */
export async function getOrCreateSession(key, agentId) {
    let session = sessions.get(key);
    if (!session) {
        const parsed = parseSessionKey(key);
        session = await createSession(agentId ?? parsed.agentId);
    }
    return session;
}
/**
 * Update session activity
 */
export function touchSession(key) {
    const session = sessions.get(key);
    if (!session)
        return false;
    session.lastActiveAt = nowMs();
    return true;
}
/**
 * Delete session
 */
export async function deleteSession(key) {
    const existed = sessions.delete(key);
    if (existed) {
        log.info(`Deleted session: ${key}`);
        await persistSessions();
    }
    return existed;
}
/**
 * List all sessions
 */
export function listSessions() {
    return Array.from(sessions.values());
}
/**
 * List sessions by agent
 */
export function listSessionsByAgent(agentId) {
    return Array.from(sessions.values()).filter(s => s.agentId === agentId);
}
/**
 * Clean up expired sessions
 */
export async function cleanupSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = nowMs();
    let cleaned = 0;
    for (const [key, session] of sessions.entries()) {
        if (now - session.lastActiveAt > maxAgeMs) {
            sessions.delete(key);
            cleaned++;
            log.debug(`Cleaned up expired session: ${key}`);
        }
    }
    if (cleaned > 0) {
        await persistSessions();
        log.info(`Cleaned up ${cleaned} expired sessions`);
    }
    return cleaned;
}
// === Persistence ===
async function persistSessions() {
    const stateDir = resolveStateDir();
    const filePath = path.join(stateDir, SESSIONS_FILE);
    try {
        const data = JSON.stringify(Array.from(sessions.entries()), null, 2);
        await fs.mkdir(stateDir, { recursive: true });
        await fs.writeFile(filePath, data, "utf-8");
    }
    catch (error) {
        log.error(`Failed to persist sessions: ${error}`);
    }
}
export async function loadSessions() {
    const stateDir = resolveStateDir();
    const filePath = path.join(stateDir, SESSIONS_FILE);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        const entries = JSON.parse(data);
        for (const [key, session] of entries) {
            sessions.set(key, session);
        }
        log.info(`Loaded ${entries.length} sessions`);
    }
    catch (error) {
        // File may not exist yet
        log.debug("No existing sessions file found");
    }
}
export default {
    create: createSession,
    get: getSession,
    getOrCreate: getOrCreateSession,
    touch: touchSession,
    delete: deleteSession,
    list: listSessions,
    listByAgent: listSessionsByAgent,
    cleanup: cleanupSessions,
    load: loadSessions,
    buildMainSessionKey,
    buildPeerSessionKey,
    normalizeAgentId,
    parseSessionKey,
    DEFAULT_AGENT_ID,
    DEFAULT_MAIN_KEY,
};
