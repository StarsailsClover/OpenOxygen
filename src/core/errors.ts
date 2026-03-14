/**
 * OpenOxygen — Error Code System (26w12aA)
 *
 * 统一错误码体系
 */

export enum ErrorCode {
  // 1xxx — Gateway
  GATEWAY_NOT_READY = 1001,
  GATEWAY_AUTH_FAILED = 1002,
  GATEWAY_RATE_LIMITED = 1003,
  GATEWAY_BODY_TOO_LARGE = 1004,
  GATEWAY_INVALID_JSON = 1005,
  GATEWAY_ROUTE_NOT_FOUND = 1006,

  // 2xxx — Inference
  INFERENCE_NO_ENGINE = 2001,
  INFERENCE_NO_MODEL = 2002,
  INFERENCE_TIMEOUT = 2003,
  INFERENCE_PROVIDER_ERROR = 2004,
  INFERENCE_PROMPT_INJECTION = 2005,
  INFERENCE_MODEL_UNAVAILABLE = 2006,

  // 3xxx — Execution
  EXECUTION_PERMISSION_DENIED = 3001,
  EXECUTION_TIMEOUT = 3002,
  EXECUTION_SANDBOX_ERROR = 3003,
  EXECUTION_NATIVE_ERROR = 3004,
  EXECUTION_INPUT_BLOCKED = 3005,

  // 4xxx — Vision
  VISION_CAPTURE_FAILED = 4001,
  VISION_ELEMENT_NOT_FOUND = 4002,
  VISION_MODEL_ERROR = 4003,
  VISION_COMPRESSION_ERROR = 4004,

  // 5xxx — Storage
  STORAGE_DB_ERROR = 5001,
  STORAGE_WRITE_FAILED = 5002,
  STORAGE_READ_FAILED = 5003,
  STORAGE_QUOTA_EXCEEDED = 5004,

  // 6xxx — Plugin
  PLUGIN_LOAD_FAILED = 6001,
  PLUGIN_PERMISSION_DENIED = 6002,
  PLUGIN_INTEGRITY_FAILED = 6003,
  PLUGIN_NOT_FOUND = 6004,

  // 7xxx — Task
  TASK_NOT_FOUND = 7001,
  TASK_ALREADY_CANCELLED = 7002,
  TASK_PLAN_FAILED = 7003,
  TASK_STEP_FAILED = 7004,

  // 9xxx — Internal
  INTERNAL_ERROR = 9001,
  INTERNAL_NOT_IMPLEMENTED = 9002,
}

export interface OxygenError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
}

export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string,
): OxygenError {
  return {
    code,
    message,
    details,
    timestamp: Date.now(),
    requestId,
  };
}

export function errorToHttp(error: OxygenError): { status: number; body: unknown } {
  let status: number;
  if (error.code >= 1001 && error.code <= 1006) {
    status = error.code === 1002 ? 401 : error.code === 1003 ? 429 : error.code === 1004 ? 413 : error.code === 1006 ? 404 : 400;
  } else if (error.code >= 2001 && error.code <= 2006) {
    status = error.code === 2001 || error.code === 2006 ? 503 : error.code === 2005 ? 400 : 502;
  } else if (error.code >= 3001 && error.code <= 3005) {
    status = error.code === 3001 ? 403 : 500;
  } else {
    status = 500;
  }

  return {
    status,
    body: {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: error.requestId,
      },
    },
  };
}
