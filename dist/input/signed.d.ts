/**
 * OpenOxygen Phase 4 — Signed Input Sequences (26w11aE_P4)
 *
 * 签名输入序列：防篡改、防重放、可审计的输入操作链
 *
 * 安全模型：
 * 1. 每个输入序列签名 (HMAC-SHA256)
 * 2. Nonce 防重放
 * 3. 时间窗口验证
 * 4. 操作日志关联审计
 */
export type InputActionType = "click" | "move" | "type" | "hotkey" | "scroll" | "wait" | "smooth_move" | "smooth_click";
export interface InputAction {
    type: InputActionType;
    params: Record<string, unknown>;
    timestamp: number;
}
export interface SignedInputSequence {
    id: string;
    actions: InputAction[];
    signature: string;
    nonce: string;
    createdAt: number;
    expiresAt: number;
    issuer: string;
    version: number;
}
export interface SignedInputConfig {
    secretKey: string;
    maxSequenceLength: number;
    maxAgeSec: number;
    replayWindowSec: number;
}
export declare class SignedInputManager {
    private config;
    private nonceRegistry;
    private executionLog;
    constructor(config?: Partial<SignedInputConfig>);
    /**
     * 创建签名输入序列
     */
    createSequence(actions: Array<Omit<InputAction, "timestamp">>): SignedInputSequence;
    /**
     * 验证签名输入序列
     */
    verify(sequence: SignedInputSequence): {
        valid: boolean;
        reason?: string;
    };
    /**
     * 执行签名序列（验证后执行）
     */
    execute(sequence: SignedInputSequence, executor: (action: InputAction) => Promise<boolean>): Promise<{
        success: boolean;
        executed: number;
        failed: number;
        error?: string;
    }>;
    /**
     * 获取执行日志
     */
    getExecutionLog(sequenceId?: string): typeof this.executionLog;
    private sign;
    destroy(): void;
}
//# sourceMappingURL=signed.d.ts.map