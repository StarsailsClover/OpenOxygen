/**
 * Document Generator 测试套件 (Vitest 标准格式)
 * 26w15aC Phase 4 验证
 */

import { describe, it, expect } from "vitest";
import { DocumentGenerator } from "../dist/tasks/document-generator.js";

describe("Document Generator", () => {
  const generator = new DocumentGenerator();

  it("should have default templates", () => {
    expect(generator.templates.has("report")).toBe(true);
    expect(generator.templates.has("daily")).toBe(true);
  });

  it("should generate daily report", async () => {
    const result = await generator.generateDailyReport({
      date: "2026-03-19",
      tasks: ["任务A", "任务B"],
      progress: "正常",
      issues: "无",
      plans: ["计划C"],
    });
    expect(result.success).toBe(true);
  });

  it("should convert HTML to text", () => {
    const html = "<p>Hello</p>";
    const text = generator.htmlToText(html);
    expect(text).toContain("Hello");
  });
});
