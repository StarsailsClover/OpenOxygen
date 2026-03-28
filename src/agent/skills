/**
 * OpenOxygen — 26w13aA: OUV Training Memory System
 *
 * 视觉操作经验记忆：
 * - 每次操作记录：截图路径、UIA 元素快照、VLM 描述、操作动作、操作结果
 * - 按应用/网站分类存储
 * - 支持检索"某个应用的搜索框通常在哪里"等空间经验
 * - 为 OUV + qwen3-vl 提供 few-shot 参考
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const MEMORY_DIR = "D:\\Coding\\OpenOxygen\\.state\\ouv-training";
const MEMORY_FILE = `${MEMORY_DIR}\\visual-memory.json`;

if (!existsSync(MEMORY_DIR)) mkdirSync(MEMORY_DIR, { recursive: true });

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * 单次视觉操作经验
 */
export class VisualExperience {
  constructor(data) {
    this.id = data.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.timestamp = data.timestamp || Date.now();
    this.app = data.app;                     // "bilibili" | "baidu" | "vscode" | "wechat" ...
    this.appType = data.appType;             // "browser" | "desktop" | "system"
    this.pageUrl = data.pageUrl || null;     // 浏览器 URL
    this.windowTitle = data.windowTitle;
    this.screenshotPath = data.screenshotPath || null;

    // 空间记忆：元素在哪里
    this.elements = data.elements || [];     // [{name, type, x, y, w, h, confidence}]
    this.landmarks = data.landmarks || [];   // 关键参考物 [{name, relativePosition, description}]

    // 操作记忆：做了什么，结果如何
    this.action = data.action;               // {type: "click"|"type"|"scroll", target, params}
    this.intent = data.intent;               // "找到搜索框并输入关键词"
    this.result = data.result;               // "success" | "partial" | "fail"
    this.resultDetail = data.resultDetail;   // "搜索结果页面已加载" | "点击了错误的元素"

    // VLM 描述
    this.vlmDescription = data.vlmDescription || null;

    // 反思
    this.reflection = data.reflection || null; // {issue, correction, lesson}
  }
}

/**
 * 视觉经验记忆库
 */
export class VisualMemoryStore {
  constructor() {
    this.experiences = [];
    this.appIndex = {};     // app → [experience ids]
    this.elementIndex = {}; // "搜索框" → [{app, avgX, avgY, count}]
    this.load();
  }

  load() {
    if (existsSync(MEMORY_FILE)) {
      try {
        const data = JSON.parse(readFileSync(MEMORY_FILE, "utf-8"));
        this.experiences = data.experiences || [];
        this.appIndex = data.appIndex || {};
        this.elementIndex = data.elementIndex || {};
        console.log(`    📚 Loaded ${this.experiences.length} visual experiences`);
      } catch {
        console.log("    ⚠ Memory file corrupted, starting fresh");
      }
    }
  }

  save() {
    writeFileSync(MEMORY_FILE, JSON.stringify({
      version: "26w13aA",
      updatedAt: Date.now(),
      experiences: this.experiences,
      appIndex: this.appIndex,
      elementIndex: this.elementIndex,
    }, null, 2));
  }

  /**
   * 记录一次视觉操作经验
   */
  record(exp) {
    const experience = new VisualExperience(exp);
    this.experiences.push(experience);

    // 更新应用索引
    if (!this.appIndex[experience.app]) this.appIndex[experience.app] = [];
    this.appIndex[experience.app].push(experience.id);

    // 更新元素空间索引
    for (const el of experience.elements) {
      const key = this.normalizeElementName(el.name || el.type);
      if (!this.elementIndex[key]) {
        this.elementIndex[key] = [];
      }
      this.elementIndex[key].push({
        app: experience.app,
        x: el.x, y: el.y, w: el.w, h: el.h,
        confidence: el.confidence || 1.0,
        timestamp: experience.timestamp,
      });
    }

    this.save();
    return experience;
  }

  /**
   * 查询某个应用中某类元素的历史位置
   * 例如：queryElementPosition("bilibili", "搜索框")
   */
  queryElementPosition(app, elementName) {
    const key = this.normalizeElementName(elementName);
    const entries = (this.elementIndex[key] || [])
      .filter(e => !app || e.app === app)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (entries.length === 0) return null;

    // 计算加权平均位置（最近的经验权重更高）
    let totalWeight = 0;
    let avgX = 0, avgY = 0;
    for (let i = 0; i < Math.min(entries.length, 5); i++) {
      const weight = 1 / (i + 1); // 最近的权重最高
      avgX += entries[i].x * weight;
      avgY += entries[i].y * weight;
      totalWeight += weight;
    }

    return {
      x: Math.round(avgX / totalWeight),
      y: Math.round(avgY / totalWeight),
      confidence: Math.min(entries.length / 3, 1.0), // 3次以上经验 → 高置信度
      sampleCount: entries.length,
      latest: entries[0],
    };
  }

  /**
   * 获取某个应用的所有经验（用于 few-shot 参考）
   */
  getAppExperiences(app, limit = 10) {
    const ids = this.appIndex[app] || [];
    return ids
      .slice(-limit)
      .map(id => this.experiences.find(e => e.id === id))
      .filter(Boolean);
  }

  /**
   * 获取操作失败的经验（用于避免重复错误）
   */
  getFailures(app) {
    return this.getAppExperiences(app, 50)
      .filter(e => e.result === "fail" || e.result === "partial");
  }

  /**
   * 生成某个应用的空间认知摘要（给 LLM 的 few-shot context）
   */
  generateSpatialContext(app) {
    const exps = this.getAppExperiences(app, 20);
    if (exps.length === 0) return `No prior experience with ${app}.`;

    const landmarks = {};
    for (const exp of exps) {
      for (const lm of (exp.landmarks || [])) {
        if (!landmarks[lm.name]) landmarks[lm.name] = [];
        landmarks[lm.name].push(lm);
      }
    }

    const failures = this.getFailures(app);
    const failNotes = failures.map(f => f.reflection?.lesson).filter(Boolean);

    let ctx = `Prior experience with ${app} (${exps.length} interactions):\n`;
    if (Object.keys(landmarks).length > 0) {
      ctx += `Known landmarks: ${Object.keys(landmarks).join(", ")}\n`;
    }
    if (failNotes.length > 0) {
      ctx += `Lessons learned: ${failNotes.slice(-3).join("; ")}\n`;
    }
    return ctx;
  }

  normalizeElementName(name) {
    return (name || "").toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^\w\u4e00-\u9fff]/g, "");
  }

  get stats() {
    return {
      totalExperiences: this.experiences.length,
      apps: Object.keys(this.appIndex).length,
      elements: Object.keys(this.elementIndex).length,
      successRate: this.experiences.length > 0
        ? this.experiences.filter(e => e.result === "success").length / this.experiences.length
        : 0,
    };
  }
}
