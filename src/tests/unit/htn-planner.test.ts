/**
 * HTN Planner Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HTNPlanner,
  HTNDomainBuilder,
  type HTNPrimitiveTask,
  type HTNCompoundTask,
  type HTNMethod,
} from "../../planning/htn/index.js";
import type { ToolResult } from "../../types/index.js";

describe("HTN Planner", () => {
  describe("HTNDomainBuilder", () => {
    it("should build domain with primitive tasks", () => {
      const builder = new HTNDomainBuilder("test-domain");
      const mockExecutor = async (): Promise<ToolResult> => ({
        success: true,
        data: "executed",
      });

      const domain = builder
        .addPrimitiveTask("task1", "action1", mockExecutor)
        .addPrimitiveTask("task2", "action2", mockExecutor)
        .setInitialState({ key: "value" })
        .build();

      expect(domain.name).toBe("test-domain");
      expect(domain.tasks.size).toBe(2);
      expect(domain.initialState).toEqual({ key: "value" });
    });

    it("should build domain with compound tasks", () => {
      const builder = new HTNDomainBuilder("test-domain");
      const mockExecutor = async (): Promise<ToolResult> => ({
        success: true,
      });

      const method: HTNMethod = {
        id: "method1",
        name: "Method 1",
        subtasks: [],
      };

      const domain = builder
        .addPrimitiveTask("primitive", "action", mockExecutor)
        .addCompoundTask("compound", [method])
        .build();

      expect(domain.tasks.size).toBe(2);
    });
  });

  describe("HTNPlanner", () => {
    it("should plan primitive task", async () => {
      const builder = new HTNDomainBuilder("test");
      const mockExecutor = async (): Promise<ToolResult> => ({
        success: true,
      });

      const domain = builder
        .addPrimitiveTask("simple-task", "action", mockExecutor)
        .build();

      const planner = new HTNPlanner(domain);
      const result = await planner.plan("simple-task");

      expect(result.success).toBe(true);
      expect(result.plan?.tasks).toHaveLength(1);
    });

    it("should fail for non-existent task", async () => {
      const builder = new HTNDomainBuilder("test");
      const domain = builder.build();

      const planner = new HTNPlanner(domain);
      const result = await planner.plan("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should check preconditions", async () => {
      const builder = new HTNDomainBuilder("test");
      const mockExecutor = async (): Promise<ToolResult> => ({
        success: true,
      });

      const domain = builder
        .addPrimitiveTask("conditional-task", "action", mockExecutor, {
          preconditions: [
            { type: "equals", field: "ready", value: true },
          ],
        })
        .setInitialState({ ready: false })
        .build();

      const planner = new HTNPlanner(domain);
      const result = await planner.plan("conditional-task");

      expect(result.success).toBe(false);
    });
  });
});
