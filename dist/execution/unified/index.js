/**
<<<<<<< HEAD
 * OpenOxygen �?Unified Task Executor (完整版v2)
=======
 * OpenOxygen - Unified Task Executor
>>>>>>> dev
 *
 * 自动选择 Terminal/GUI/Browser/Hybrid 执行模式
 * 已集成真�?Terminal/Browser 模块
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { nowMs } from "../../utils/index.js";
import * as Terminal from "../terminal/index.js";
import * as Browser from "../browser/index.js";
const log = createSubsystemLogger("execution/unified");
// === Keyword-Based Router ===
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
<<<<<<< HEAD
        /(微信|qq|steam|vscode|计算器|记事�?/i,
        /(按钮|button|菜单|menu|对话框|dialog)/i,
        /(输入|type|填写|fill|粘贴|paste)/i,
        /(颜色|color|位置|position|大小|size)/i,
        /(验证码|captcha|人机验证)/i,
=======
        /(微信|qq|slack|teams|discord)/i,
        /(桌面|desktop|窗口|window|应用|app)/i,
        /(打开|open|启动|launch|运行|run)\s+(软件|程序|应用)/i,
>>>>>>> dev
    ],
};
/**
 * Analyze task and determine best execution mode
 */
export function analyzeTask(instruction) {
    const lowerInstruction = instruction.toLowerCase();
    let terminalScore = 0;
    let browserScore = 0;
    let guiScore = 0;
    // Score each pattern
    for (const pattern of PATTERNS.terminal) {
        if (pattern.test(lowerInstruction))
            terminalScore += 2;
    }
    for (const pattern of PATTERNS.browser) {
        if (pattern.test(lowerInstruction))
            browserScore += 2;
    }
<<<<<<< HEAD
    const total = scores.terminal + scores.browser + scores.gui;
    if (total === 0) {
        return {
            mode: "hybrid",
            confidence: 0.5,
            reason: "No clear pattern, try hybrid",
        };
=======
    for (const pattern of PATTERNS.gui) {
        if (pattern.test(lowerInstruction))
            guiScore += 2;
>>>>>>> dev
    }
    // Determine mode
    const scores = [
        { mode: "terminal", score: terminalScore },
        { mode: "browser", score: browserScore },
        { mode: "gui", score: guiScore },
    ];
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];
    // Calculate confidence
    const totalScore = terminalScore + browserScore + guiScore;
    const confidence = totalScore > 0 ? best.score / totalScore : 0.33;
    // Determine fallback
    const fallback = scores[1]?.score > 0 ? scores[1].mode : undefined;
    return {
        mode: best.mode,
        confidence,
        reason: `Matched ${best.mode} patterns (score: ${best.score})`,
        fallback,
    };
}
<<<<<<< HEAD
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
        await new Promise((r) => setTimeout(r, 3000));
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
            return {
                success: false,
                error: "Native module unavailable",
                durationMs: 0,
            };
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
=======
/**
 * Execute task with automatic mode selection
 */
export async function executeWithStrategy(instruction, options = {}) {
    const startTime = nowMs();
>>>>>>> dev
    const logs = [];
    // Determine strategy
    const strategy = options.mode
        ? { mode: options.mode, confidence: 1, reason: "User specified" }
        : analyzeTask(instruction);
    log.info(`Executing with mode: ${strategy.mode} (${strategy.confidence.toFixed(2)})`);
    logs.push(`Strategy: ${strategy.mode} (${strategy.reason})`);
    try {
        let result;
        switch (strategy.mode) {
            case "terminal":
                result = await executeTerminal(instruction, options);
                break;
            case "browser":
                result = await executeBrowser(instruction, options);
                break;
            case "gui":
                result = await executeGUI(instruction, options);
                break;
            case "hybrid":
                result = await executeHybrid(instruction, options);
                break;
            default:
                throw new Error(`Unknown execution mode: ${strategy.mode}`);
        }
        return {
            ...result,
            mode: strategy.mode,
            strategy,
            durationMs: nowMs() - startTime,
            logs,
        };
    }
    catch (error) {
        // Try fallback if available
        if (strategy.fallback) {
            log.warn(`Primary mode failed, trying fallback: ${strategy.fallback}`);
            logs.push(`Fallback to: ${strategy.fallback}`);
            return executeWithStrategy(instruction, {
                ...options,
                mode: strategy.fallback,
            });
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            mode: strategy.mode,
            strategy,
            durationMs: nowMs() - startTime,
            logs,
        };
    }
}
/**
 * Execute terminal command
 */
