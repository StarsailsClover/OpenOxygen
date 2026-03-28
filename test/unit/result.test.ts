import { describe, it, expect } from "vitest";
import { ok, err, ErrorCodes } from "../../src/core/result.js";

describe("OxygenResult", () => {
  it("ok() returns success result", () => {
    const result = ok("hello");
    expect(result.ok).toBe(true);
    expect(result.data).toBe("hello");
    expect(result.error).toBeUndefined();
  });

  it("ok() with no data", () => {
    const result = ok();
    expect(result.ok).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("err() returns failure result", () => {
    const result = err("something broke", ErrorCodes.NATIVE_NOT_FOUND);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("something broke");
    expect(result.code).toBe("OXY_N001");
  });

  it("err() with metadata", () => {
    const result = err("timeout", ErrorCodes.LLM_TIMEOUT, { durationMs: 5000 });
    expect(result.ok).toBe(false);
    expect(result.durationMs).toBe(5000);
  });

  it("ErrorCodes are unique strings", () => {
    const codes = Object.values(ErrorCodes);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});
