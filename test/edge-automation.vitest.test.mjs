/**
 * Edge Automation 测试套件 (Vitest 标准格式)
 * 26w15aC Phase 4 验证
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GmailAutomation, BilibiliAutomation, GitHubAutomation, launchEdge } from "../dist/execution/edge-automation/index.js";
import { sleep } from "../dist/utils/index.js";

describe("Edge Automation", () => {
  describe("Edge Launch", () => {
    it("should launch Edge browser", async () => {
      const edge = await launchEdge("about:blank", { closeAfter: false });
      expect(edge).toBeDefined();
      expect(edge.pid).toBeGreaterThan(0);
      expect(edge.debugPort).toBe(9222);
      edge.close();
    }, 15000);

    it("should launch Edge with specific URL", async () => {
      const edge = await launchEdge("https://www.bing.com", { closeAfter: false });
      expect(edge).toBeDefined();
      expect(edge.pid).toBeGreaterThan(0);
      await sleep(2000);
      edge.close();
    }, 15000);
  });

  describe("Gmail Automation", () => {
    const gmail = new GmailAutomation();

    it("should check Gmail unread emails", async () => {
      const result = await gmail.checkUnread("test@gmail.com", { closeAfter: true });
      expect(result).toBeDefined();
      // May fail if not logged in, but should not throw
    }, 30000);

    it("should have GmailAutomation class", () => {
      expect(gmail).toBeInstanceOf(GmailAutomation);
    });
  });

  describe("Bilibili Automation", () => {
    const bilibili = new BilibiliAutomation();

    it("should search videos on Bilibili", async () => {
      const result = await bilibili.searchVideo("OpenOxygen", { closeAfter: true });
      expect(result).toBeDefined();
      expect(result.keyword).toBe("OpenOxygen");
    }, 30000);

    it("should have BilibiliAutomation class", () => {
      expect(bilibili).toBeInstanceOf(BilibiliAutomation);
    });
  });

  describe("GitHub Automation", () => {
    const github = new GitHubAutomation();

    it("should check GitHub notifications", async () => {
      const result = await github.checkNotifications("testuser");
      expect(result).toBeDefined();
      // May need login
    }, 30000);

    it("should view GitHub repository", async () => {
      const result = await github.viewRepository("microsoft", "vscode");
      expect(result).toBeDefined();
      expect(result.owner).toBe("microsoft");
      expect(result.repo).toBe("vscode");
    }, 30000);

    it("should have GitHubAutomation class", () => {
      expect(github).toBeInstanceOf(GitHubAutomation);
    });
  });
});
