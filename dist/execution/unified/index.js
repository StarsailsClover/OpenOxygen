/**
 * OpenOxygen — Unified Task Executor (完整版v2)
 *
 * 自动选择 Terminal/GUI/Browser/Hybrid 执行模式
 * 已集成真实 Terminal/Browser 模块
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import * as Terminal from "../terminal/index.js";
import * as Browser from "../browser/index.js";
import * as Native from "../../native-bridge.js";
const log = createSubsystemLogger("execution/unified");
// ─── Keyword-Based Router ────────────────────────────────────────────────
const PATTERNS = {
    terminal: [
        /^(npm|yarn|pnpm|npx)\s/i,
        /^(git|docker|kubectl|terraform|ansible)\s/i,
        /^(python|pip|node|cargo|rustc)\s/i,
        /^(mkdir|cd|ls|dir|copy|move|del|rmdir|rm|cp|mv)\s/i,
        /^(curl|wget|ssh|scp|tar|zip|unzip)\s/i,
        /\.(py|js|ts|rs|go|java|cpp|c|sh|bat|ps1)\b/i,
        /(代码|编译|构建|安装|部署|测试|运行脚本)/,
        /(file|文件|目录|folder|path|环境变量|env)/i,
    ],
    browser: [
        /^(chrome|edge|browser|网页|网站)\b/i,
        /(https?:\/\/|www\.)/i,
        /^(open|navigate|browse)\s+(to|the)/i,
        /(bilibili|youtube|github|google|baidu|zhihu|gmail)/i,
        /(搜索|search|查询|查找|browse)/i,
        /(登录|login|注册|signup)/i,
    ],
    gui: [
        /(点击|click|拖动|drag|滚动|scroll)/i,
        /(截图|screenshot|查看|view|observe)/i,
        /(微信|qq|steam|vscode|计算器|记事本)/i,
        /(按钮|button|菜单|menu|对话框|dialog)/i,
        /(输入|type|填写|fill|粘贴|paste)/i,
        /(颜色|color|位置|position|大小|size)/i,
        /(验证码|captcha|人机验证)/i,
    ],
};
function routeTaskInternal(instruction) {
    const lower = instruction.toLowerCase();
    const scores = { terminal: 0, browser: 0, gui: 0 };
    for (const [mode, patterns] of Object.entries(PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(instruction) || pattern.test(lower)) {
                scores[mode]++;
            }
        }
    }
    // Code file extensions boost terminal
    if (/\.(py|js|ts|rs|go|java|sh)\b/.test(instruction)) {
        scores.terminal += 5;
    }
    const total = scores.terminal + scores.browser + scores.gui;
    if (total === 0) {
        return { mode: "hybrid", confidence: 0.5, reason: "No clear pattern, try hybrid" };
    }
    const max = Math.max(scores.terminal, scores.browser, scores.gui);
    const dominant = Object.entries(scores).find(([, s]) => s === max)[0];
    const fallbacks = {
        terminal: "gui",
        browser: "gui",
        gui: "hybrid",
        hybrid: "gui",
        auto: "hybrid",
    };
    return {
        mode: dominant,
        confidence: max / total,
        reason: `${dominant} keywords detected (${max}/${total})`,
        fallback: fallbacks[dominant],
    };
}
// Export as analyzeTask
export const analyzeTask = routeTaskInternal;
// ─── Mode Executors ────────────────────────────────────────────────────
async function executeTerminal(instruction, logs) {
    logs.push("[Terminal] Starting execution...");
    const session = Terminal.createSession("powershell");
    try {
        // Extract command from instruction
        let command = instruction;
        // Simple extraction: remove common prefixes
        const prefixes = [/^run\s+/i, /^execute\s+/i, /^执行\s*/i, /^运行\s*/i];
        for (const prefix of prefixes) {
            command = command.replace(prefix, "");
        }
        logs.push(`[Terminal] Command: ${command.substring(0, 100)}`);
        const result = await Terminal.executeCommand(session.id, command);
        logs.push(`[Terminal] Exit code: ${result.terminalCommand?.exitCode}`);
        return result;
    }
    finally {
        Terminal.destroySession(session.id);
    }
}
async function executeBrowser(instruction, logs) {
    logs.push("[Browser] Starting execution...");
    try {
        const session = await Browser.createBrowserSession();
        logs.push(`[Browser] Session created: ${session.id}`);
        // Extract URL
        const urlMatch = instruction.match(/(https?:\/\/[^\s]+)/);
        const url = urlMatch ? urlMatch[1] : "https://www.bilibili.com";
        logs.push(`[Browser] Navigating to: ${url}`);
        const navResult = await Browser.navigate(session.id, url || "");
        if (!navResult.success) {
            Browser.destroyBrowserSession(session.id);
            return navResult;
        }
        // Wait and get info
        await new Promise(r => setTimeout(r, 3000));
        const info = await Browser.getPageInfo(session.id);
        logs.push(`[Browser] Page: ${info?.title || "unknown"}`);
        Browser.destroyBrowserSession(session.id);
        return {
            success: true,
            output: `Navigated to ${info?.url || url}, title: ${info?.title || "unknown"}`,
            durationMs: navResult.durationMs + 3000,
        };
    }
    catch (e) {
        logs.push(`[Browser] Error: ${e.message}`);
        return { success: false, error: e.message, durationMs: 0 };
    }
}
async function executeGUI(instruction, logs) {
    logs.push("[GUI] Starting execution...");
    const start = nowMs();
    try {
        // Take screenshot via native module
        const path = await import("node:path");
        const ssPath = path.join(process.cwd(), ".state", `task-${generateId()}.png`);
        logs.push("[GUI] Capturing screen...");
        const nativeMod = Native.loadNativeModule();
        if (!nativeMod) {
            return { success: false, error: "Native module unavailable", durationMs: 0 };
        }
        nativeMod.captureScreen(ssPath);
        // Get UI elements
        logs.push("[GUI] Getting UI elements...");
        const elements = nativeMod.getUiElements(null);
        logs.push(`[GUI] Found ${elements.length} UI elements`);
        return {
            success: true,
            output: `Screenshot saved to ${ssPath}, ${elements.length} UI elements detected`,
            durationMs: nowMs() - start,
        };
    }
    catch (e) {
        logs.push(`[GUI] Error: ${e.message}`);
        return { success: false, error: e.message, durationMs: nowMs() - start };
    }
}
async function executeHybrid(instruction, logs) {
    logs.push("[Hybrid] Trying terminal first...");
    // Try terminal first
    const termResult = await executeTerminal(instruction, logs);
    if (termResult.success) {
        logs.push("[Hybrid] Terminal succeeded");
        return termResult;
    }
    logs.push(`[Hybrid] Terminal failed: ${termResult.error}, trying GUI...`);
    // Fall back to GUI
    return await executeGUI(instruction, logs);
}
// ─── Main Execution ────────────────────────────────────────────────────
export async function executeWithStrategy(instruction, strategy) {
    const start = nowMs();
    const logs = [];
    const actualStrategy = strategy ?? routeTaskInternal(instruction);
    log.info(`[Unified] Strategy: ${actualStrategy.mode} (${actualStrategy.reason})`);
    logs.push(`Strategy: ${actualStrategy.mode} (${Math.round(actualStrategy.confidence * 100)}% confidence)`);
    let result;
    let finalMode = actualStrategy.mode;
    try {
        switch (actualStrategy.mode) {
            case "terminal":
                result = await executeTerminal(instruction, logs);
                if (!result.success && actualStrategy.fallback) {
                    logs.push(`Falling back to ${actualStrategy.fallback}`);
                    finalMode = actualStrategy.fallback;
                    result = await executeGUI(instruction, logs);
                }
                break;
            case "browser":
                result = await executeBrowser(instruction, logs);
                if (!result.success && actualStrategy.fallback) {
                    logs.push(`Falling back to ${actualStrategy.fallback}`);
                    finalMode = actualStrategy.fallback;
                    result = await executeGUI(instruction, logs);
                }
                break;
            case "gui":
                result = await executeGUI(instruction, logs);
                break;
            case "hybrid":
            default:
                result = await executeHybrid(instruction, logs);
                finalMode = result.success ? "hybrid" : "gui";
                break;
        }
    }
    catch (e) {
        log.error(`[Unified] Execution failed: ${e.message}`);
        result = { success: false, error: e.message, durationMs: nowMs() - start };
    }
    const duration = nowMs() - start;
    return {
        ...result,
        mode: result.success ? finalMode : (actualStrategy.fallback ?? finalMode),
        strategy: actualStrategy,
        durationMs: duration,
        logs,
    };
}
// ─── API Integration ───────────────────────────────────────────────────
export async function handleExecutionRequest(instruction, options) {
    const strategy = options?.mode
        ? { mode: options.mode, confidence: 1, reason: "User specified mode" }
        : routeTaskInternal(instruction);
    return await executeWithStrategy(instruction, strategy);
}
export { Terminal, Browser };
