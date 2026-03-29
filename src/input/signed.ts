/**
 * OpenOxygen Phase 4 — Signed Input Sequences (26w11aE_P4)
 *
 * 签名输入序列：防篡改、防重放、可审计的输入操作链
 *
 * 安全模型：
 * 1. 每个输入序列签名 (HMAC-SHA256)
 * 2. Nonce 防重放
 * 3. 时间窗口验证
 * 4. 操作日志关联审计
 */

import { createHmac, randomBytes } from "node:crypto";
import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";

const log = createSubsystemLogger("input/signed");

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type InputActionType =
  | "click"
  | "move"
  | "type"
  | "hotkey"
  | "scroll"
  | "wait"
  | "smooth_move"
  | "smooth_click";

export interface InputAction {
  type: InputActionType;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface SignedInputSequence {
  id: string;
  actions: InputAction[];
  signature: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
  issuer: string;
  version: number;
}

export interface SignedInputConfig {
  secretKey: string;
  maxSequenceLength: number;
  maxAgeSec: number; // 签名有效期
  replayWindowSec: number; // 重放检测窗口
}

// ═══════════════════════════════════════════════════════════════════════════
// Nonce Registry — 防重放
// ═══════════════════════════════════════════════════════════════════════════

class NonceRegistry {
  private seen = new Map<string, number>(); // nonce → expiry timestamp
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(windowMs = 300_000) {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  register(nonce: string, expiresAt: number): boolean {
    if (this.seen.has(nonce)) {
      log.warn(`Replay detected: nonce ${nonce} already used`);
      return false; // 重放攻击
    }
    this.seen.set(nonce, expiresAt);
    return true;
  }

  private cleanup(): void {
    const now = nowMs();
    for (const [nonce, expiry] of this.seen) {
      if (expiry < now) this.seen.delete(nonce);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Signed Input Manager
// ═══════════════════════════════════════════════════════════════════════════

export class SignedInputManager {
  private config: SignedInputConfig;
  private nonceRegistry: NonceRegistry;
  private executionLog: Array<{
    sequenceId: string;
    action: InputAction;
    result: boolean;
    timestamp: number;
  }> = [];

  constructor(config?: Partial<SignedInputConfig>) {
    this.config = {
      secretKey: config?.secretKey || randomBytes(32).toString("hex"),
      maxSequenceLength: config?.maxSequenceLength || 50,
      maxAgeSec: config?.maxAgeSec || 300,
      replayWindowSec: config?.replayWindowSec || 600,
    };
    this.nonceRegistry = new NonceRegistry(this.config.replayWindowSec * 1000);
  }

  /**
   * 创建签名输入序列
   */
  createSequence(
    actions: Array<Omit<InputAction, "timestamp">>,
  ): SignedInputSequence {
    if (actions.length > this.config.maxSequenceLength) {
      throw new Error(
        `Sequence too long: ${actions.length} > ${this.config.maxSequenceLength}`,
      );
    }

    const now = nowMs();
    const timedActions: InputAction[] = actions.map((a, i) => ({
      ...a,
      timestamp: now + i * 50, // 每个动作间隔 50ms 的预计时间戳
    }));

    const sequence: SignedInputSequence = {
      id: generateId("seq"),
      actions: timedActions,
      signature: "",
      nonce: randomBytes(16).toString("hex"),
      createdAt: now,
      expiresAt: now + this.config.maxAgeSec * 1000,
      issuer: "openoxygen",
      version: 1,
    };

    // 计算签名
    sequence.signature = this.sign(sequence);

    log.info(
      `Signed sequence ${sequence.id}: ${actions.length} actions, expires in ${this.config.maxAgeSec}s`,
    );
    return sequence;
  }

  /**
   * 验证签名输入序列
   */
  verify(sequence: SignedInputSequence): { valid: boolean; reason?: string } {
    // 1. 版本检查
    if (sequence.version !== 1) {
      return {
        valid: false,
        reason: `Unsupported version: ${sequence.version}`,
      };
    }

    // 2. 过期检查
    if (nowMs() > sequence.expiresAt) {
      return { valid: false, reason: "Sequence expired" };
    }

    // 3. 签名验证
    const expectedSig = this.sign(sequence);
    if (sequence.signature !== expectedSig) {
      return { valid: false, reason: "Invalid signature (tampered)" };
    }

    // 4. 重放检测
    if (!this.nonceRegistry.register(sequence.nonce, sequence.expiresAt)) {
      return { valid: false, reason: "Replay attack detected" };
    }

    // 5. 序列长度检查
    if (sequence.actions.length > this.config.maxSequenceLength) {
      return { valid: false, reason: "Sequence too long" };
    }

    return { valid: true };
  }

  /**
   * 执行签名序列（验证后执行）
   */
  async execute(
    sequence: SignedInputSequence,
    executor: (action: InputAction) => Promise<boolean>,
  ): Promise<{
    success: boolean;
    executed: number;
    failed: number;
    error?: string;
  }> {
    // 验证
    const verification = this.verify(sequence);
    if (!verification.valid) {
      log.error(`Sequence ${sequence.id} rejected: ${verification.reason}`);
      return {
        success: false,
        executed: 0,
        failed: 0,
        error: verification.reason,
      };
    }

    // 执行
    let executed = 0;
    let failedCount = 0;

    for (const action of sequence.actions) {
      try {
        const result = await executor(action);
        this.executionLog.push({
          sequenceId: sequence.id,
          action,
          result,
          timestamp: nowMs(),
        });
        if (result) {
          executed++;
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
        log.error(`Action ${action.type} failed:`, err);
      }
    }

    log.info(
      `Sequence ${sequence.id}: ${executed} executed, ${failedCount} failed`,
    );
    return { success: failedCount === 0, executed, failed: failedCount };
  }

  /**
   * 获取执行日志
   */
  getExecutionLog(sequenceId?: string): typeof this.executionLog {
    if (sequenceId) {
      return this.executionLog.filter((l) => l.sequenceId === sequenceId);
    }
    return [...this.executionLog];
  }

  private sign(sequence: SignedInputSequence): string {
    const payload = JSON.stringify({
      id: sequence.id,
      actions: sequence.actions,
      nonce: sequence.nonce,
      createdAt: sequence.createdAt,
      expiresAt: sequence.expiresAt,
      issuer: sequence.issuer,
      version: sequence.version,
    });

    return createHmac("sha256", this.config.secretKey)
      .update(payload)
      .digest("hex");
  }

  destroy(): void {
    this.nonceRegistry.destroy();
  }
}
