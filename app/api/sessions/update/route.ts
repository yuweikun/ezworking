import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateMethod,
} from "../../../../lib/utils/response";
import { validateUUID } from "../../../../lib/utils/validation";
import { withAuth, checkSessionPermission } from "../../../../lib/utils/auth";

import type { AuthUser } from "../../../../lib/utils/auth";

/**
 * POST /api/sessions/update - 更新会话标题
 * 请求体: { sessionId: string, title: string }
 * 需求: 8.1, 8.2, 8.3, 8.4
 */
async function updateSession(request: NextRequest, user: AuthUser) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ["POST"]);
    if (methodError) return methodError;

    // 验证请求体格式
    let sessionId, title;
    try {
      const body = await request.json();
      sessionId = body.sessionId;
      title = body.title;
    } catch (error) {
      return createErrorResponse("INVALID_JSON", "请求体必须是有效的JSON格式");
    }

    // 验证会话ID
    if (!sessionId) {
      return createErrorResponse("MISSING_REQUIRED_FIELDS", "缺少会话ID");
    }

    if (!validateUUID(sessionId)) {
      return createErrorResponse("INVALID_SESSION_ID", "会话ID格式无效");
    }

    // 验证标题
    if (!title) {
      return createErrorResponse("MISSING_REQUIRED_FIELDS", "缺少会话标题");
    }

    // 验证标题格式
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return createErrorResponse("VALIDATION_ERROR", "会话标题不能为空");
    }
    if (trimmedTitle.length > 200) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "会话标题长度不能超过200个字符"
      );
    }

    // 检查用户是否有权限访问此会话
    const permissionResult = await checkSessionPermission(sessionId, user.id);

    if (!permissionResult.success) {
      return createErrorResponse(
        "ACCESS_DENIED",
        permissionResult.error || "无权访问此会话",
        403
      );
    }

    // 创建 Supabase 客户端
    const supabase = createServerSupabaseClient();

    // 更新会话标题
    const { data: updatedSession, error: updateError } = await supabase
      .from("chat_sessions")
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", user.id) // 额外的安全检查
      .select("id, user_id, title, created_at, updated_at")
      .single();

    if (updateError) {
      return handleApiError(
        updateError,
        "POST /api/sessions/update - 更新会话"
      );
    }

    // 返回更新后的会话数据 (需求 8.2)
    return createSuccessResponse(updatedSession);
  } catch (error) {
    return handleApiError(error, "POST /api/sessions/update");
  }
}

export const POST = withAuth(updateSession);

// 处理不支持的方法
export async function GET() {
  return createErrorResponse("METHOD_NOT_ALLOWED");
}

export async function PUT() {
  return createErrorResponse("METHOD_NOT_ALLOWED");
}

export async function DELETE() {
  return createErrorResponse("METHOD_NOT_ALLOWED");
}

export async function PATCH() {
  return createErrorResponse("METHOD_NOT_ALLOWED");
}
