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
import type { OxygenConfig, OxygenEventHandler } from "../../types/index.js";
import type { InferenceEngine } from "../../inference/engine/index.js";
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
export declare function createGatewayServer(options: GatewayServerOptions): GatewayServer;
//# sourceMappingURL=index.d.ts.map