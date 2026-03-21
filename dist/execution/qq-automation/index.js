/**
 * OpenOxygen — QQ Automation (P2 Implementation)
 *
 * 实现方案：
 *   方案A: UIA 模拟键鼠操作 (主要方案，稳定可靠)
 *   方案B: QQ NT 协议 (研究中，可能更快)
 *
 * 功能：
 *   - QQ 窗口检测与激活
 *   - 消息发送 (模拟键鼠)
 *   - 消息提醒检查
 *   - 与 OUV 视觉感知集成
 */
import { exec } from "node:child_process";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs, sleep } from "../../utils/index.js";
import { OxygenUltraVision } from "../vision/index.js";
const log = createSubsystemLogger("execution/qq");

// ─── QQ Process Detection ───────────────────────────────────────────────────
const QQ_PROCESS_NAMES = ["QQ", "QQNT", "Tencent.QQ"];

export async function findQQWindow() {
    try {
        const { execSync } = require("node:child_process");
        const result = execSync(
            `powershell -Command "Get-Process | Where-Object { $_.ProcessName -like '*QQ*' } | Select-Object ProcessName, Id, MainWindowTitle | ConvertTo-Json"`,
            { encoding: "utf-8" }
        );
        const processes = JSON.parse(result);
        if (Array.isArray(processes)) {
            return processes.find(p => p.MainWindowTitle && p.MainWindowTitle.length > 0);
        }
        return processes;
    } catch (error) {
        log.debug(`QQ process detection failed: ${error.message}`);
        return null;
    }
}

export async function isQQRunning() {
    const window = await findQQWindow();
    return window !== null;
}

// ─── QQ Window Control via UIA ──────────────────────────────────────────────
export class QQWindowController {
    ouv;
    windowHandle;
    
    constructor(ouv) {
        this.ouv = ouv || new OxygenUltraVision();
    }
    
    /**
     * 激活 QQ 窗口
     */
    async activate() {
        log.info("Activating QQ window");
        
        const qq = await findQQWindow();
        if (!qq) {
            throw new Error("QQ is not running");
        }
        
        // Use PowerShell to activate window
        const script = `
            Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class Win32 {
                [DllImport("user32.dll")]
                public static extern bool SetForegroundWindow(IntPtr hWnd);
                [DllImport("user32.dll")]
                public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            }
"@
            $process = Get-Process -Id ${qq.Id}
            if ($process.MainWindowHandle -ne 0) {
                [Win32]::ShowWindow($process.MainWindowHandle, 9) # SW_RESTORE
                [Win32]::SetForegroundWindow($process.MainWindowHandle)
            }
        `;
        
        try {
            const { execSync } = require("node:child_process");
            execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
            await sleep(500);
            return { success: true };
        } catch (error) {
            log.error(`Failed to activate QQ: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 发送消息到指定联系人
     * @param {string} contact - 联系人名称
     * @param {string} message - 消息内容
     */
    async sendMessage(contact, message) {
        log.info(`Sending QQ message to ${contact}: ${message.substring(0, 50)}...`);
        
        // Activate QQ
        const activated = await this.activate();
        if (!activated.success) {
            return activated;
        }
        
        try {
            // Use OUV to find search box
            const analysis = await this.ouv.analyzeScreen({
                instruction: `Find search box to search for contact "${contact}"`,
            });
            
            // Simulate click on search box (coordinates from OUV)
            if (analysis.clickableElements && analysis.clickableElements.length > 0) {
                const searchBox = analysis.clickableElements.find(
                    el => el.type === "search" || el.name?.includes("搜索")
                );
                
                if (searchBox) {
                    await this.click(searchBox.x, searchBox.y);
                    await sleep(200);
                    await this.typeText(contact);
                    await sleep(500);
                    await this.pressKey("Enter");
                    await sleep(1000);
                    
                    // Type message
                    await this.typeText(message);
                    await sleep(200);
                    await this.pressKey("Enter");
                    
                    return { success: true, contact, message };
                }
            }
            
            return { success: false, error: "Could not find search box" };
        } catch (error) {
            log.error(`Failed to send QQ message: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 检查未读消息
     */
    async checkUnread() {
        log.info("Checking QQ unread messages");
        
        const activated = await this.activate();
        if (!activated.success) {
            return activated;
        }
        
        try {
            const analysis = await this.ouv.analyzeScreen({
                instruction: "Find unread message indicators and count",
            });
            
            // Parse analysis for unread indicators
            const unreadCount = this.parseUnreadCount(analysis);
            
            return {
                success: true,
                unreadCount,
                hasUnread: unreadCount > 0,
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    parseUnreadCount(analysis) {
        let count = 0;
        if (analysis.elements) {
            for (const el of analysis.elements) {
                // Look for red badges or numbers
                if (el.metadata?.badge || el.name?.match(/\d+/)) {
                    const num = parseInt(el.name);
                    if (!isNaN(num)) count += num;
                }
            }
        }
        return count;
    }
    
    // ─── Native Input Simulation ──────────────────────────────────────────────
    async click(x, y) {
        log.debug(`Clicking at (${x}, ${y})`);
        const script = `
            Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class Mouse {
                [DllImport("user32.dll")]
                public static extern bool SetCursorPos(int x, int y);
                [DllImport("user32.dll")]
                public static extern void mouse_event(int flags, int dx, int dy, int buttons, int extra);
                public const int MOUSEEVENTF_LEFTDOWN = 0x02;
                public const int MOUSEEVENTF_LEFTUP = 0x04;
            }
"@
            [Mouse]::SetCursorPos(${x}, ${y})
            [Mouse]::mouse_event(0x02, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 50
            [Mouse]::mouse_event(0x04, 0, 0, 0, 0)
        `;
        
        const { execSync } = require("node:child_process");
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    }
    
    async typeText(text) {
        log.debug(`Typing: ${text.substring(0, 30)}...`);
        const script = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait("${text.replace(/"/g, '""')}")
        `;
        
        const { execSync } = require("node:child_process");
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    }
    
    async pressKey(key) {
        log.debug(`Pressing key: ${key}`);
        const keyMap = {
            Enter: "{ENTER}",
            Tab: "{TAB}",
            Escape: "{ESC}",
            Space: " ",
        };
        
        const keyStr = keyMap[key] || key;
        const script = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait("${keyStr}")
        `;
        
        const { execSync } = require("node:child_process");
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    }
}

// ─── QQ Protocol Research (方案B) ───────────────────────────────────────────
/**
 * QQ NT 协议研究
 * 参考: https://github.com/NapNeko/NapCatQQ
 * 状态: 研究中，可能提供更快的消息发送
 */
export class QQProtocolClient {
    wsUrl;
    connected = false;
    
    constructor(wsUrl = "ws://127.0.0.1:3001") {
        this.wsUrl = wsUrl;
    }
    
    async connect() {
        log.info(`Connecting to QQ protocol: ${this.wsUrl}`);
        // Implementation pending protocol research
        return { success: false, error: "Protocol not implemented yet" };
    }
    
    async sendMessage(contact, message) {
        // Implementation pending
        return { success: false, error: "Protocol not implemented yet" };
    }
}

// ─── Export Main Functions ──────────────────────────────────────────────────
export { QQWindowController, QQProtocolClient, findQQWindow, isQQRunning };
