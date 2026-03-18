import { describe, it, expect } from "vitest";
import { extractJSON, regexFallback } from "../../src/inference/structured/index.js";

describe("extractJSON", () => {
  it("parses direct JSON", () => {
    const r = extractJSON('{"action":"click","x":100}');
    expect(r).toEqual({ action: "click", x: 100 });
  });

  it("extracts JSON embedded in text", () => {
    const r = extractJSON('Some text {"action":"click","x":100} more text');
    expect(r).not.toBeNull();
    expect((r as any).action).toBe("click");
  });

  it("handles nested objects", () => {
    const r = extractJSON('{"a":"click","params":{"x":100,"y":200}}');
    expect(r).not.toBeNull();
    expect((r as any).params.x).toBe(100);
  });

  it("extracts from code block", () => {
    const r = extractJSON('```json\n{"action":"terminal"}\n```');
    expect(r).not.toBeNull();
    expect((r as any).action).toBe("terminal");
  });

  it("returns null for empty string", () => {
    expect(extractJSON("")).toBeNull();
  });

  it("returns null for no JSON", () => {
    expect(extractJSON("just plain text")).toBeNull();
  });

  it("extracts from LLM thinking text", () => {
    const thinking = 'The user wants to click. Here is the JSON: {"action":"gui_click","target":"button","params":{"x":500,"y":300}} That should work.';
    const r = extractJSON(thinking);
    expect(r).not.toBeNull();
    expect((r as any).action).toBe("gui_click");
  });
});

describe("regexFallback", () => {
  it("extracts quoted fields", () => {
    const r = regexFallback('"action": "click", "target": "button"', ["action", "target"]);
    expect(r).not.toBeNull();
    expect(r!.action).toBe("click");
    expect(r!.target).toBe("button");
  });

  it("extracts numeric fields", () => {
    const r = regexFallback('"confidence": 0.85', ["confidence"]);
    expect(r).not.toBeNull();
    expect(r!.confidence).toBe("0.85");
  });

  it("returns null for no matches", () => {
    const r = regexFallback("nothing here", ["action"]);
    expect(r).toBeNull();
  });
});
