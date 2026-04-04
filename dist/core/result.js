/**
 * OpenOxygen — Unified Result Type
 *
 * 统一的操作结果类型，替代分散的 success/error 模式。
 * 所有模块应使用 OxygenResult<T> 作为返回类型。
 */
// ─── Factory Functions ──────────────────────────────────────────────────────
export function ok(data, meta) {
    return { ok: true, data, ...meta };
}
export function err(error, code, meta) {
    return { ok: false, error, code, ...meta };
}
// ─── Error Codes ────────────────────────────────────────────────────────────
export const ErrorCodes = {
    // Native module
    NATIVE_NOT_FOUND: "OXY_N001",
    NATIVE_CALL_FAILED: "OXY_N002",
    // LLM
    LLM_TIMEOUT: "OXY_L001",
    LLM_PARSE_FAILED: "OXY_L002",
    LLM_NO_RESPONSE: "OXY_L003",
    // Execution
    EXEC_TIMEOUT: "OXY_E001",
    EXEC_BLOCKED: "OXY_E002",
    EXEC_NOT_FOUND: "OXY_E003",
    // Browser
    BROWSER_LAUNCH_FAILED: "OXY_B001",
    BROWSER_CDP_FAILED: "OXY_B002",
    BROWSER_NAVIGATE_FAILED: "OXY_B003",
    // Agent
    AGENT_NOT_FOUND: "OXY_A001",
    AGENT_BUSY: "OXY_A002",
    TASK_NOT_FOUND: "OXY_A003",
    // Config
    CONFIG_INVALID: "OXY_C001",
    CONFIG_NOT_FOUND: "OXY_C002",
};
