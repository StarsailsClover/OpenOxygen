import { describe, it, expect } from "vitest";
import { analyzeTask } from "../../src/execution/unified/index.js";

describe("analyzeTask", () => {
  it("routes npm commands to terminal", () => {
    const s = analyzeTask("npm install && npm run build");
    expect(s.mode).toBe("terminal");
  });

  it("routes git commands to terminal", () => {
    const s = analyzeTask("git status");
    expect(s.mode).toBe("terminal");
  });

  it("routes bilibili to browser", () => {
    const s = analyzeTask("打开 bilibili.com 搜索视频");
    expect(s.mode).toBe("browser");
  });

  it("routes URL to browser", () => {
    const s = analyzeTask("open https://github.com");
    expect(s.mode).toBe("browser");
  });

  it("routes click to gui", () => {
    const s = analyzeTask("点击微信的搜索按�?);
    expect(s.mode).toBe("gui");
  });

  it("routes unknown to hybrid", () => {
    const s = analyzeTask("do something random");
    expect(s.mode).toBe("hybrid");
  });

  it("returns confidence > 0", () => {
    const s = analyzeTask("npm install");
    expect(s.confidence).toBeGreaterThan(0);
  });

  it("returns reason string", () => {
    const s = analyzeTask("npm install");
    expect(s.reason).toBeTruthy();
  });
});
