/**
 * OpenOxygen — Windows System Control Module
 *
 * 内核级 Windows 系统操作：文件系统、进程管理、注册表、剪贴板、
 * 键鼠输入、网络、服务管理等。
 * 通过 PowerShell + Win32 API (ffi-napi) 双路径实现。
 */

import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createSubsystemLogger } from "../../logging/index.js";
import type { SystemOperation, ToolResult } from "../../types/index.js";
import { assertWindows, nowMs, withTimeout } from "../../utils/index.js";

const log = createSubsystemLogger("execution/windows");

// ─── PowerShell Executor ────────────────────────────────────────────────────

function runPowerShell(command: string, timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const escaped = command.replace(/"/g, '\\"');
    const child = exec(
      `powershell.exe -NoProfile -NonInteractive -Command "${escaped}"`,
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`PowerShell error: ${stderr || error.message}`));
        } else {
          resolve(stdout.trim());
        }
      },
    );
  });
}

// ─── File System Operations ─────────────────────────────────────────────────

export async function fileRead(filePath: string): Promise<ToolResult> {
  const start = nowMs();
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { success: true, output: content, durationMs: nowMs() - start };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

export async function fileWrite(
  filePath: string,
  content: string,
): Promise<ToolResult> {
  const start = nowMs();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return {
      success: true,
      output: { path: filePath, bytes: Buffer.byteLength(content) },
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

export async function fileDelete(filePath: string): Promise<ToolResult> {
  const start = nowMs();
  try {
    await fs.unlink(filePath);
    return {
      success: true,
      output: { deleted: filePath },
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

export async function fileList(
  dirPath: string,
  recursive = false,
): Promise<ToolResult> {
  const start = nowMs();
  try {
    if (recursive) {
      const entries = await walkDir(dirPath);
      return { success: true, output: entries, durationMs: nowMs() - start };
    }
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "directory" : "file",
      path: path.join(dirPath, e.name),
    }));
    return { success: true, output: result, durationMs: nowMs() - start };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Process Management ─────────────────────────────────────────────────────

export async function processStart(
  command: string,
  args: string[] = [],
  cwd?: string,
): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("processStart");
    const fullCmd = [command, ...args].join(" ");
    const output = await runPowerShell(
      `Start-Process -FilePath '${command}' -ArgumentList '${args.join("','")}' ${cwd ? `-WorkingDirectory '${cwd}'` : ""} -PassThru | Select-Object Id, ProcessName | ConvertTo-Json`,
    );
    return {
      success: true,
      output: JSON.parse(output || "{}"),
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

export async function processKill(pid: number): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("processKill");
    await runPowerShell(`Stop-Process -Id ${pid} -Force`);
    return {
      success: true,
      output: { killed: pid },
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

export async function processList(filter?: string): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("processList");
    const cmd = filter
      ? `Get-Process -Name '${filter}' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, CPU, WorkingSet64 | ConvertTo-Json`
      : `Get-Process | Select-Object Id, ProcessName, CPU, WorkingSet64 | ConvertTo-Json`;
    const output = await runPowerShell(cmd);
    return {
      success: true,
      output: JSON.parse(output || "[]"),
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

// ─── Registry Operations ───────────────────────────────────────────────────

export async function registryRead(
  keyPath: string,
  valueName?: string,
): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("registryRead");
    const cmd = valueName
      ? `Get-ItemPropertyValue -Path '${keyPath}' -Name '${valueName}'`
      : `Get-ItemProperty -Path '${keyPath}' | ConvertTo-Json -Depth 3`;
    const output = await runPowerShell(cmd);
    return { success: true, output: output, durationMs: nowMs() - start };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

export async function registryWrite(
  keyPath: string,
  valueName: string,
  value: string,
  type = "String",
): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("registryWrite");
    await runPowerShell(
      `Set-ItemProperty -Path '${keyPath}' -Name '${valueName}' -Value '${value}' -Type ${type}`,
    );
    return {
      success: true,
      output: { keyPath, valueName, value },
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

// ─── Clipboard ──────────────────────────────────────────────────────────────

export async function clipboardRead(): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("clipboardRead");
    const output = await runPowerShell("Get-Clipboard");
    return { success: true, output, durationMs: nowMs() - start };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

export async function clipboardWrite(text: string): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("clipboardWrite");
    await runPowerShell(`Set-Clipboard -Value '${text.replace(/'/g, "''")}'`);
    return {
      success: true,
      output: { written: true },
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

// ─── Screen Capture ─────────────────────────────────────────────────────────

export async function screenCapture(outputPath: string): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("screenCapture");
    await runPowerShell(`
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
      $bitmap.Save('${outputPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $bitmap.Dispose()
    `);
    return {
      success: true,
      output: { path: outputPath },
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

// ─── Keyboard & Mouse Input ─────────────────────────────────────────────────

export async function sendKeys(keys: string): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("sendKeys");
    await runPowerShell(`
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${keys.replace(/'/g, "''")}')
    `);
    return { success: true, output: { keys }, durationMs: nowMs() - start };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

export async function mouseClick(
  x: number,
  y: number,
  button: "left" | "right" = "left",
): Promise<ToolResult> {
  const start = nowMs();
  try {
    assertWindows("mouseClick");
    const buttonCode = button === "right" ? 2 : 0;
    await runPowerShell(`
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class MouseOps {
          [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
          [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
        }
"@
      [MouseOps]::SetCursorPos(${x}, ${y})
      [MouseOps]::mouse_event(${button === "right" ? "0x0008" : "0x0002"}, 0, 0, 0, 0)
      [MouseOps]::mouse_event(${button === "right" ? "0x0010" : "0x0004"}, 0, 0, 0, 0)
    `);
    return {
      success: true,
      output: { x, y, button },
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

// ─── Network ────────────────────────────────────────────────────────────────

export async function networkRequest(
  url: string,
  method = "GET",
  body?: string,
  headers?: Record<string, string>,
): Promise<ToolResult> {
  const start = nowMs();
  try {
    const response = await fetch(url, {
      method,
      body,
      headers: { "Content-Type": "application/json", ...headers },
    });
    const text = await response.text();
    return {
      success: response.ok,
      output: { status: response.status, body: text },
      durationMs: nowMs() - start,
    };
  } catch (err) {
    return { success: false, error: String(err), durationMs: nowMs() - start };
  }
}

// ─── Unified Dispatcher ────────────────────────────────────────────────────

export async function executeSystemOperation(
  operation: SystemOperation,
  params: Record<string, unknown>,
): Promise<ToolResult> {
  switch (operation) {
    case "file.read":
      return fileRead(params["path"] as string);
    case "file.write":
      return fileWrite(params["path"] as string, params["content"] as string);
    case "file.delete":
      return fileDelete(params["path"] as string);
    case "file.list":
      return fileList(params["path"] as string, params["recursive"] as boolean);
    case "process.start":
      return processStart(
        params["command"] as string,
        params["args"] as string[],
        params["cwd"] as string,
      );
    case "process.kill":
      return processKill(params["pid"] as number);
    case "process.list":
      return processList(params["filter"] as string);
    case "registry.read":
      return registryRead(
        params["keyPath"] as string,
        params["valueName"] as string,
      );
    case "registry.write":
      return registryWrite(
        params["keyPath"] as string,
        params["valueName"] as string,
        params["value"] as string,
      );
    case "clipboard.read":
      return clipboardRead();
    case "clipboard.write":
      return clipboardWrite(params["text"] as string);
    case "screen.capture":
      return screenCapture(params["outputPath"] as string);
    case "input.keyboard":
      return sendKeys(params["keys"] as string);
    case "input.mouse":
      return mouseClick(
        params["x"] as number,
        params["y"] as number,
        params["button"] as "left" | "right",
      );
    case "network.request":
      return networkRequest(
        params["url"] as string,
        params["method"] as string,
        params["body"] as string,
      );
    default:
      return {
        success: false,
        error: `Unknown operation: ${operation}`,
        durationMs: 0,
      };
  }
}