async function executeTerminal(instruction, options) {
    log.info("Executing via terminal");
    // Extract command from instruction
    const command = extractCommand(instruction);
    if (!command) {
        return {
            success: false,
            error: "No command found in instruction",
        };
    }
    // Validate command safety
    const validation = validateCommand(command);
    if (!validation.safe) {
        return {
            success: false,
            error: `Command blocked: ${validation.reason}`,
        };
    }
    // Execute via terminal module
    const session = await Terminal.createSession();
    try {
        const result = await Terminal.executeCommand(session.id, command, {
            timeout: options.timeout || 30000,
        });
        return {
            success: result.exitCode === 0,
            data: {
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
            },
            error: result.exitCode !== 0 ? result.stderr : undefined,
        };
    }
    finally {
        await Terminal.closeSession(session.id);
    }
}
/**
 * Execute browser automation
 */
async function executeBrowser(instruction, options) {
    log.info("Executing via browser");
    // Extract URL from instruction
    const url = extractUrl(instruction);
    if (!url) {
        return {
            success: false,
            error: "No URL found in instruction",
        };
    }
    // Launch browser and navigate
    const browser = await Browser.launchBrowser({
        headless: false,
    });
    try {
        const navigateResult = await Browser.navigate(browser.data.browserId, url);
        return {
            success: navigateResult.success,
            data: {
                browserId: browser.data.browserId,
                url,
            },
            error: navigateResult.error,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Execute GUI automation
 */
async function executeGUI(instruction, options) {
    log.info("Executing via GUI");
    // TODO: Implement GUI automation via UIA
    return {
        success: false,
        error: "GUI automation not yet implemented",
    };
}
/**
 * Execute hybrid mode
 */
async function executeHybrid(instruction, options) {
    log.info("Executing via hybrid mode");
    // Try terminal first, then browser, then GUI
    const modes = ["terminal", "browser", "gui"];
    for (const mode of modes) {
        const result = await executeWithStrategy(instruction, {
            ...options,
            mode,
        });
        if (result.success) {
            return result;
        }
    }
    return {
        success: false,
        error: "All execution modes failed",
    };
}
/**
 * Extract command from natural language instruction
 */
function extractCommand(instruction) {
    // Look for code blocks
    const codeBlock = instruction.match(/```(?:bash|sh|powershell|cmd)?\s*\n?([^`]+)```/);
    if (codeBlock) {
        return codeBlock[1].trim();
    }
    // Look for inline code
    const inlineCode = instruction.match(/`([^`]+)`/);
    if (inlineCode) {
        return inlineCode[1].trim();
    }
    // Try to extract command-like patterns
    const commandPattern = instruction.match(/(?:run|execute|type)\s+["']?([^"'\n]+)["']?/i);
    if (commandPattern) {
        return commandPattern[1].trim();
    }
    return null;
}
/**
 * Extract URL from instruction
 */
function extractUrl(instruction) {
    const urlPattern = /(https?:\/\/[^\s]+)/i;
    const match = instruction.match(urlPattern);
    return match?.[1] || null;
}
/**
 * Validate command safety
 */
function validateCommand(command) {
    const dangerousPatterns = [
        { pattern: /rm\s+-rf\s+\//, reason: "Dangerous deletion pattern" },
        { pattern: /format\s+/i, reason: "Disk format command" },
        { pattern: /shutdown\s+/i, reason: "System shutdown" },
        { pattern: /restart\s+/i, reason: "System restart" },
        { pattern: />\s*\/dev\/null.*rm/, reason: "Obfuscated deletion" },
    ];
    for (const { pattern, reason } of dangerousPatterns) {
        if (pattern.test(command)) {
            return { safe: false, reason };
        }
    }
    return { safe: true };
}
export default executeWithStrategy;
