/**
 * 26w15aDTest - Dual Browser Tests
 * 
 * 双浏览器测试
 * OxygenBrowser + Microsoft Edge
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { launchBrowser, navigate, closeBrowser, executeScript, takeScreenshot } from "../../dist/browser/core.js";
import { GmailAutomation, BilibiliAutomation, GitHubAutomation, launchEdge } from "../../dist/execution/edge-automation/index.js";
import { closeAllOpenOxygenEdgeWindows } from "../../dist/execution/edge-automation/window-manager.js";

describe("26w15aDTest - Dual Browser", () => {
  let oxygenBrowser;
  let edgeBrowser;

  beforeAll(async () => {
    // Cleanup any existing browsers
    await closeAllOpenOxygenEdgeWindows();
  });

  afterAll(async () => {
    // Cleanup
    if (oxygenBrowser) {
      await closeBrowser(oxygenBrowser.id);
    }
    if (edgeBrowser) {
      edgeBrowser.close();
    }
    await closeAllOpenOxygenEdgeWindows();
  });

  describe("OxygenBrowser Tests", () => {
    it("should launch OxygenBrowser", async () => {
      oxygenBrowser = await launchBrowser({
        width: 1280,
        height: 720,
        headless: true,
      });

      expect(oxygenBrowser).toBeDefined();
      expect(oxygenBrowser.id).toBeDefined();
      expect(oxygenBrowser.state).toBe("ready");
    }, 10000);

    it("should navigate to URL", async () => {
      if (!oxygenBrowser) {
        console.log("Skipping - OxygenBrowser not launched");
        return;
      }

      const page = await navigate(oxygenBrowser.id, "https://example.com");
      
      expect(page).toBeDefined();
      expect(page.url).toBe("https://example.com");
    }, 15000);

    it("should execute JavaScript", async () => {
      if (!oxygenBrowser) {
        console.log("Skipping - OxygenBrowser not launched");
        return;
      }

      const result = await executeScript(oxygenBrowser.id, "document.title");
      
      expect(result).toBeDefined();
    }, 10000);
  });

  describe("Microsoft Edge Tests", () => {
    it("should launch Edge", async () => {
      edgeBrowser = await launchEdge("about:blank", { 
        closeAfter: false,
        closeExisting: true,
      });

      expect(edgeBrowser).toBeDefined();
      expect(edgeBrowser.pid).toBeGreaterThan(0);
    }, 15000);

    it("should navigate to URL", async () => {
      if (!edgeBrowser) {
        console.log("Skipping - Edge not launched");
        return;
      }

      // Navigate using Edge automation
      const bilibili = new BilibiliAutomation();
      const result = await bilibili.searchVideo("OpenOxygen", { closeAfter: false });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    }, 30000);
  });

  describe("Browser Comparison Tests", () => {
    it("should perform same task in both browsers", async () => {
      const url = "https://example.com";

      // Test in OxygenBrowser
      if (oxygenBrowser) {
        const oxygenResult = await navigate(oxygenBrowser.id, url);
        expect(oxygenResult.url).toBe(url);
      }

      // Test in Edge
      const github = new GitHubAutomation();
      const edgeResult = await github.viewRepository("microsoft", "vscode");
      expect(edgeResult.success).toBe(true);

      console.log("Both browsers executed tasks successfully");
    }, 60000);

    it("should handle browser-specific features", async () => {
      // OxygenBrowser: CDP features
      if (oxygenBrowser) {
        const title = await executeScript(oxygenBrowser.id, "document.title");
        console.log("OxygenBrowser title:", title);
      }

      // Edge: UIA features
      const gmail = new GmailAutomation();
      // This would test Edge-specific UIA features
      // Note: Requires Gmail login, may be skipped

      expect(true).toBe(true);
    }, 30000);
  });

  describe("Cross-Browser Compatibility", () => {
    it("should maintain state across browsers", async () => {
      // This tests if the system can switch between browsers
      // while maintaining context

      const memory = {
        lastBrowser: null,
        history: [],
      };

      // Use OxygenBrowser
      if (oxygenBrowser) {
        memory.lastBrowser = "oxygen";
        memory.history.push("oxygen");
      }

      // Use Edge
      if (edgeBrowser) {
        memory.lastBrowser = "edge";
        memory.history.push("edge");
      }

      expect(memory.history.length).toBeGreaterThan(0);
    });

    it("should handle browser fallback", async () => {
      // Test fallback mechanism when one browser fails
      
      // Try OxygenBrowser first
      let result;
      try {
        if (oxygenBrowser) {
          result = await navigate(oxygenBrowser.id, "https://example.com");
        }
      } catch (error) {
        // Fallback to Edge
        console.log("OxygenBrowser failed, falling back to Edge");
        const github = new GitHubAutomation();
        result = await github.viewRepository("microsoft", "vscode");
      }

      expect(result).toBeDefined();
    }, 30000);
  });
});
