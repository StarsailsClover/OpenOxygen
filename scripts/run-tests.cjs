#!/usr/bin/env node
/**
 * Test Runner
 * Runs all tests and generates report
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🧪 OpenOxygen Test Runner\n");
console.log("=" .repeat(60));

const results = {
  timestamp: new Date().toISOString(),
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
  suites: [],
};

const startTime = Date.now();

try {
  console.log("\n📋 Running test suites...\n");
  
  // Run unit tests
  console.log("1️⃣  Unit Tests");
  console.log("-".repeat(40));
  try {
    const output = execSync("npm test -- --reporter=verbose", {
      cwd: "D:\\Coding\\OpenOxygen",
      encoding: "utf-8",
      stdio: "pipe",
    });
    console.log(output);
    results.suites.push({ name: "Unit", status: "passed" });
    results.passed++;
  } catch (error) {
    console.error("Unit tests failed:", error.message);
    results.suites.push({ name: "Unit", status: "failed" });
    results.failed++;
  }

  // Run integration tests
  console.log("\n2️⃣  Integration Tests");
  console.log("-".repeat(40));
  try {
    const output = execSync("npm test -- integration --reporter=verbose", {
      cwd: "D:\\Coding\\OpenOxygen",
      encoding: "utf-8",
      stdio: "pipe",
    });
    console.log(output);
    results.suites.push({ name: "Integration", status: "passed" });
    results.passed++;
  } catch (error) {
    console.error("Integration tests failed:", error.message);
    results.suites.push({ name: "Integration", status: "failed" });
    results.failed++;
  }

  // Run benchmarks
  console.log("\n3️⃣  Performance Benchmarks");
  console.log("-".repeat(40));
  try {
    const output = execSync("npm test -- benchmark --reporter=verbose", {
      cwd: "D:\\Coding\\OpenOxygen",
      encoding: "utf-8",
      stdio: "pipe",
    });
    console.log(output);
    results.suites.push({ name: "Benchmark", status: "passed" });
    results.passed++;
  } catch (error) {
    console.error("Benchmarks failed:", error.message);
    results.suites.push({ name: "Benchmark", status: "failed" });
    results.failed++;
  }

} catch (error) {
  console.error("Test runner error:", error);
}

results.duration = Date.now() - startTime;

// Generate report
console.log("\n" + "=".repeat(60));
console.log("📊 Test Report\n");
console.log(`Duration: ${(results.duration / 1000).toFixed(2)}s`);
console.log(`Passed: ${results.passed} ✅`);
console.log(`Failed: ${results.failed} ❌`);
console.log(`Skipped: ${results.skipped} ⏭️`);
console.log("\nSuites:");
results.suites.forEach((suite) => {
  const icon = suite.status === "passed" ? "✅" : "❌";
  console.log(`  ${icon} ${suite.name}`);
});

// Save report
const reportPath = path.join("D:\\Coding\\OpenOxygen", "TEST_REPORT.json");
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n💾 Report saved to: ${reportPath}`);

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
