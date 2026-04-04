/**
 * OpenOxygen - System Operations Skills
 *
 * High-frequency system automation
 * File management, clipboard, desktop organization
 */

import { createSubsystemLogger } from "../logging/index.js";
import type { ToolResult } from "../types/index.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const log = createSubsystemLogger("skills/system");

// ============================================================================
// File Operations
// ============================================================================

export async function listFiles(dirPath: string): Promise<ToolResult> {
  log.info(`Listing files: ${dirPath}`);

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const files = entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));

    return {
      success: true,
      data: { path: dirPath, files },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list files: ${error}`,
    };
  }
}

export async function readFile(filePath: string): Promise<ToolResult> {
  log.info(`Reading file: ${filePath}`);

  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return {
      success: true,
      data: { path: filePath, content },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error}`,
    };
  }
}

export async function writeFile(
  filePath: string,
  content: string,
): Promise<ToolResult> {
  log.info(`Writing file: ${filePath}`);

  try {
    await fs.promises.writeFile(filePath, content, "utf-8");
    return {
      success: true,
      data: { path: filePath, bytesWritten: content.length },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write file: ${error}`,
    };
  }
}

export async function deleteFile(filePath: string): Promise<ToolResult> {
  log.info(`Deleting file: ${filePath}`);

  try {
    await fs.promises.unlink(filePath);
    return {
      success: true,
      data: { path: filePath, deleted: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete file: ${error}`,
    };
  }
}

export async function copyFile(
  sourcePath: string,
  destPath: string,
): Promise<ToolResult> {
  log.info(`Copying file: ${sourcePath} -> ${destPath}`);

  try {
    await fs.promises.copyFile(sourcePath, destPath);
    return {
      success: true,
      data: { source: sourcePath, destination: destPath },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to copy file: ${error}`,
    };
  }
}

export async function moveFile(
  sourcePath: string,
  destPath: string,
): Promise<ToolResult> {
  log.info(`Moving file: ${sourcePath} -> ${destPath}`);

  try {
    await fs.promises.rename(sourcePath, destPath);
    return {
      success: true,
      data: { source: sourcePath, destination: destPath },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to move file: ${error}`,
    };
  }
}

export async function createDirectory(dirPath: string): Promise<ToolResult> {
  log.info(`Creating directory: ${dirPath}`);

  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return {
      success: true,
      data: { path: dirPath, created: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create directory: ${error}`,
    };
  }
}

export async function deleteDirectory(dirPath: string): Promise<ToolResult> {
  log.info(`Deleting directory: ${dirPath}`);

  try {
    await fs.promises.rmdir(dirPath, { recursive: true });
    return {
      success: true,
      data: { path: dirPath, deleted: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete directory: ${error}`,
    };
  }
}

export async function getFileInfo(filePath: string): Promise<ToolResult> {
  log.info(`Getting file info: ${filePath}`);

  try {
    const stats = await fs.promises.stat(filePath);
    return {
      success: true,
      data: {
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get file info: ${error}`,
    };
  }
}

// ============================================================================
// Directory Operations
// ============================================================================

export async function searchFiles(
  dirPath: string,
  pattern: string,
): Promise<ToolResult> {
  log.info(`Searching files in ${dirPath} for pattern: ${pattern}`);

  try {
    const results: string[] = [];
    
    async function searchRecursive(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.name.includes(pattern)) {
          results.push(fullPath);
        }
        
        if (entry.isDirectory()) {
          await searchRecursive(fullPath);
        }
      }
    }
    
    await searchRecursive(dirPath);
    
    return {
      success: true,
      data: { pattern, results },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search files: ${error}`,
    };
  }
}

export async function getDirectorySize(dirPath: string): Promise<ToolResult> {
  log.info(`Getting directory size: ${dirPath}`);

  try {
    let totalSize = 0;
    
    async function calculateSize(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await calculateSize(fullPath);
        } else {
          const stats = await fs.promises.stat(fullPath);
          totalSize += stats.size;
        }
      }
    }
    
    await calculateSize(dirPath);
    
    return {
      success: true,
      data: { path: dirPath, size: totalSize, humanReadable: formatBytes(totalSize) },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get directory size: ${error}`,
    };
  }
}

// ============================================================================
// Clipboard Operations
// ============================================================================

export async function getClipboard(): Promise<ToolResult> {
  log.info("Getting clipboard content");

  try {
    const { stdout } = await execAsync("powershell -command Get-Clipboard");
    return {
      success: true,
      data: { content: stdout.trim() },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get clipboard: ${error}`,
    };
  }
}

