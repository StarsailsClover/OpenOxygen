/**
 * OpenOxygen Phase 7 — Plugin Marketplace Test (26w11aE_P7)
 */

import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";

const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";
const SKILLS_DIR = "D:\\Coding\\OpenOxygen\\_reference\\skills-main\\skills";
const TEST_PLUGINS_DIR = "D:\\Coding\\OpenOxygen\\test\\test_plugins";

class P7Test {
  constructor() {
    this.results = { phase: "P7_Marketplace", timestamp: new Date().toISOString(), tests: {}, summary: { passed: 0, failed: 0 } };
  }
  async test(name, fn) {
    try { await fn(); console.log(`  ✅ ${name}`); this.results.summary.passed++; }
    catch (err) { console.log(`  ❌ ${name}: ${err.message}`); this.results.summary.failed++; }
  }
  save() {
    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(`${RESULTS_DIR}\\p7-results-${Date.now()}.json`, JSON.stringify(this.results, null, 2));
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen Phase 7 — Plugin Marketplace Test            ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // 清理测试目录
  try { rmSync(TEST_PLUGINS_DIR, { recursive: true, force: true }); } catch {}

  const runner = new P7Test();

  // ─── Signing ──────────────────────────────────────────────────
  console.log("🔐 Plugin Signing");

  await runner.test("Generate Ed25519 key pair", async () => {
    const { generateSigningKeys } = await import("../dist/plugins/marketplace/index.js");
    const keys = generateSigningKeys();
    if (!keys.publicKey.includes("PUBLIC KEY")) throw new Error("Invalid public key");
    if (!keys.privateKey.includes("PRIVATE KEY")) throw new Error("Invalid private key");
    runner.results.tests.keyGen = { pubKeyLength: keys.publicKey.length, privKeyLength: keys.privateKey.length };
  });

  await runner.test("Sign and verify plugin", async () => {
    const { generateSigningKeys, signPlugin, verifyPluginSignature } = await import("../dist/plugins/marketplace/index.js");
    const keys = generateSigningKeys();
    const hash = "abc123def456";
    const signature = signPlugin(hash, keys.privateKey);
    const valid = verifyPluginSignature(hash, signature, keys.publicKey);
    if (!valid) throw new Error("Signature verification failed");
  });

  await runner.test("Detect tampered signature", async () => {
    const { generateSigningKeys, signPlugin, verifyPluginSignature } = await import("../dist/plugins/marketplace/index.js");
    const keys = generateSigningKeys();
    const signature = signPlugin("original-hash", keys.privateKey);
    const valid = verifyPluginSignature("tampered-hash", signature, keys.publicKey);
    if (valid) throw new Error("Tampered signature accepted!");
  });

  // ─── Repository ───────────────────────────────────────────────
  console.log("\n📦 Plugin Repository");

  let repo;
  await runner.test("Create repository", async () => {
    const { PluginRepository } = await import("../dist/plugins/marketplace/index.js");
    repo = new PluginRepository(TEST_PLUGINS_DIR);
    const list = repo.list();
    if (list.length !== 0) throw new Error("Should start empty");
  });

  await runner.test("Import single OpenClaw skill", async () => {
    // 找一个 skill 目录
    const { readdirSync } = await import("node:fs");
    const owners = readdirSync(SKILLS_DIR).slice(0, 10);
    let imported = false;

    for (const owner of owners) {
      const ownerDir = `${SKILLS_DIR}\\${owner}`;
      const result = repo.importFromOpenClaw(ownerDir);
      if (result) {
        runner.results.tests.singleImport = {
          name: result.manifest.name,
          version: result.manifest.version,
          source: result.source,
          permissions: result.manifest.permissions,
        };
        console.log(`    Imported: ${result.manifest.name} v${result.manifest.version}`);
        imported = true;
        break;
      }
    }

    if (!imported) throw new Error("No skill could be imported");
  });

  await runner.test("Batch import OpenClaw skills (10)", async () => {
    const result = repo.batchImportOpenClaw(SKILLS_DIR, 10);
    runner.results.tests.batchImport = result;
    console.log(`    Imported: ${result.imported}, Failed: ${result.failed}, Skipped: ${result.skipped}`);
    if (result.imported === 0) throw new Error("No skills imported");
  });

  await runner.test("List installed plugins", async () => {
    const list = repo.list();
    runner.results.tests.installed = list.length;
    console.log(`    ${list.length} plugins installed`);
    if (list.length === 0) throw new Error("No plugins listed");
  });

  await runner.test("Search plugins", async () => {
    const list = repo.list();
    if (list.length === 0) throw new Error("No plugins to search");
    const firstTag = list[0].manifest.tags?.[0] || list[0].manifest.name;
    const results = repo.search(firstTag);
    console.log(`    Search "${firstTag}": ${results.length} results`);
  });

  await runner.test("Verify plugin integrity", async () => {
    const list = repo.list();
    if (list.length === 0) throw new Error("No plugins to verify");
    const result = repo.verifyIntegrity(list[0].manifest.name);
    if (!result.valid) throw new Error(`Integrity check failed: ${result.reason}`);
  });

  await runner.test("Uninstall plugin", async () => {
    const list = repo.list();
    if (list.length === 0) throw new Error("No plugins to uninstall");
    const name = list[0].manifest.name;
    const result = repo.uninstall(name);
    if (!result) throw new Error("Uninstall failed");
    const remaining = repo.list();
    console.log(`    Uninstalled ${name}, ${remaining.length} remaining`);
  });

  // ─── Permission Audit ─────────────────────────────────────────
  console.log("\n🛡️ Permission Audit");

  await runner.test("Safe permissions pass", async () => {
    const audit = repo.auditPermissions(["network", "clipboard.read"]);
    if (audit.blocked.length > 0) throw new Error("Safe permissions blocked");
    if (audit.safe.length !== 2) throw new Error("Not all marked safe");
  });

  await runner.test("Dangerous permissions blocked", async () => {
    const audit = repo.auditPermissions(["network", "process.kill", "registry.write"]);
    if (audit.blocked.length !== 2) throw new Error(`Expected 2 blocked, got ${audit.blocked.length}`);
    runner.results.tests.permAudit = audit;
  });

  // ─── Cleanup ──────────────────────────────────────────────────
  try { rmSync(TEST_PLUGINS_DIR, { recursive: true, force: true }); } catch {}

  // ─── Summary ──────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`Results: ${runner.results.summary.passed} passed, ${runner.results.summary.failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");

  runner.save();
  process.exit(runner.results.summary.failed > 0 ? 1 : 0);
}

main().catch(err => { console.error("Test failed:", err); process.exit(1); });
