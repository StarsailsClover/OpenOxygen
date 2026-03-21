/**
 * Edge Automation 测试套件
 */

import { describe, it, expect } from "vitest";
import { GmailAutomation, BilibiliAutomation, GitHubAutomation } from "../dist/execution/edge-automation/index.js";

describe("Edge Automation", () => {
  it("should have GmailAutomation class", () => {
    const gmail = new GmailAutomation();
    expect(gmail).toBeInstanceOf(GmailAutomation);
  });

  it("should have BilibiliAutomation class", () => {
    const bilibili = new BilibiliAutomation();
    expect(bilibili).toBeInstanceOf(BilibiliAutomation);
  });

  it("should have GitHubAutomation class", () => {
    const github = new GitHubAutomation();
    expect(github).toBeInstanceOf(GitHubAutomation);
  });
});