export async function setClipboard(content: string): Promise<ToolResult> {
  log.info("Setting clipboard content");

  try {
    // Escape content for PowerShell
    const escaped = content
      .replace(/"/g, "`\"")
      .replace(/\n/g, "`n")
      .replace(/\r/g, "`r");
    
    await execAsync(`powershell -command "Set-Clipboard -Value \\"${escaped}\\""`);
    
    return {
      success: true,
      data: { bytesCopied: content.length },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to set clipboard: ${error}`,
    };
  }
}

export async function clearClipboard(): Promise<ToolResult> {
  log.info("Clearing clipboard");

  try {
    await execAsync("powershell -command Set-Clipboard -Value $null");
    return {
      success: true,
      data: { cleared: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to clear clipboard: ${error}`,
    };
  }
}

// ============================================================================
// System Information
// ============================================================================

export async function getSystemInfo(): Promise<ToolResult> {
  log.info("Getting system information");

  try {
    const os = await import("node:os");
    
    return {
      success: true,
      data: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        release: os.release(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus().length,
        uptime: os.uptime(),
        userInfo: os.userInfo(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get system info: ${error}`,
    };
  }
}

export async function getDiskInfo(): Promise<ToolResult> {
  log.info("Getting disk information");

  try {
    const { stdout } = await execAsync("wmic logicaldisk get size,freespace,caption");
    const lines = stdout.trim().split("\n").slice(1);
    
    const drives = lines
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const parts = line.split(/\s+/);
        return {
          drive: parts[0],
          freeSpace: parseInt(parts[1] || "0"),
          totalSize: parseInt(parts[2] || "0"),
        };
      });

    return {
      success: true,
      data: { drives },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get disk info: ${error}`,
    };
  }
}

// ============================================================================
// Process Operations
// ============================================================================

export async function listProcesses(): Promise<ToolResult> {
  log.info("Listing processes");

  try {
    const { stdout } = await execAsync("tasklist /fo csv");
    const lines = stdout.trim().split("\n").slice(1);
    
    const processes = lines.map(line => {
      const parts = line.split("","").map(p => p.replace(/^"|"$/g, ""));
      return {
        name: parts[0],
        pid: parseInt(parts[1]),
        sessionName: parts[2],
        sessionNumber: parseInt(parts[3]),
        memoryUsage: parts[4],
      };
    });

    return {
      success: true,
      data: { processes },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list processes: ${error}`,
    };
  }
}

export async function killProcess(pid: number): Promise<ToolResult> {
  log.info(`Killing process: ${pid}`);

  try {
    await execAsync(`taskkill /PID ${pid} /F`);
    return {
      success: true,
      data: { pid, killed: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to kill process: ${error}`,
    };
  }
}

// ============================================================================
// Utilities
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ============================================================================
// Exports
// ============================================================================

export {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  copyFile,
  moveFile,
  createDirectory,
  deleteDirectory,
  getFileInfo,
  searchFiles,
  getDirectorySize,
  getClipboard,
  setClipboard,
  clearClipboard,
  getSystemInfo,
  getDiskInfo,
  listProcesses,
  killProcess,
};

export const SystemSkills = {
  file: {
    list: listFiles,
    read: readFile,
    write: writeFile,
    delete: deleteFile,
    copy: copyFile,
    move: moveFile,
    info: getFileInfo,
    search: searchFiles,
  },
  directory: {
    create: createDirectory,
    delete: deleteDirectory,
    size: getDirectorySize,
  },
  clipboard: {
    get: getClipboard,
    set: setClipboard,
    clear: clearClipboard,
  },
  system: {
    info: getSystemInfo,
    disk: getDiskInfo,
    processes: listProcesses,
    kill: killProcess,
  },
};

export default SystemSkills;
