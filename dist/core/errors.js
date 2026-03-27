/**
 * OpenOxygen — Error Code System (26w12aA)
 *
 * 统一错误码体系
 */
export var ErrorCode;
(function (ErrorCode) {
    // 1xxx — Gateway
    ErrorCode[ErrorCode["GATEWAY_NOT_READY"] = 1001] = "GATEWAY_NOT_READY";
    ErrorCode[ErrorCode["GATEWAY_AUTH_FAILED"] = 1002] = "GATEWAY_AUTH_FAILED";
    ErrorCode[ErrorCode["GATEWAY_RATE_LIMITED"] = 1003] = "GATEWAY_RATE_LIMITED";
    ErrorCode[ErrorCode["GATEWAY_BODY_TOO_LARGE"] = 1004] = "GATEWAY_BODY_TOO_LARGE";
    ErrorCode[ErrorCode["GATEWAY_INVALID_JSON"] = 1005] = "GATEWAY_INVALID_JSON";
    ErrorCode[ErrorCode["GATEWAY_ROUTE_NOT_FOUND"] = 1006] = "GATEWAY_ROUTE_NOT_FOUND";
    // 2xxx — Inference
    ErrorCode[ErrorCode["INFERENCE_NO_ENGINE"] = 2001] = "INFERENCE_NO_ENGINE";
    ErrorCode[ErrorCode["INFERENCE_NO_MODEL"] = 2002] = "INFERENCE_NO_MODEL";
    ErrorCode[ErrorCode["INFERENCE_TIMEOUT"] = 2003] = "INFERENCE_TIMEOUT";
    ErrorCode[ErrorCode["INFERENCE_PROVIDER_ERROR"] = 2004] = "INFERENCE_PROVIDER_ERROR";
    ErrorCode[ErrorCode["INFERENCE_PROMPT_INJECTION"] = 2005] = "INFERENCE_PROMPT_INJECTION";
    ErrorCode[ErrorCode["INFERENCE_MODEL_UNAVAILABLE"] = 2006] = "INFERENCE_MODEL_UNAVAILABLE";
    // 3xxx — Execution
    ErrorCode[ErrorCode["EXECUTION_PERMISSION_DENIED"] = 3001] = "EXECUTION_PERMISSION_DENIED";
    ErrorCode[ErrorCode["EXECUTION_TIMEOUT"] = 3002] = "EXECUTION_TIMEOUT";
    ErrorCode[ErrorCode["EXECUTION_SANDBOX_ERROR"] = 3003] = "EXECUTION_SANDBOX_ERROR";
    ErrorCode[ErrorCode["EXECUTION_NATIVE_ERROR"] = 3004] = "EXECUTION_NATIVE_ERROR";
    ErrorCode[ErrorCode["EXECUTION_INPUT_BLOCKED"] = 3005] = "EXECUTION_INPUT_BLOCKED";
    // 4xxx — Vision
    ErrorCode[ErrorCode["VISION_CAPTURE_FAILED"] = 4001] = "VISION_CAPTURE_FAILED";
    ErrorCode[ErrorCode["VISION_ELEMENT_NOT_FOUND"] = 4002] = "VISION_ELEMENT_NOT_FOUND";
    ErrorCode[ErrorCode["VISION_MODEL_ERROR"] = 4003] = "VISION_MODEL_ERROR";
    ErrorCode[ErrorCode["VISION_COMPRESSION_ERROR"] = 4004] = "VISION_COMPRESSION_ERROR";
    // 5xxx — Storage
    ErrorCode[ErrorCode["STORAGE_DB_ERROR"] = 5001] = "STORAGE_DB_ERROR";
    ErrorCode[ErrorCode["STORAGE_WRITE_FAILED"] = 5002] = "STORAGE_WRITE_FAILED";
    ErrorCode[ErrorCode["STORAGE_READ_FAILED"] = 5003] = "STORAGE_READ_FAILED";
    ErrorCode[ErrorCode["STORAGE_QUOTA_EXCEEDED"] = 5004] = "STORAGE_QUOTA_EXCEEDED";
    // 6xxx — Plugin
    ErrorCode[ErrorCode["PLUGIN_LOAD_FAILED"] = 6001] = "PLUGIN_LOAD_FAILED";
    ErrorCode[ErrorCode["PLUGIN_PERMISSION_DENIED"] = 6002] = "PLUGIN_PERMISSION_DENIED";
    ErrorCode[ErrorCode["PLUGIN_INTEGRITY_FAILED"] = 6003] = "PLUGIN_INTEGRITY_FAILED";
    ErrorCode[ErrorCode["PLUGIN_NOT_FOUND"] = 6004] = "PLUGIN_NOT_FOUND";
    // 7xxx — Task
    ErrorCode[ErrorCode["TASK_NOT_FOUND"] = 7001] = "TASK_NOT_FOUND";
    ErrorCode[ErrorCode["TASK_ALREADY_CANCELLED"] = 7002] = "TASK_ALREADY_CANCELLED";
    ErrorCode[ErrorCode["TASK_PLAN_FAILED"] = 7003] = "TASK_PLAN_FAILED";
    ErrorCode[ErrorCode["TASK_STEP_FAILED"] = 7004] = "TASK_STEP_FAILED";
    // 9xxx — Internal
    ErrorCode[ErrorCode["INTERNAL_ERROR"] = 9001] = "INTERNAL_ERROR";
    ErrorCode[ErrorCode["INTERNAL_NOT_IMPLEMENTED"] = 9002] = "INTERNAL_NOT_IMPLEMENTED";
})(ErrorCode || (ErrorCode = {}));
export function createError(code, message, details, requestId) {
    return {
        code,
        message,
        details,
        timestamp: Date.now(),
        requestId,
    };
}
export function errorToHttp(error) {
    let status;
    if (error.code >= 1001 && error.code <= 1006) {
        status = error.code === 1002 ? 401 : error.code === 1003 ? 429 : error.code === 1004 ? 413 : error.code === 1006 ? 404 : 400;
    }
    else if (error.code >= 2001 && error.code <= 2006) {
        status = error.code === 2001 || error.code === 2006 ? 503 : error.code === 2005 ? 400 : 502;
    }
    else if (error.code >= 3001 && error.code <= 3005) {
        status = error.code === 3001 ? 403 : 500;
    }
    else {
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
//# sourceMappingURL=errors.js.map