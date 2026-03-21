/**
 * OpenOxygen — Unified Result Type
 *
 * 统一的操作结果类型，替代分散的 success/error 模式。
 * 所有模块应使用 OxygenResult<T> 作为返回类型。
 */
export type OxygenResult<T = void> = {
    ok: boolean;
    data?: T;
    error?: string;
    code?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
};
export declare function ok<T>(data?: T, meta?: Partial<OxygenResult<T>>): OxygenResult<T>;
export declare function err<T = void>(error: string, code?: string, meta?: Partial<OxygenResult<T>>): OxygenResult<T>;
export declare const ErrorCodes: {
    readonly NATIVE_NOT_FOUND: "OXY_N001";
    readonly NATIVE_CALL_FAILED: "OXY_N002";
    readonly LLM_TIMEOUT: "OXY_L001";
    readonly LLM_PARSE_FAILED: "OXY_L002";
    readonly LLM_NO_RESPONSE: "OXY_L003";
    readonly EXEC_TIMEOUT: "OXY_E001";
    readonly EXEC_BLOCKED: "OXY_E002";
    readonly EXEC_NOT_FOUND: "OXY_E003";
    readonly BROWSER_LAUNCH_FAILED: "OXY_B001";
    readonly BROWSER_CDP_FAILED: "OXY_B002";
    readonly BROWSER_NAVIGATE_FAILED: "OXY_B003";
    readonly AGENT_NOT_FOUND: "OXY_A001";
    readonly AGENT_BUSY: "OXY_A002";
    readonly TASK_NOT_FOUND: "OXY_A003";
    readonly CONFIG_INVALID: "OXY_C001";
    readonly CONFIG_NOT_FOUND: "OXY_C002";
};
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
//# sourceMappingURL=result.d.ts.map