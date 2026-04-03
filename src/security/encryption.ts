/**
 * Encryption Module
 *
 * Data encryption for sensitive information
 * Uses AES-256-GCM for symmetric encryption
 */

import { createSubsystemLogger } from "../logging/index.js";
import crypto from "node:crypto";

const log = createSubsystemLogger("security/encryption");

// === Encryption Types ===

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  algorithm: string;
}

export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
}

// === Encryption Service ===

export class EncryptionService {
  private masterKey?: Buffer;
  private config: EncryptionConfig = {
    algorithm: "aes-256-gcm",
    keySize: 32,
    ivSize: 16,
  };

  /**
   * Initialize with master key
   */
  initialize(masterKey: string | Buffer): void {
    if (typeof masterKey === "string") {
      // Derive key from string using SHA-256
      this.masterKey = crypto.scryptSync(
        masterKey,
        "salt",
        this.config.keySize,
      );
    } else {
      this.masterKey = masterKey;
    }

    log.info("Encryption service initialized");
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return !!this.masterKey;
  }

  /**
   * Encrypt data
   */
  encrypt(plaintext: string): EncryptedData {
    if (!this.masterKey) {
      throw new Error("Encryption service not initialized");
    }

    const iv = crypto.randomBytes(this.config.ivSize);
    const cipher = crypto.createCipheriv(
      this.config.algorithm,
      this.masterKey,
      iv,
    );

    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");

    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      algorithm: this.config.algorithm,
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encrypted: EncryptedData): string {
    if (!this.masterKey) {
      throw new Error("Encryption service not initialized");
    }

    const decipher = crypto.createDecipheriv(
      encrypted.algorithm,
      this.masterKey,
      Buffer.from(encrypted.iv, "base64"),
    );

    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));

    let plaintext = decipher.update(encrypted.ciphertext, "base64", "utf8");
    plaintext += decipher.final("utf8");

    return plaintext;
  }

  /**
   * Generate secure random key
   */
  generateKey(): Buffer {
    return crypto.randomBytes(this.config.keySize);
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Compare hash securely (timing-safe)
   */
  compareHash(data: string, hash: string): boolean {
    const computed = this.hash(data);
    
    if (computed.length !== hash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < computed.length; i++) {
      result |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
    }

    return result === 0;
  }
}

// === Factory ===

export function createEncryptionService(): EncryptionService {
  return new EncryptionService();
}

// === Exports ===

export { createEncryptionService, EncryptionService };
export default EncryptionService;
