import { NextResponse } from "next/server";
import { ApiResponse, ApiError } from "../types";
import { ValidationResult } from "./validation";

/**
 * 标准化的错误代码和消息映射
 */
export const ERROR_CODES = {
  // 客户端错误 (4xx)
  VALIDATION_ERROR: { status: 400, message: "请求参数验证失败" },
  INVALID_JSON: { status: 400, message: "请求体必须是有效的JSON格式" },
  INVALID_PARAMS: { status: 400, message: "请求参数无效" },
  INVALID_SESSION_ID: { status: 400, message: "会话ID格式无效" },
  INVALID_USER_ID: { status: 400, message: "用户ID格式无效" },
  INVALID_MESSAGE_ID: { status: 400, message: "消息ID格式无效" },
  MISSING_REQUIRED_FIELDS: { status: 400, message: "缺少必需字段" },
  INVALID_REFERENCE: { status: 400, message: "引用的资源不存在" },

  // 认证错误 (401)
  UNAUTHORIZED: { status: 401, message: "未授权访问" },
  INVALID_CREDENTIALS: { status: 401, message: "登录凭据无效" },
  TOKEN_EXPIRED: { status: 401, message: "认证令牌已过期" },
  TOKEN_INVALID: { status: 401, message: "认证令牌无效" },
  LOGIN_FAILED: { status: 401, message: "登录失败" },
  EMAIL_NOT_CONFIRMED: { status: 401, message: "邮箱尚未验证" },

  // 权限错误 (403)
  ACCESS_DENIED: { status: 403, message: "访问被拒绝" },
  INSUFFICIENT_PERMISSIONS: { status: 403, message: "权限不足" },
  ACCOUNT_DISABLED: { status: 403, message: "账户已被禁用" },
  RESOURCE_FORBIDDEN: { status: 403, message: "无权访问此资源" },

  // 资源不存在 (404)
  NOT_FOUND: { status: 404, message: "资源不存在" },
  SESSION_NOT_FOUND: { status: 404, message: "会话不存在" },
  MESSAGE_NOT_FOUND: { status: 404, message: "消息不存在" },
  USER_NOT_FOUND: { status: 404, message: "用户不存在" },

  // 方法不允许 (405)
  METHOD_NOT_ALLOWED: { status: 405, message: "请求方法不被允许" },

  // 冲突错误 (409)
  DUPLICATE_ENTRY: { status: 409, message: "资源已存在" },
  USER_EXISTS: { status: 409, message: "用户已存在" },
  CONFLICT: { status: 409, message: "资源冲突" },

  // 请求过多 (429)
  TOO_MANY_REQUESTS: { status: 429, message: "请求过于频繁，请稍后再试" },
  RATE_LIMIT_EXCEEDED: { status: 429, message: "请求频率超出限制" },

  // 服务器错误 (5xx)
  INTERNAL_ERROR: { status: 500, message: "服务器内部错误" },
  DATABASE_ERROR: { status: 500, message: "数据库操作失败" },
  SERVICE_UNAVAILABLE: { status: 503, message: "服务暂时不可用" },
  TIMEOUT: { status: 504, message: "请求超时" },
} as const;

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, { status });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  errorCode: keyof typeof ERROR_CODES | string,
  customMessage?: string,
  customStatus?: number,
  details?: any
): NextResponse {
  const errorInfo = ERROR_CODES[errorCode as keyof typeof ERROR_CODES];
  const status = customStatus || errorInfo?.status || 400;
  const message = customMessage || errorInfo?.message || "未知错误";

  const response: ApiError = {
    error: errorCode,
    message,
    status,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };

  // 记录错误日志
  logError(errorCode, message, status, details);

  return NextResponse.json(response, { status });
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  validationResult: ValidationResult,
  errorCode: string = "VALIDATION_ERROR"
): NextResponse {
  // Flatten field errors into a single array for the response
  const allErrors = [...validationResult.errors];
  if (validationResult.fieldErrors) {
    for (const [field, errors] of Object.entries(
      validationResult.fieldErrors
    )) {
      allErrors.push(...errors);
    }
  }

  return createErrorResponse(errorCode, "请求参数验证失败", 400, {
    validationErrors: allErrors,
    fieldErrors: validationResult.fieldErrors,
    fieldCount: allErrors.length,
  });
}

/**
 * 错误日志记录函数
 */
function logError(
  errorCode: string,
  message: string,
  status: number,
  details?: any
): void {
  const logLevel = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    level: logLevel,
    errorCode,
    message,
    status,
    ...(details && { details }),
  };

  // 在开发环境中输出到控制台
  if (process.env.NODE_ENV === "development") {
    console.error(
      `[${timestamp}] ${logLevel}: ${errorCode} - ${message}`,
      details || ""
    );
  }

  // 在生产环境中可以发送到日志服务
  // TODO: 集成外部日志服务 (如 Sentry, LogRocket 等)
}

/**
 * 格式化消息历史响应
 */
export function formatMessageHistoryResponse(messages: any[]): NextResponse {
  const history = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    workflow_stage: msg.work_stage,
  }));

  return createSuccessResponse({
    history,
    count: history.length,
    hasMessages: history.length > 0,
  });
}

/**
 * 增强的 API 错误处理包装器
 */
