/**
 * Skill System Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  listFiles,
  readFile,
  writeFile,
  createDirectory,
  deleteFile,
} from "../../skills/system/index.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, "..", "..", "..", ".test-temp");

describe("System Skills", () => {
  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore
    }
    await fs.promises.mkdir(TEST_DIR, { recursive: true });
  });

  describe("File Operations", () => {
    it("should create and read a file", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      const content = "Hello, World!";

      const writeResult = await writeFile(testFile, content);
      expect(writeResult.success).toBe(true);

      const readResult = await readFile(testFile);
      expect(readResult.success).toBe(true);
      expect(readResult.data).toEqual({ path: testFile, content });
    });

    it("should list files in directory", async () => {
      // Create test files
      await fs.promises.writeFile(path.join(TEST_DIR, "file1.txt"), "content1");
      await fs.promises.writeFile(path.join(TEST_DIR, "file2.txt"), "content2");

      const result = await listFiles(TEST_DIR);
      expect(result.success).toBe(true);
      expect(result.data?.files).toHaveLength(2);
    });

    it("should create directory", async () => {
      const newDir = path.join(TEST_DIR, "new-directory");
      const result = await createDirectory(newDir);
      expect(result.success).toBe(true);

      const stats = await fs.promises.stat(newDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should delete file", async () => {
      const testFile = path.join(TEST_DIR, "to-delete.txt");
      await fs.promises.writeFile(testFile, "content");

      const result = await deleteFile(testFile);
      expect(result.success).toBe(true);

      await expect(fs.promises.access(testFile)).rejects.toThrow();
    });
  });
});
