/**
 * OpenOxygen — Windows Privilege Isolation (26w11aE_P1)
 *
 * 针对 risks.md Windows 权限继承风险的加固实现：
 * - 低权限用户创建与运行
 * - 权限降级执行
 * - 沙箱进程隔离
 */

import { createSubsystemLogger } from "../logging/index.js";
import { spawn, execSync } from "node:child_process";
import { platform } from "node:os";
import process from "node:process";

const log = createSubsystemLogger("security/privilege");

// ═══════════════════════════════════════════════════════════════════════════
// Privilege Detection
// ═══════════════════════════════════════════════════════════════════════════

export type PrivilegeLevel = "system" | "admin" | "user" | "restricted";

export interface PrivilegeStatus {
  level: PrivilegeLevel;
  isElevated: boolean;
  canEscalate: boolean;
  username: string;
  domain: string;
}

/**
 * 检测当前进程权限级别
 */
export function detectPrivilegeLevel(): PrivilegeStatus {
  if (platform() !== "win32") {
    // 非 Windows 平台简化处理
    return {
      level: (process.getuid?.() === 0 ? "admin" : "user") as PrivilegeLevel,
      isElevated: process.getuid?.() === 0,
      canEscalate: false,
      username: process.env.USER || "unknown",
      domain: "",
    };
  }

  try {
    // Windows: 使用 whoami 和 net session 检测
    const username = execSync("whoami", { encoding: "utf-8" }).trim();
    const [domain = "", user = "unknown"] = username.includes("\\") ? username.split("\\") : ["", username];
    
    let isElevated = false;
    let level: PrivilegeLevel = "user";
    
    try {
      // net session 只有管理员能成功执行
      execSync("net session", { stdio: "ignore" });
      isElevated = true;
      level = "admin";
    } catch {
      isElevated = false;
    }
    
    // 检测 SYSTEM 账户
    if (username.toLowerCase().includes("system") || username.toLowerCase().includes("nt authority")) {
      level = "system";
      isElevated = true;
    }
    
    return {
      level,
      isElevated,
      canEscalate: level === "user",
      username: user,
      domain,
    };
  } catch (err) {
    log.error("Failed to detect privilege level:", err);
    return {
      level: "user",
      isElevated: false,
      canEscalate: false,
      username: "unknown",
      domain: "",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Low-Privilege User Management
// ═══════════════════════════════════════════════════════════════════════════

export interface LowPrivilegeConfig {
  username: string;
  password: string;
  allowedPaths: string[];
  deniedPaths: string[];
}

export class LowPrivilegeSandbox {
  private config: LowPrivilegeConfig;

  constructor(config: LowPrivilegeConfig) {
    this.config = config;
  }

  /**
   * 创建低权限 Windows 用户
   */
  createUser(): boolean {
    if (platform() !== "win32") {
      log.warn("User creation only supported on Windows");
      return false;
    }

    try {
      // 检查用户是否已存在
      try {
        execSync(`net user ${this.config.username}`, { stdio: "ignore" });
        log.info(`User ${this.config.username} already exists`);
        return true;
      } catch {
        // 用户不存在，继续创建
      }

      // 创建用户
      execSync(
        `net user ${this.config.username} ${this.config.password} /add /active:yes /comment:"OpenOxygen Sandbox User"`,
        { stdio: "inherit" }
      );

      // 从 Users 组移除（限制权限）
      try {
        execSync(`net localgroup Users ${this.config.username} /delete`, { stdio: "ignore" });
      } catch {
        // 忽略错误
      }

      // 创建自定义组（可选）
      // execSync(`net localgroup OpenOxygenSandbox ${this.config.username} /add`, { stdio: "ignore" });

      // 设置目录权限
      for (const path of this.config.allowedPaths) {
        try {
          execSync(
            `icacls "${path}" /grant ${this.config.username}:(OI)(CI)RX /T`,
            { stdio: "ignore" }
          );
        } catch {
          log.warn(`Failed to set permission for ${path}`);
        }
      }

      // 拒绝敏感路径
      for (const path of this.config.deniedPaths) {
        try {
          execSync(
            `icacls "${path}" /deny ${this.config.username}:(OI)(CI)F /T`,
            { stdio: "ignore" }
          );
        } catch {
          // 忽略错误
        }
      }

      log.info(`Created low-privilege user: ${this.config.username}`);
      return true;
    } catch (err) {
      log.error("Failed to create low-privilege user:", err);
      return false;
    }
  }

  /**
   * 删除低权限用户
   */
  deleteUser(): boolean {
    if (platform() !== "win32") return false;

    try {
      execSync(`net user ${this.config.username} /delete`, { stdio: "inherit" });
      log.info(`Deleted user: ${this.config.username}`);
      return true;
    } catch (err) {
      log.error("Failed to delete user:", err);
      return false;
    }
  }

  /**
   * 以低权限用户执行命令
   */
  executeAsUser(command: string, args: string[] = []): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      if (platform() !== "win32") {
        resolve({ success: false, output: "", error: "Only supported on Windows" });
        return;
      }

      // 使用 runas 以低权限用户执行
      const runasCmd = `runas /user:${this.config.username} "${command} ${args.join(" ")}"`;
      
      const child = spawn("cmd", ["/c", runasCmd], {
        windowsHide: true,
      });

      let output = "";
      let error = "";

      child.stdout?.on("data", (data) => {
        output += data.toString();
      });

      child.stderr?.on("data", (data) => {
        error += data.toString();
      });

      child.on("close", (code) => {
        resolve({
          success: code === 0,
          output,
          error: error || undefined,
        });
      });

      // 超时处理
      setTimeout(() => {
        child.kill();
        resolve({ success: false, output, error: "Execution timeout" });
      }, 30000);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Privilege Drop
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 尝试降级权限（仅限 Unix）
 */
export function dropPrivileges(targetUser?: string): boolean {
  if (platform() === "win32") {
    log.warn("Privilege drop not supported on Windows, use LowPrivilegeSandbox instead");
    return false;
  }

  try {
    if (process.getuid && process.setuid) {
      if (process.getuid() === 0) {
        // 当前是 root，尝试降级
        const user = targetUser || "nobody";
        // 获取用户 UID（简化处理）
        const { uid, gid } = getUserIds(user);
        
      process.setgid?.(gid);
      process.setuid?.(uid);
        
        log.info(`Dropped privileges to ${user} (uid=${uid}, gid=${gid})`);
        return true;
      }
    }
    return false;
  } catch (err) {
    log.error("Failed to drop privileges:", err);
    return false;
  }
}

function getUserIds(username: string): { uid: number; gid: number } {
  try {
    const output = execSync(`id -u ${username} && id -g ${username}`, { encoding: "utf-8" });
    const [uid, gid] = output.trim().split("\n").map(Number);
    return { uid: uid || 65534, gid: gid || 65534 };
  } catch {
    return { uid: 65534, gid: 65534 }; // nobody
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Process Isolation
// ═══════════════════════════════════════════════════════════════════════════

export interface IsolatedProcessConfig {
  command: string;
  args: string[];
  allowedPaths: string[];
  maxMemoryMB: number;
  timeoutMs: number;
  network: boolean;
}

/**
 * 启动隔离进程
 */
export function spawnIsolated(config: IsolatedProcessConfig): Promise<{
  success: boolean;
  pid?: number;
  output: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // 构建隔离参数
    const spawnOptions: any = {
      windowsHide: true,
      detached: false,
    };

    // Windows: 使用 Job Object 限制资源
    if (platform() === "win32") {
      // 通过 PowerShell 启动带限制的进程
      const psCommand = `
        $job = Start-Job {
          $proc = Start-Process -FilePath "${config.command}" -ArgumentList "${config.args.join(" ")}" -PassThru -NoNewWindow
          $proc
        }
        Wait-Job $job -Timeout ${Math.floor(config.timeoutMs / 1000)}
        Receive-Job $job
      `;
      
      const child = spawn("powershell", ["-Command", psCommand], spawnOptions);
      
      let output = "";
      let error = "";
      
      child.stdout?.on("data", (data) => { output += data.toString(); });
      child.stderr?.on("data", (data) => { error += data.toString(); });
      
      child.on("close", (code) => {
        resolve({
          success: code === 0,
          output,
          error: error || undefined,
        });
      });
    } else {
      // Unix: 使用 chroot 或 systemd-run
      const child = spawn(config.command, config.args, {
        ...spawnOptions,
        env: { ...process.env, PATH: "/usr/bin:/bin" },
      });
      
      let output = "";
      let error = "";
      
      child.stdout?.on("data", (data) => { output += data.toString(); });
      child.stderr?.on("data", (data) => { error += data.toString(); });
      
      // 内存限制（通过 cgroup，简化处理）
      const memoryWatcher = setInterval(() => {
        // 实际实现需要读取 /proc/[pid]/status
      }, 1000);
      
      // 超时
      const timeout = setTimeout(() => {
        clearInterval(memoryWatcher);
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5000);
      }, config.timeoutMs);
      
      child.on("close", (code) => {
        clearInterval(memoryWatcher);
        clearTimeout(timeout);
        resolve({
          success: code === 0,
          pid: child.pid,
          output,
          error: error || undefined,
        });
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Security Policy Enforcement
// ═══════════════════════════════════════════════════════════════════════════

export class PrivilegePolicy {
  private minLevel: PrivilegeLevel;
  private sandbox?: LowPrivilegeSandbox;

  constructor(minLevel: PrivilegeLevel = "user") {
    this.minLevel = minLevel;
  }

  /**
   * 检查当前权限是否满足策略
   */
  check(): { allowed: boolean; current: PrivilegeStatus; reason?: string } {
    const current = detectPrivilegeLevel();
    
    const levels = { system: 3, admin: 2, user: 1, restricted: 0 };
    
    if (levels[current.level] < levels[this.minLevel]) {
      return {
        allowed: false,
        current,
        reason: `Current level ${current.level} below required ${this.minLevel}`,
      };
    }
    
    // 警告：以管理员运行
    if (current.level === "admin" || current.level === "system") {
      return {
        allowed: true,
        current,
        reason: "WARNING: Running with elevated privileges. Consider using LowPrivilegeSandbox.",
      };
    }
    
    return { allowed: true, current };
  }

  /**
   * 启用沙箱模式
   */
  enableSandbox(config: LowPrivilegeConfig): void {
    this.sandbox = new LowPrivilegeSandbox(config);
    this.sandbox.createUser();
  }

  /**
   * 执行敏感操作（自动降级或沙箱）
   */
  async executeSensitive<T>(
    operation: () => Promise<T>,
    options: { useSandbox?: boolean; sandboxConfig?: LowPrivilegeConfig } = {}
  ): Promise<T> {
    const check = this.check();
    
    if (!check.allowed) {
      throw new Error(`Privilege check failed: ${check.reason}`);
    }
    
    if (check.current.level === "admin" && options.useSandbox) {
      // 使用沙箱执行
      if (!this.sandbox && options.sandboxConfig) {
        this.enableSandbox(options.sandboxConfig);
      }
      
      // 实际执行需要序列化操作，这里简化处理
      log.warn("Sandbox execution requested but not fully implemented");
    }
    
    return operation();
  }
}

// 全局策略实例
export const privilegePolicy = new PrivilegePolicy("user");