export function handleApiError(error: any, context?: string): NextResponse {
  // 记录详细的错误信息用于调试
  const errorDetails = {
    context,
    originalError: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  // Supabase 数据库错误处理
  if (error.code) {
    switch (error.code) {
      case "23505": // 唯一约束违反
        return createErrorResponse(
          "DUPLICATE_ENTRY",
          "资源已存在",
          409,
          errorDetails
        );
      case "23503": // 外键约束违反
        return createErrorResponse(
          "INVALID_REFERENCE",
          "引用的资源不存在",
          400,
          errorDetails
        );
      case "23502": // 非空约束违反
        return createErrorResponse(
          "MISSING_REQUIRED_FIELDS",
          "缺少必需字段",
          400,
          errorDetails
        );
      case "23514": // 检查约束违反
        return createErrorResponse(
          "VALIDATION_ERROR",
          "数据验证失败",
          400,
          errorDetails
        );
      case "PGRST116": // 行级安全策略违反
        return createErrorResponse(
          "ACCESS_DENIED",
          "访问被拒绝",
          403,
          errorDetails
        );
      case "PGRST301": // 资源不存在
        return createErrorResponse(
          "NOT_FOUND",
          "请求的资源不存在",
          404,
          errorDetails
        );
      case "08006": // 连接失败
        return createErrorResponse(
          "SERVICE_UNAVAILABLE",
          "数据库连接失败",
          503,
          errorDetails
        );
      case "57014": // 查询超时
        return createErrorResponse(
          "TIMEOUT",
          "数据库查询超时",
          504,
          errorDetails
        );
      default:
        return createErrorResponse(
          "DATABASE_ERROR",
          `数据库错误: ${error.message}`,
          500,
          errorDetails
        );
    }
  }

  // Supabase Auth 错误处理
  if (error.message) {
    if (error.message.includes("Invalid login credentials")) {
      return createErrorResponse(
        "INVALID_CREDENTIALS",
        "邮箱或密码错误",
        401,
        errorDetails
      );
    }

    if (error.message.includes("User already registered")) {
      return createErrorResponse(
        "USER_EXISTS",
        "该邮箱已被注册",
        409,
        errorDetails
      );
    }

    if (error.message.includes("Email not confirmed")) {
      return createErrorResponse(
        "EMAIL_NOT_CONFIRMED",
        "请先验证您的邮箱",
        401,
        errorDetails
      );
    }

    if (error.message.includes("Too many requests")) {
      return createErrorResponse(
        "TOO_MANY_REQUESTS",
        "请求过于频繁，请稍后再试",
        429,
        errorDetails
      );
    }

    if (error.message.includes("Account is disabled")) {
      return createErrorResponse(
        "ACCOUNT_DISABLED",
        "账户已被禁用，请联系管理员",
        403,
        errorDetails
      );
    }

    if (error.message.includes("Invalid JWT")) {
      return createErrorResponse(
        "TOKEN_INVALID",
        "认证令牌无效",
        401,
        errorDetails
      );
    }

    if (error.message.includes("JWT expired")) {
      return createErrorResponse(
        "TOKEN_EXPIRED",
        "认证令牌已过期，请重新登录",
        401,
        errorDetails
      );
    }
  }

  // 网络和超时错误
  if (error.name === "TimeoutError" || error.code === "ETIMEDOUT") {
    return createErrorResponse(
      "TIMEOUT",
      "请求超时，请稍后重试",
      504,
      errorDetails
    );
  }

  if (error.name === "NetworkError" || error.code === "ECONNREFUSED") {
    return createErrorResponse(
      "SERVICE_UNAVAILABLE",
      "服务暂时不可用",
      503,
      errorDetails
    );
  }

  // JSON 解析错误
  if (error instanceof SyntaxError && error.message.includes("JSON")) {
    return createErrorResponse(
      "INVALID_JSON",
      "请求体格式错误",
      400,
      errorDetails
    );
  }

  // 默认服务器错误
  return createErrorResponse(
    "INTERNAL_ERROR",
    "服务器内部错误",
    500,
    errorDetails
  );
}

/**
 * 验证请求方法
 */
export function validateMethod(
  request: Request,
  allowedMethods: string[]
): NextResponse | null {
  if (!allowedMethods.includes(request.method)) {
    return createErrorResponse(
      "METHOD_NOT_ALLOWED",
      `方法 ${request.method} 不被允许。支持的方法: ${allowedMethods.join(
        ", "
      )}`,
      405,
      {
        requestedMethod: request.method,
        allowedMethods,
        endpoint: new URL(request.url).pathname,
      }
    );
  }
  return null;
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return createSuccessResponse({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null,
    },
  });
}

/**
 * 处理异步操作的错误包装器
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}

/**
 * 创建操作成功响应（用于创建、更新、删除操作）
 */
export function createOperationResponse(
  operation: "created" | "updated" | "deleted",
  resourceType: string,
  data?: any
): NextResponse {
  const messages = {
    created: `${resourceType}创建成功`,
    updated: `${resourceType}更新成功`,
    deleted: `${resourceType}删除成功`,
  };

  const statusCodes = {
    created: 201,
    updated: 200,
    deleted: 200,
  };

  return createSuccessResponse(
    {
      message: messages[operation],
      operation,
      resourceType,
      ...(data && { data }),
    },
    statusCodes[operation]
  );
}
