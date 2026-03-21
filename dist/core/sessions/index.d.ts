/**
 * OpenOxygen — Session Management
 *
 * 会话生命周期管理：创建、持久化、路由绑定。
 * 接口协议兼容 OpenClaw 的 session-key 规范。
 */
import type { SessionEntry } from "../../types/index.js";
export declare const DEFAULT_AGENT_ID = "default";
export declare const DEFAULT_ACCOUNT_ID = "default";
export declare const DEFAULT_MAIN_KEY = "main";
export declare function buildMainSessionKey(agentId: string): string;
export declare function buildPeerSessionKey(agentId: string, channel: string, peerId: string): string;
export declare function normalizeAgentId(id: string): string;
export declare function parseSessionKey(key: string): {
    agentId: string;
    channel?: string;
    peerId?: string;
};
export type SessionStore = {
    sessions: Record<string, SessionEntry>;
    version: number;
};
export declare function loadSessionStore(): Promise<SessionStore>;
export declare function saveSessionStore(store: SessionStore): Promise<void>;
export declare function createSession(agentId: string, channelId?: string): Promise<SessionEntry>;
export declare function getSession(key: string): Promise<SessionEntry | null>;
export declare function touchSession(key: string): Promise<void>;
export declare function deleteSession(key: string): Promise<boolean>;
export declare function listSessions(agentId?: string): Promise<SessionEntry[]>;
//# sourceMappingURL=index.d.ts.map