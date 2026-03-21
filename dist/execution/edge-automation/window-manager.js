/**
 * Edge Window Manager
 * 管理 Edge 浏览器窗口生命周期，确保正确关闭
 */
import { exec, spawn } from "node:child_process";
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("execution/edge/window-manager");

// Track opened Edge windows
const openedProcesses = new Set();

/**
 * Find existing Edge processes opened by OpenOxygen
 */
export function findOpenOxygenEdgeProcesses() {
    try {
        const { execSync } = require("node:child_process");
        // Find Edge processes with remote-debugging-port
        const result = execSync(
            `powershell -Command "Get-Process | Where-Object { $_.ProcessName -eq 'msedge' -and $_.CommandLine -like '*remote-debugging-port*' } | Select-Object Id, StartTime | ConvertTo-Json"`,
            { encoding: "utf-8" }
        );
        const processes = JSON.parse(result);
        if (Array.isArray(processes)) {
            return processes;
        }
        return processes ? [processes] : [];
    } catch (error) {
        log.debug(`Failed to find Edge processes: ${error.message}`);
        return [];
    }
}

/**
 * Close all Edge windows opened by OpenOxygen
 */
export async function closeAllOpenOxygenEdgeWindows() {
    log.info("Closing all Edge windows opened by OpenOxygen");
    
    const processes = findOpenOxygenEdgeProcesses();
    let closedCount = 0;
    
    for (const proc of processes) {
        try {
            process.kill(proc.Id, 'SIGTERM');
            log.info(`Closed Edge process: ${proc.Id}`);
            closedCount++;
        } catch (error) {
            log.warn(`Failed to close Edge process ${proc.Id}: ${error.message}`);
        }
    }
    
    // Also close any tracked processes
    for (const pid of openedProcesses) {
        try {
            process.kill(pid, 'SIGTERM');
            openedProcesses.delete(pid);
            closedCount++;
        } catch (error) {
            // Process may already be closed
        }
    }
    
    log.info(`Closed ${closedCount} Edge windows`);
    return { success: true, closedCount };
}

/**
 * Register an opened Edge process
 */
export function registerEdgeProcess(pid) {
    openedProcesses.add(pid);
    log.debug(`Registered Edge process: ${pid}`);
}

/**
 * Unregister a closed Edge process
 */
export function unregisterEdgeProcess(pid) {
    openedProcesses.delete(pid);
    log.debug(`Unregistered Edge process: ${pid}`);
}

/**
 * Get count of opened Edge windows
 */
export function getOpenedEdgeCount() {
    return openedProcesses.size;
}

// Cleanup on exit
process.on('exit', () => {
    closeAllOpenOxygenEdgeWindows();
});

process.on('SIGINT', () => {
    closeAllOpenOxygenEdgeWindows();
    process.exit(0);
});

export { openedProcesses };
