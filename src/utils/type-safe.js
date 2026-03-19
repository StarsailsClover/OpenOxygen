/**
 * Type Safe Utilities
 * 解决 JSON number -> Go int32 类型转换问题
 * 确保所有整数参数在传递给 Go 前已转换为整数类型
 */

/**
 * 将值安全转换为整数
 * @param {*} value - 输入值
 * @param {number} defaultValue - 默认值
 * @returns {number} - 整数
 */
export function toInt(value, defaultValue = 0) {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  const num = Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  return Math.floor(num);
}

/**
 * 将值安全转换为 int32
 * @param {*} value - 输入值
 * @returns {number} - 32位整数
 */
export function toInt32(value) {
  const num = toInt(value);
  // 确保在 int32 范围内
  if (num > 2147483647) return 2147483647;
  if (num < -2147483648) return -2147483648;
  return num;
}

/**
 * 创建类型安全的参数对象
 * @param {Object} params - 原始参数
 * @param {string[]} intFields - 需要转为整数的字段名
 * @returns {Object} - 类型安全的参数
 */
export function safeParams(params, intFields = []) {
  const result = { ...params };
  for (const field of intFields) {
    if (field in result) {
      result[field] = toInt32(result[field]);
    }
  }
  return result;
}

/**
 * 文件读取参数类型安全转换
 * @param {Object} args - 文件读取参数
 * @returns {Object} - 类型安全的参数
 */
export function safeReadParams(args) {
  return safeParams(args, ['offset', 'limit']);
}

/**
 * 分页参数类型安全转换
 * @param {Object} args - 分页参数
 * @returns {Object} - 类型安全的参数
 */
export function safePaginationParams(args) {
  return safeParams(args, ['page', 'pageSize', 'skip', 'take']);
}
