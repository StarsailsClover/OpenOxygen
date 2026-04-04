/**
 * OpenOxygen - OxygenUltraVision v2
 *
 * 三层视觉感知架构：
 * 1. UI Automation (精确层) - Windows UIA，标准控件 100% 准确
 * 2. 图像处理 (快速层) - 边缘检测/连通域/模板匹配
 * 3. 视觉大模型 (理解层) - 通过推理引擎调用 LLM，语义级屏幕理解
 *
 * 三层结果融合为统一的 ScreenAnalysis，供 Agent 决策使用。
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("ouv");
// === Configuration ===
let config = {
    enabled: true,
    primaryModel: "qwen3-vl:4b",
    uiaFallback: true,
};
let inferenceEngine = null;
export function initializeVision(visionConfig, engine) {
    config = { ...config, ...visionConfig };
    inferenceEngine = engine || null;
    log.info("OxygenUltraVision initialized");
}
<<<<<<< HEAD
// ─── UIA Type Mapping ───────────────────────────────────────────────────────
function mapUiaControlType(controlType) {
    const mapping = {
        Button: "button",
        SplitButton: "button",
        Edit: "input",
        ComboBox: "input",
        Text: "text",
        Document: "text",
        Image: "image",
        Hyperlink: "link",
        Menu: "menu",
        MenuItem: "menu",
        Window: "window",
        ToolBar: "toolbar",
        Tab: "tab",
        TabItem: "tab",
        CheckBox: "checkbox",
        RadioButton: "checkbox",
        List: "list",
        ListItem: "list",
        DataGrid: "list",
        Pane: "panel",
        Group: "panel",
=======
// === Layer 1: UI Automation (Precise Layer) ===
async function analyzeWithUIA() {
    log.debug("Analyzing with UIA layer");
    try {
        const { getForegroundWindow, findElements } = await import("../uia/detector.js");
        // Get foreground window
        const windowResult = await getForegroundWindow();
        if (!windowResult.success) {
            log.warn("Failed to get foreground window");
            return [];
        }
        // Find all elements in the window
        const elementsResult = await findElements({ type: "controlType", value: "Button", scope: "descendants" }, windowResult.data.handle);
        if (!elementsResult.success) {
            return [];
        }
        const uiaElements = elementsResult.data.elements;
        return uiaElements.map((el, index) => ({
            id: `uia-${index}`,
            type: mapControlType(el.controlType),
            label: el.name,
            bounds: el.bounds,
            confidence: 0.95,
            interactable: el.isEnabled && !el.isOffscreen,
            source: "uia",
            attributes: {
                automationId: el.automationId,
                className: el.className,
                hasKeyboardFocus: String(el.hasKeyboardFocus),
            },
        }));
    }
    catch (error) {
        log.error(`UIA analysis failed: ${error}`);
        return [];
    }
}
function mapControlType(controlType) {
    const typeMap = {
        "ControlType.Button": "button",
        "ControlType.Edit": "input",
        "ControlType.Text": "text",
        "ControlType.Image": "image",
        "ControlType.Hyperlink": "link",
        "ControlType.Menu": "menu",
        "ControlType.Window": "window",
        "ControlType.ToolBar": "toolbar",
        "ControlType.Pane": "panel",
        "ControlType.CheckBox": "checkbox",
        "ControlType.List": "list",
        "ControlType.Tab": "tab",
>>>>>>> dev
    };
    return typeMap[controlType] || "unknown";
}
// === Layer 2: Image Processing (Fast Layer) ===
async function analyzeWithVision(screenshotPath) {
    log.debug("Analyzing with Vision layer (image processing)");
    // This would use native image processing (Rust)
    // For now, return empty - will be implemented with native module
    return [];
}
// === Layer 3: LLM Vision (Understanding Layer) ===
async function analyzeWithLLM(screenshotPath, instruction) {
    log.debug("Analyzing with LLM layer");
    if (!inferenceEngine) {
        log.warn("No inference engine available for LLM vision");
        return { elements: [], description: "" };
    }
    try {
        // Read screenshot as base64
        const screenshotData = await fs.readFile(screenshotPath);
        const base64Image = screenshotData.toString("base64");
        // Build prompt
        const prompt = instruction
            ? `Analyze this screenshot and help me: ${instruction}`
            : "Analyze this screenshot and identify all interactive UI elements.";
        // Call vision model
        const response = await inferenceEngine.infer({
            messages: [
                {
                    role: "user",
                    content: `${prompt}\n\nDescribe what you see and identify any buttons, input fields, menus, or other interactive elements with their approximate positions.`,
                },
            ],
            mode: "balanced",
        });
        // Parse response to extract elements
        // This is a simplified version - real implementation would use structured output
        const elements = [];
        const description = response.content;
        return { elements, description };
    }
    catch (error) {
        log.error(`LLM analysis failed: ${error}`);
        return { elements: [], description: "" };
    }
}
// === Fusion & Analysis ===
export async function analyzeScreen(options = {}) {
    const startTime = nowMs();
    const mode = options.mode || "precise";
    log.info(`Starting screen analysis: mode=${mode}`);
    try {
        // Ensure screenshot exists
        let screenshotPath = options.screenshotPath;
        if (!screenshotPath) {
            screenshotPath = await captureScreenshot();
        }
<<<<<<< HEAD
        log.debug(`UIA: ${uiaElements.length} elements in ${nowMs() - uiaStart}ms`);
        // ── Layer 2: Image Processing (precise/full) ────────────────
        if (mode === "precise" || mode === "full") {
            const screenshotPath = query.screenshotPath ?? (await this.captureScreen());
            analysis.screenshotPath = screenshotPath;
            const visionStart = nowMs();
            const visionElements = await this.runImageProcessing(screenshotPath);
            analysis.layers.vision = visionElements.length;
            // 去重：如果 UIA 已经检测到同位置元素，跳过视觉检测结果
            for (const ve of visionElements) {
                const isDuplicate = analysis.elements.some((e) => Math.abs(e.bounds.x - ve.bounds.x) < 20 &&
                    Math.abs(e.bounds.y - ve.bounds.y) < 20 &&
                    Math.abs(e.bounds.width - ve.bounds.width) < 30);
                if (!isDuplicate) {
                    analysis.elements.push(ve);
                }
            }
            log.debug(`Vision: ${visionElements.length} regions in ${nowMs() - visionStart}ms`);
        }
        // ── Layer 3: LLM Understanding (full only) ──────────────────
        if (mode === "full" && this.inferenceEngine) {
            if (!analysis.screenshotPath) {
                analysis.screenshotPath =
                    query.screenshotPath ?? (await this.captureScreen());
            }
            const llmStart = nowMs();
            const llmDescription = await this.runLlmAnalysis(query.instruction, analysis.elements, analysis.activeWindow);
            analysis.description = llmDescription;
            analysis.layers.llm = 1;
            log.debug(`LLM: description generated in ${nowMs() - llmStart}ms`);
=======
        // Run layers based on mode
        const layerPromises = [];
        // Layer 1: UIA (always in precise/full mode)
        if (mode !== "fast") {
            layerPromises.push(analyzeWithUIA());
>>>>>>> dev
        }
        else {
            layerPromises.push(Promise.resolve([]));
        }
        // Layer 2: Vision (in full mode)
        if (mode === "full" && screenshotPath) {
            layerPromises.push(analyzeWithVision(screenshotPath));
        }
        else {
            layerPromises.push(Promise.resolve([]));
        }
        // Layer 3: LLM (in full mode or when instruction provided)
        let llmDescription = "";
        if ((mode === "full" || options.instruction) && screenshotPath) {
            const llmResult = await analyzeWithLLM(screenshotPath, options.instruction);
            layerPromises.push(Promise.resolve(llmResult.elements));
            llmDescription = llmResult.description;
        }
        else {
            layerPromises.push(Promise.resolve([]));
        }
<<<<<<< HEAD
        catch (err) {
            log.error("Image processing failed:", err);
            return [];
        }
    }
    // ─── Layer 3: LLM Analysis ────────────────────────────────────────────────
    async runLlmAnalysis(instruction, elements, activeWindow) {
        if (!this.inferenceEngine)
            return "";
        const elementSummary = elements
            .slice(0, 50)
            .map((e) => `[${e.type}] "${e.label}" @ (${e.bounds.x},${e.bounds.y},${e.bounds.width}x${e.bounds.height}) ${e.interactable ? "✓" : "✗"}`)
            .join("\n");
        const messages = [
            {
                role: "user",
                content: `You are analyzing a Windows desktop screen.

Active window: ${activeWindow ? `"${activeWindow.title}" (${activeWindow.className})` : "unknown"}

Detected UI elements (${elements.length} total, showing top 50):
${elementSummary}

User instruction: ${instruction}

Describe what you see and suggest the best action to fulfill the instruction. Be concise.`,
=======
        // Wait for all layers
        const [uiaElements, visionElements, llmElements] = await Promise.all(layerPromises);
        // Merge elements
        const mergedElements = mergeElements([
            ...uiaElements,
            ...visionElements,
            ...llmElements,
        ]);
        // Get active window info
        const { getForegroundWindow } = await import("../uia/detector.js");
        const windowResult = await getForegroundWindow();
        const analysis = {
            id: generateId("analysis"),
            timestamp: nowMs(),
            screenshotPath,
            elements: mergedElements,
            activeWindow: windowResult.success
                ? {
                    title: windowResult.data.title,
                    className: windowResult.data.className,
                    bounds: windowResult.data.bounds,
                }
                : undefined,
            description: llmDescription || generateDescription(mergedElements),
            durationMs: nowMs() - startTime,
            layers: {
                uia: uiaElements.length,
                vision: visionElements.length,
                llm: llmElements.length,
>>>>>>> dev
            },
        };
        log.info(`Screen analysis complete: ${mergedElements.length} elements in ${analysis.durationMs}ms`);
        return {
            success: true,
            analysis,
        };
    }
<<<<<<< HEAD
    // ─── Helpers ──────────────────────────────────────────────────────────────
    async captureScreen() {
        await ensureDir(SCREENSHOT_DIR);
        const filename = `ouv_${Date.now()}.png`;
        const outputPath = path.join(SCREENSHOT_DIR, filename);
        if (this.native) {
            const result = this.native.captureScreen(outputPath);
            if (!result.success)
                throw new Error(`Capture failed: ${result.error}`);
        }
        return outputPath;
    }
    findElement(elements, description) {
        const lower = description.toLowerCase();
        return (elements.find((e) => e.label.toLowerCase() === lower) ??
            elements.find((e) => e.label.toLowerCase().includes(lower)) ??
            elements.find((e) => e.type === lower));
    }
    suggestAction(instruction, target) {
        if (!target)
            return { type: "none", params: {} };
        const cx = target.bounds.x + target.bounds.width / 2;
        const cy = target.bounds.y + target.bounds.height / 2;
        const lower = instruction.toLowerCase();
        if (/click|点击|press|按/.test(lower)) {
            return { type: "click", params: { x: cx, y: cy } };
        }
        if (/type|输入|enter|填/.test(lower)) {
            return {
                type: "type",
                params: {
                    x: cx,
                    y: cy,
                    text: instruction.replace(/^(type|输入|enter|填写?)\s*/i, ""),
                },
            };
        }
        if (/scroll|滚动/.test(lower)) {
            return { type: "scroll", params: { direction: "down", amount: 3 } };
        }
        return { type: "click", params: { x: cx, y: cy } };
    }
    // ─── Monitoring ───────────────────────────────────────────────────────────
    startMonitoring(intervalMs) {
        if (this.captureInterval)
            return;
        const interval = intervalMs ?? this.config.captureIntervalMs ?? 5000;
        this.captureInterval = setInterval(async () => {
            try {
                await this.analyze({ instruction: "monitor", mode: "fast" });
            }
            catch { }
        }, interval);
        log.info(`OUV monitoring started (${interval}ms)`);
    }
    stopMonitoring() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
            log.info("OUV monitoring stopped");
        }
    }
    getLatestAnalysis() {
        return this.latestAnalysis;
=======
    catch (error) {
        log.error(`Screen analysis failed: ${error}`);
        return {
            success: false,
            error: `Screen analysis failed: ${error}`,
        };
>>>>>>> dev
    }
}
function mergeElements(elements) {
    // Deduplicate elements based on position overlap
    const merged = [];
    const threshold = 10; // Pixel threshold for considering same element
    for (const element of elements) {
        const duplicate = merged.find((e) => Math.abs(e.bounds.x - element.bounds.x) < threshold &&
            Math.abs(e.bounds.y - element.bounds.y) < threshold);
        if (duplicate) {
            // Merge - keep higher confidence
            if (element.confidence > duplicate.confidence) {
                Object.assign(duplicate, element);
            }
        }
        else {
            merged.push(element);
        }
    }
    return merged;
}
function generateDescription(elements) {
    const interactable = elements.filter((e) => e.interactable);
    const byType = interactable.reduce((acc, el) => {
        acc[el.type] = (acc[el.type] || 0) + 1;
        return acc;
    }, {});
    const parts = [];
    for (const [type, count] of Object.entries(byType)) {
        parts.push(`${count} ${type}${count > 1 ? "s" : ""}`);
    }
    return `Screen contains ${parts.join(", ") || "no interactive elements"}.`;
}
// === Screenshot ===
async function captureScreenshot() {
    const screenshotDir = "./.state/screenshots";
    const screenshotPath = path.join(screenshotDir, `screenshot-${nowMs()}.png`);
    // Ensure directory exists
    await fs.mkdir(screenshotDir, { recursive: true });
    // Use PowerShell to capture screenshot
    const script = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $bitmap.Save("${screenshotPath.replace(/\\/g, "\\\\")}")
    $graphics.Dispose()
    $bitmap.Dispose()
  `;
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    await execAsync(`powershell -Command "${script.replace(/"/g, '`"')}"`, {
        timeout: 10000,
    });
    return screenshotPath;
}
// === Element Query ===
export async function findElementOnScreen(query) {
    const analysisResult = await analyzeScreen({
        screenshotPath: query.screenshotPath,
        mode: query.mode,
        instruction: query.instruction,
    });
    if (!analysisResult.success || !analysisResult.analysis) {
        return analysisResult;
    }
    const { analysis } = analysisResult;
    // Find target element
    let targetElement;
    if (query.targetElement) {
        // Search by label/name
        const query_lower = query.targetElement.toLowerCase();
        targetElement = analysis.elements.find((e) => e.label.toLowerCase().includes(query_lower) ||
            query_lower.includes(e.label.toLowerCase()));
    }
    // Determine suggested action
    let suggestedAction;
    if (targetElement) {
        if (targetElement.type === "button" || targetElement.type === "link") {
            suggestedAction = { type: "click", target: targetElement };
        }
        else if (targetElement.type === "input") {
            suggestedAction = { type: "type", target: targetElement };
        }
    }
    return {
        success: true,
        analysis,
        targetElement,
        suggestedAction,
    };
}
// === Exports ===
export { captureScreenshot, };
export const OxygenUltraVision = {
    initialize: initializeVision,
    analyze: analyzeScreen,
    findElement: findElementOnScreen,
    captureScreenshot,
};
export default OxygenUltraVision;
