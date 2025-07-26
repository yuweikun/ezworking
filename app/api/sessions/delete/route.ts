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
 * POST /api/sessions/delete - 删除会话
 * 请求体: { sessionId: string }
 * 需求: 7.1, 7.2, 7.3, 7.4
 */
async function deleteSession(request: NextRequest, user: AuthUser) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ["POST"]);
    if (methodError) return methodError;

    // 验证请求体格式
    let sessionId;
    try {
      const body = await request.json();
      sessionId = body.sessionId;
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

    // 删除会话及所有相关消息 (需求 7.1)
    // 由于数据库中设置了级联删除，删除会话会自动删除相关消息
    const { error: deleteError } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id); // 额外的安全检查

    if (deleteError) {
      return handleApiError(deleteError, "POST /api/sessions/delete - 删除会话");
    }



    // 返回删除成功确认 (需求 7.2)
    return createSuccessResponse({
      message: "会话已成功删除",
      deleted_session_id: sessionId,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/sessions/delete");
  }
}

export const POST = withAuth(deleteSession);

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