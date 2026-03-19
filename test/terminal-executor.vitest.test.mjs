/**
 * Terminal Executor 测试套件 (Vitest 标准格式)
 * 26w14a Phase 1 验证
 */

import { describe, it, expect } from "vitest";
import { createSession, destroySession, executeCommand, quickExec, getSession } from "../dist/execution/terminal/index.js";

describe("Terminal Executor", () => {
  describe("Session Management", () => {
    it("should create PowerShell session", () => {
      const session = createSession("powershell");
      expect(session.id).toBeDefined();
      expect(session.shellType).toBe("powershell");
      expect(session.alive).toBe(true);
      destroySession(session.id);
    });

    it("should create CMD session", () => {
      const session = createSession("cmd");
      expect(session.shellType).toBe("cmd");
      expect(session.alive).toBe(true);
      destroySession(session.id);
    });

    it("should get existing session", () => {
      const session = createSession("powershell");
      const retrieved = getSession(session.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(session.id);
      destroySession(session.id);
    });

    it("should destroy session", () => {
      const session = createSession("powershell");
      destroySession(session.id);
      const retrieved = getSession(session.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Command Execution", () => {
    it("should execute echo command", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "echo TestOutput");
      destroySession(session.id);
      expect(result.success).toBe(true);
      expect(result.output).toContain("TestOutput");
    });

    it("should check exit code for success", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "exit 0");
      destroySession(session.id);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it("should check exit code for failure", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "exit 1");
      destroySession(session.id);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it("should handle multi-line output", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "echo Line1; echo Line2; echo Line3");
      destroySession(session.id);
      expect(result.success).toBe(true);
      expect(result.output).toContain("Line1");
      expect(result.output).toContain("Line2");
      expect(result.output).toContain("Line3");
    });

    it("should handle command with arguments", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "Write-Output 'Hello World'");
      destroySession(session.id);
      expect(result.success).toBe(true);
      expect(result.output).toContain("Hello World");
    });
  });

  describe("Security", () => {
    it("should block dangerous command (rm -rf /)", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "rm -rf /");
      destroySession(session.id);
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it("should block shutdown command", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "Stop-Computer");
      destroySession(session.id);
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it("should block format command", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "format C:");
      destroySession(session.id);
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });
  });

  describe("Working Directory", () => {
    it("should execute in specific directory", async () => {
      const session = createSession("powershell", { cwd: "C:\\" });
      const result = await executeCommand(session.id, "Get-Location");
      destroySession(session.id);
      expect(result.success).toBe(true);
      expect(result.output).toContain("C:\\");
    });

    it("should change directory", async () => {
      const session = createSession("powershell");
      await executeCommand(session.id, "cd C:\\Windows");
      const result = await executeCommand(session.id, "Get-Location");
      destroySession(session.id);
      expect(result.success).toBe(true);
      expect(result.output).toContain("Windows");
    });
  });

  describe("Environment Variables", () => {
    it("should set environment variable", async () => {
      const session = createSession("powershell");
      await executeCommand(session.id, "$env:TEST_VAR = 'test_value'");
      const result = await executeCommand(session.id, "echo $env:TEST_VAR");
      destroySession(session.id);
      expect(result.success).toBe(true);
      expect(result.output).toContain("test_value");
    });

    it("should inherit system environment", async () => {
      const session = createSession("powershell");
      const result = await executeCommand(session.id, "echo $env:PATH");
      destroySession(session.id);
      expect(result.success).toBe(true);
      expect(result.output.length).toBeGreaterThan(0);
    });
  });

  describe("Quick Execution", () => {
    it("should execute quick command", async () => {
      const result = await quickExec("echo QuickTest", "powershell");
      expect(result.success).toBe(true);
      expect(result.output).toContain("QuickTest");
    });

    it("should execute quick command in CMD", async () => {
      const result = await quickExec("echo QuickTest", "cmd");
      expect(result.success).toBe(true);
      expect(result.output).toContain("QuickTest");
    });
  });
});
