/**
 * OpenOxygen �� Main Entry Point
 *
 * CLI ��ڣ����������в��������� Gateway ��������
 *
 * �ܹ����ԣ�
 * OpenOxygen ���� OpenClaw �����Ʒ��������һ�� Agent ��ܡ�
 * ���Ǽ̳� OpenClaw �Ľӿ�Э����Ϊ���ݲ㣬��������ά��ȫ�泬Խ��
 * - ���ܣ�Rust ԭ������ + SIMD ���٣�10-100x �ٶ�����
 * - ��ȫ�����������֪ CVE ���������� + �����μܹ�
 * - ���ܣ���ģ���ں����� + �Ӿ���������
 * - ��ģ���ֲ�ʽ���� + TB �������洢
 * - ��̬��WASM ��� + ǩ����֤�г�
 *
 * ���� OpenClaw ��Ϊ��Ǩ�ƣ���Խ OpenClaw ��Ϊ��δ����
 */
import process from "node:process";
import { enableConsoleCapture, initLogLevelFromEnv } from "./logging/index.js";
import { assertSupportedRuntime, defaultRuntime, installGlobalErrorHandlers, } from "./core/runtime/index.js";
import { loadConfig, loadDotEnv } from "./core/config/index.js";
import { createGatewayServer } from "./core/gateway/index.js";
import { RealtimeChannel } from "./core/ws/index.js";
import { InferenceEngine } from "./inference/engine/index.js";
import { ModelRouter } from "./inference/router/index.js";
import { TaskPlanner } from "./inference/planner/index.js";
import { ReflectionEngine } from "./inference/reflection/index.js";
import { OxygenUltraVision } from "./execution/vision/index.js";
import { MemoryManager } from "./memory/lifecycle/index.js";
import { AuditTrail } from "./security/audit/index.js";
import { PluginRegistry, loadPlugins } from "./plugins/loader/index.js";
import { translateOpenClawConfig } from "./compat/openclaw/index.js";
import { createSubsystemLogger } from "./logging/index.js";
const log = createSubsystemLogger("main");
// ������ Banner ����������������������������������������������������������������������������������������������������������������������������������
function printBanner() {
    defaultRuntime.log("");
    defaultRuntime.log("  �X�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�[");
    defaultRuntime.log("  �U           O P E N  O X Y G E N  v26w11aE            �U");
    defaultRuntime.log("  �U   The Next-Generation Windows-Native AI Agent      �U");
    defaultRuntime.log("  �U   Beyond OpenClaw �� Fused Inference �� Secure       �U");
    defaultRuntime.log("  �^�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�a");
    defaultRuntime.log("");
    defaultRuntime.log("  [Architecture] Rust Core + TypeScript �� SIMD + NAPI-RS");
    defaultRuntime.log("  [Security]   Zero-Trust �� CVE Hardened �� Audit Trail");
    defaultRuntime.log("  [AI Stack]   Multi-Model Fusion �� Vision-Language");
    defaultRuntime.log("  [Scale]      Distributed �� TB-Scale Vector DB");
    defaultRuntime.log("");
}
// ������ Bootstrap ����������������������������������������������������������������������������������������������������������������������������
async function bootstrap() {
    // 1. Environment setup
    process.title = "openoxygen";
    await loadDotEnv({ quiet: false });
    initLogLevelFromEnv();
    enableConsoleCapture();
    assertSupportedRuntime();
    installGlobalErrorHandlers(defaultRuntime);
    printBanner();
    // 2. Load configuration
    let config = await loadConfig();
    // 3. OpenClaw compatibility: merge openclaw.json if enabled
    if (config.compat?.openclaw?.enabled && config.compat.openclaw.configPath) {
        log.info("OpenClaw compatibility mode enabled");
        const clawOverrides = await translateOpenClawConfig(config.compat.openclaw.configPath);
        config = deepMergeConfig(config, clawOverrides);
    }
    // 4. Initialize core subsystems
    const audit = new AuditTrail(config.security);
    await audit.loadFromFile();
    const pluginRegistry = new PluginRegistry();
    await loadPlugins(config, pluginRegistry);
    const inferenceEngine = new InferenceEngine(config);
    const modelRouter = new ModelRouter(config.models);
    const planner = new TaskPlanner(inferenceEngine);
    const reflection = new ReflectionEngine(inferenceEngine);
    const memory = new MemoryManager(config.memory);
    if (config.memory.extraPaths && config.memory.extraPaths.length > 0) {
        await memory.sync({ paths: config.memory.extraPaths });
    }
    const vision = new OxygenUltraVision(config.vision);
    // 5. Event handler
    const handleEvent = async (event) => {
        log.debug(`Event: ${event.type}`);
        await audit.record({
            operation: event.type,
            actor: "system",
            severity: event.type === "security.violation" ? "critical" : "info",
        });
    };
    // 6. Start Gateway
    const gateway = createGatewayServer({
        config,
        inferenceEngine,
        onEvent: handleEvent,
    });
    await gateway.start();
    // 6b. WebSocket realtime channel
    const wsChannel = new RealtimeChannel(inferenceEngine);
    if (gateway.httpServer) {
        wsChannel.attach(gateway.httpServer);
        log.info("WebSocket attached at /ws");
    }
    // 7. Start vision monitoring if enabled
    if (config.vision.enabled) {
        vision.startMonitoring();
    }
    log.info("OpenOxygen is ready");
    log.info(`Gateway: http://${config.gateway.host}:${config.gateway.port}`);
    log.info(`Agents: ${config.agents.list.length} configured`);
    log.info(`Plugins: ${pluginRegistry.getActive().length} active`);
    log.info(`Models: ${inferenceEngine.getAvailableProviders().join(", ") || "none configured"}`);
    log.info(`Memory: ${memory.status().chunks} chunks indexed`);
    // Keep process alive
    await new Promise(() => {
        // Gateway server keeps the event loop alive
    });
}
// ������ CLI Argument Parsing ������������������������������������������������������������������������������������������������������
function parseArgs() {
    const argv = process.argv.slice(2);
    if (argv.length === 0 || argv[0] === "start") {
        return { command: "start", args: {} };
    }
    if (argv[0] === "--version" || argv[0] === "-v") {
        return { command: "version", args: {} };
    }
    if (argv[0] === "--help" || argv[0] === "-h") {
        return { command: "help", args: {} };
    }
    return { command: argv[0] ?? "start", args: {} };
}
// ������ Main ��������������������������������������������������������������������������������������������������������������������������������������
const { command } = parseArgs();
switch (command) {
    case "version":
        defaultRuntime.log("openoxygen v0.1.0");
        process.exit(0);
        break;
    case "help":
        defaultRuntime.log("Usage: openoxygen [command]");
        defaultRuntime.log("");
        defaultRuntime.log("Commands:");
        defaultRuntime.log("  start     Start the OpenOxygen gateway (default)");
        defaultRuntime.log("  version   Show version");
        defaultRuntime.log("  help      Show this help");
        defaultRuntime.log("");
        defaultRuntime.log("Environment:");
        defaultRuntime.log("  OPENOXYGEN_CONFIG_PATH    Path to config file");
        defaultRuntime.log("  OPENOXYGEN_STATE_DIR      State directory path");
        defaultRuntime.log("  OPENOXYGEN_GATEWAY_PORT   Gateway port");
        defaultRuntime.log("  OPENOXYGEN_GATEWAY_TOKEN  Auth token");
        defaultRuntime.log("  OPENOXYGEN_LOG_LEVEL      Log level (debug/info/warn/error)");
        process.exit(0);
        break;
    case "start":
    default:
        bootstrap().catch((err) => {
            defaultRuntime.error("Fatal error during bootstrap:", err);
            defaultRuntime.exit(1);
        });
        break;
}
// ������ Helpers ��������������������������������������������������������������������������������������������������������������������������������
function deepMergeConfig(base, overrides) {
    return {
        ...base,
        ...overrides,
        gateway: { ...base.gateway, ...overrides.gateway },
        security: { ...base.security, ...overrides.security },
        memory: { ...base.memory, ...overrides.memory },
        vision: { ...base.vision, ...overrides.vision },
        agents: {
            default: overrides.agents?.default ?? base.agents.default,
            list: [...base.agents.list, ...(overrides.agents?.list ?? [])],
        },
        models: [...base.models, ...(overrides.models ?? [])],
        channels: [...base.channels, ...(overrides.channels ?? [])],
        plugins: [...base.plugins, ...(overrides.plugins ?? [])],
    };
}
