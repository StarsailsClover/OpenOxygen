/**
 * System Operations Skills
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

export async function writeFile(filePath: string, content: string): Promise<ToolResult> {
  log.info(`Writing file: ${filePath}`);
  
  try {
    await fs.promises.writeFile(filePath, content, "utf-8");
    return {
      success: true,
      data: { path: filePath, written: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write file: ${error}`,
    };
  }
}

export async function copyFile(src: string, dest: string): Promise<ToolResult> {
  log.info(`Copying file: ${src} -> ${dest}`);
  
  try {
    await fs.promises.copyFile(src, dest);
    return {
      success: true,
      data: { source: src, destination: dest },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to copy file: ${error}`,
    };
  }
}

export async function moveFile(src: string, dest: string): Promise<ToolResult> {
  log.info(`Moving file: ${src} -> ${dest}`);
  
  try {
    await fs.promises.rename(src, dest);
    return {
      success: true,
      data: { source: src, destination: dest },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to move file: ${error}`,
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
    await fs.promises.rm(dirPath, { recursive: true, force: true });
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

// ============================================================================
// Batch File Operations
// ============================================================================

export async function batchRename(
  dirPath: string,
  pattern: string,
  replacement: string,
): Promise<ToolResult> {
  log.info(`Batch renaming in: ${dirPath}`);
  
  try {
    const entries = await fs.promises.readdir(dirPath);
    const renamed: string[] = [];
    
    for (const entry of entries) {
      if (entry.includes(pattern)) {
        const newName = entry.replace(pattern, replacement);
        const oldPath = path.join(dirPath, entry);
        const newPath = path.join(dirPath, newName);
        await fs.promises.rename(oldPath, newPath);
        renamed.push(`${entry} -> ${newName}`);
      }
    }
    
    return {
      success: true,
      data: { path: dirPath, renamed },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to batch rename: ${error}`,
    };
  }
}

export async function findFiles(
  dirPath: string,
  pattern: string,
): Promise<ToolResult> {
  log.info(`Finding files: ${pattern} in ${dirPath}`);
  
  try {
    const results: string[] = [];
    
    async function search(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.name.includes(pattern)) {
          results.push(fullPath);
        }
        
        if (entry.isDirectory()) {
          await search(fullPath);
        }
      }
    }
    
    await search(dirPath);
    
    return {
      success: true,
      data: { pattern, results },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to find files: ${error}`,
    };
  }
}

// ============================================================================
// Clipboard Operations
// ============================================================================

export async function getClipboard(): Promise<ToolResult> {
  log.info("Getting clipboard content");
  
  try {
    // Use PowerShell on Windows
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
    // Use PowerShell on Windows
    await execAsync(`powershell -command Set-Clipboard -Value "${content.replace(/"/g, '""')}"`);
    
    return {
      success: true,
      data: { content },
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
    await execAsync("powershell -command Set-Clipboard -Value \"\"");
    
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
// Desktop Organization
// ============================================================================

export async function organizeDesktop(): Promise<ToolResult> {
  log.info("Organizing desktop");
  
  try {
    const desktopPath = path.join(process.env.USERPROFILE || "", "Desktop");
    const organized: Record<string, string[]> = {
      documents: [],
      images: [],
      videos: [],
      archives: [],
      others: [],
    };
    
    const entries = await fs.promises.readdir(desktopPath);
    
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      const fullPath = path.join(desktopPath, entry);
      
      if ([".doc", ".docx", ".pdf", ".txt", ".md"].includes(ext)) {
        organized.documents.push(fullPath);
      } else if ([".jpg", ".jpeg", ".png", ".gif", ".bmp"].includes(ext)) {
        organized.images.push(fullPath);
      } else if ([".mp4", ".avi", ".mov", ".mkv"].includes(ext)) {
        organized.videos.push(fullPath);
      } else if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) {
        organized.archives.push(fullPath);
      } else {
        organized.others.push(fullPath);
      }
    }
    
    return {
      success: true,
      data: { organized },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to organize desktop: ${error}`,
    };
  }
}

export async function cleanTempFiles(): Promise<ToolResult> {
  log.info("Cleaning temporary files");
  
  try {
    const tempPaths = [
      process.env.TEMP,
      process.env.TMP,
      path.join(process.env.USERPROFILE || "", "AppData", "Local", "Temp"),
    ].filter(Boolean) as string[];
    
    let cleaned = 0;
    
    for (const tempPath of tempPaths) {
      try {
        const entries = await fs.promises.readdir(tempPath);
        
        for (const entry of entries) {
          const fullPath = path.join(tempPath, entry);
          const stats = await fs.promises.stat(fullPath);
          
          // Delete files older than 7 days
          const age = Date.now() - stats.mtime.getTime();
          if (age > 7 * 24 * 60 * 60 * 1000) {
            if (stats.isFile()) {
              await fs.promises.unlink(fullPath);
              cleaned++;
            }
          }
        }
      } catch {
        // Ignore errors for individual paths
      }
    }
    
    return {
      success: true,
      data: { cleaned },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to clean temp files: ${error}`,
    };
  }
}

// ============================================================================
// System Info
// ============================================================================

export async function getSystemInfo(): Promise<ToolResult> {
  log.info("Getting system info");
  
  try {
    const info = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpus: require("node:os").cpus().length,
      totalMemory: require("node:os").totalmem(),
      freeMemory: require("node:os").freemem(),
      homeDir: require("node:os").homedir(),
      tempDir: require("node:os").tmpdir(),
    };
    
    return {
      success: true,
      data: info,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get system info: ${error}`,
    };
  }
}

// ============================================================================
// Skill Registration
// ============================================================================

export function registerSystemSkills(skillRegistry: any): void {
  skillRegistry.register("system.file.list", listFiles);
  skillRegistry.register("system.file.read", readFile);
  skillRegistry.register("system.file.write", writeFile);
  skillRegistry.register("system.file.copy", copyFile);
  skillRegistry.register("system.file.move", moveFile);
  skillRegistry.register("system.file.delete", deleteFile);
  skillRegistry.register("system.dir.create", createDirectory);
  skillRegistry.register("system.dir.delete", deleteDirectory);
  skillRegistry.register("system.batch.rename", batchRename);
  skillRegistry.register("system.file.find", findFiles);
  skillRegistry.register("system.clipboard.get", getClipboard);
  skillRegistry.register("system.clipboard.set", setClipboard);
  skillRegistry.register("system.clipboard.clear", clearClipboard);
  skillRegistry.register("system.desktop.organize", organizeDesktop);
  skillRegistry.register("system.temp.clean", cleanTempFiles);
  skillRegistry.register("system.info", getSystemInfo);
  
  log.info("System operations skills registered");
}
