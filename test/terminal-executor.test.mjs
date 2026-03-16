/**
 * Terminal Executor 测试套件
 * 26w14a Phase 1 验证
 */

import { createSession, destroySession, executeCommand, quickExec, getSession } from "../dist/execution/terminal/index.js";

const TESTS = {
  passed: 0,
  failed: 0,
  results: [],
};

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    TESTS.passed++;
    TESTS.results.push({ name, status: "PASS", duration });
    console.log(`✅ (${duration}ms)`);
  } catch (e) {
    TESTS.failed++;
    TESTS.results.push({ name, status: "FAIL", error: e.message });
    console.log(`❌ ${e.message}`);
  }
}

async function runTests() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  Terminal Executor Test Suite - 26w14a Phase 1              ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // Test 1: Session creation
  await test("Create PowerShell session", () => {
    const session = createSession("powershell");
    if (!session.id) throw new Error("No session ID");
    if (session.shellType !== "powershell") throw new Error("Wrong shell type");
    if (!session.alive) throw new Error("Session not alive");
    destroySession(session.id);
  });

  // Test 2: CMD session
  await test("Create CMD session", () => {
    const session = createSession("cmd");
    if (session.shellType !== "cmd") throw new Error("Wrong shell type");
    destroySession(session.id);
  });

  // Test 3: Command execution (echo)
  await test("Execute echo command", async () => {
    const session = createSession("powershell");
    const result = await executeCommand(session.id, "echo TestOutput");
    destroySession(session.id);
    if (!result.success) throw new Error(`Command failed: ${result.error}`);
    if (!result.output.includes("TestOutput")) throw new Error("Output mismatch");
    if (!result.terminalCommand) throw new Error("No terminalCommand in result");
  });

  // Test 4: Command with exit code
  await test("Check exit code (success)", async () => {
    const session = createSession("powershell");
    const result = await executeCommand(session.id, "exit 0");
    destroySession(session.id);
    if (result.terminalCommand.exitCode !== 0) throw new Error(`Expected exit 0, got ${result.terminalCommand.exitCode}`);
  });

  // Test 5: Security - blocked command
  await test("Security: Block dangerous command", async () => {
    const session = createSession("powershell");
    const result = await executeCommand(session.id, "rm -rf /");
    destroySession(session.id);
    if (result.success) throw new Error("Dangerous command should be blocked");
    if (!result.error.includes("Blocked")) throw new Error("Should be blocked");
  });

  // Test 6: Security - shutdown blocked
  await test("Security: Block shutdown", async () => {
    const session = createSession("powershell");
    const result = await executeCommand(session.id, "Stop-Computer");
    destroySession(session.id);
    if (result.success) throw new Error("Shutdown should be blocked");
  });

  // Test 7: Working directory persistence
  await test("Working directory persistence", async () => {
    const session = createSession("powershell", "C:\\");
    const result1 = await executeCommand(session.id, "cd C:\\Windows");
    const result2 = await executeCommand(session.id, "cd");
    const cwdAfter = session.cwd;
    destroySession(session.id);
    if (!cwdAfter.includes("Windows")) throw new Error(`CWD not updated: ${cwdAfter}`);
  });

  // Test 8: QuickExec (no session)
  await test("QuickExec without session", async () => {
    const result = await quickExec("echo QuickTest", "powershell");
    if (!result.success) throw new Error(`QuickExec failed: ${result.error}`);
    if (!result.output.includes("QuickTest")) throw new Error("Output mismatch");
  });

  // Test 9: Session retrieval
  await test("Get session by ID", () => {
    const session = createSession("powershell");
    const retrieved = getSession(session.id);
    if (!retrieved) throw new Error("Session not found");
    if (retrieved.id !== session.id) throw new Error("ID mismatch");
    destroySession(session.id);
  });

  // Test 10: Multiple sessions
  await test("Multiple concurrent sessions", () => {
    const s1 = createSession("powershell");
    const s2 = createSession("cmd");
    const s3 = createSession("powershell");
    if (!s1.id || !s2.id || !s3.id) throw new Error("Failed to create sessions");
    destroySession(s1.id);
    destroySession(s2.id);
    destroySession(s3.id);
  });

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Test Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ Passed: ${TESTS.passed}`);
  console.log(`  ❌ Failed: ${TESTS.failed}`);
  console.log(`  📊 Total: ${TESTS.passed + TESTS.failed}`);
  console.log("═══════════════════════════════════════════════════════════════");

  // Detailed results
  if (TESTS.failed > 0) {
    console.log("\nFailed tests:");
    for (const r of TESTS.results.filter(r => r.status === "FAIL")) {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    }
  }

  process.exit(TESTS.failed > 0 ? 1 : 0);
}

runTests();
