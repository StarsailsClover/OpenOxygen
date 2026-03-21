/**
 * OpenOxygen — Route Resolution
 *
 * 消息路由：根据 channel/peer/account 解析到目标 agent + session。
 * 接口协议兼容 OpenClaw 的 resolve-route 规范。
 */
import type { OxygenConfig, ResolvedRoute } from "../../types/index.js";
export type RouteBinding = {
    agentId: string;
    channel?: string;
    accountId?: string;
    peerId?: string;
    peerKind?: "user" | "group";
};
export declare function listBindings(config: OxygenConfig): RouteBinding[];
export type ResolveRouteInput = {
    config: OxygenConfig;
    channel: string;
    accountId?: string | null;
    peerId?: string | null;
    peerKind?: "user" | "group";
};
export declare function resolveRoute(input: ResolveRouteInput): ResolvedRoute;
//# sourceMappingURL=index.d.ts.map