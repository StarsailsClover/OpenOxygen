/**
 * Type Safe File Reader
 * 将浮点数参数转换为整数后再调用 Read 工具
 */

import { readFileSync } from "node:fs";

/**
 * 安全地读取文件，自动转换参数类型
 * @param {string} path - 文件路径
 * @param {number} limit - 读取行数限制 (会被转换为整数)
 * @param {number} offset - 起始偏移 (会被转换为整数)
 */
export function safeRead(path, limit, offset) {
    // 转换为整数
    const intLimit = limit ? Math.floor(Number(limit)) : undefined;
    const intOffset = offset ? Math.floor(Number(offset)) : undefined;
    
    console.log(`Reading: ${path}`);
    console.log(`  limit: ${limit} -> ${intLimit}`);
    console.log(`  offset: ${offset} -> ${intOffset}`);
    
    // 读取文件
    const content = readFileSync(path, "utf-8");
    const lines = content.split("\n");
    
    // 应用 offset
    const startLine = intOffset || 0;
    const endLine = intLimit ? startLine + intLimit : lines.length;
    
    return lines.slice(startLine, endLine).join("\n");
}

// CLI usage
if (process.argv[2]) {
    const path = process.argv[2];
    const limit = process.argv[3] ? parseInt(process.argv[3]) : undefined;
    const offset = process.argv[4] ? parseInt(process.argv[4]) : undefined;
    
    console.log(safeRead(path, limit, offset));
}
