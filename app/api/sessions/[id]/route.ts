import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  handleApiError,
  validateMethod,
} from "@/lib/utils/response";
import {
  validateSessionUpdateRequest,
  validateUUID,
  validateRequestBody,
} from "@/lib/utils/validation";
import { withAuth, checkSessionPermission } from "@/lib/utils/auth";
import {
  cachedSessionPermissionCheck,
  cacheInvalidation,
} from "@/lib/utils/cache";
import { SessionUpdateRequest } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

/**
 * POST /api/sessions/[id] - 更新或删除会话
 * 路径参数: id (会话ID)
 * 请求体: { action?: "delete", title?: string }
 * 需求: 7.1, 7.2, 7.3, 7.4 (删除), 8.1, 8.2, 8.3, 8.4 (更新)
 */
async function updateOrDeleteSession(
  request: NextRequest,
  user: User,
  context: { params: { id: string } }
) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ["POST"]);
    if (methodError) return methodError;

    const sessionId = context.params.id;

    // 验证会话ID格式
    if (!validateUUID(sessionId)) {
      return createErrorResponse("INVALID_SESSION_ID");
    }

    // 检查用户是否有权限访问此会话 (使用缓存)
    const permissionResult = await cachedSessionPermissionCheck(
      user.id,
      sessionId
    );
    if (!permissionResult.hasPermission) {
      return createErrorResponse(
        "ACCESS_DENIED",
        permissionResult.error || "无权访问此会话",
        permissionResult.status || 403
      );
    }

    // 验证请求体格式
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createErrorResponse("INVALID_JSON", bodyValidation.error);
    }

    const body: SessionUpdateRequest = bodyValidation.data;

    // 验证请求数据
    const validation = validateSessionUpdateRequest(body);
    if (!validation.isValid) {
      return createValidationErrorResponse(validation);
    }

    // 创建 Supabase 客户端
    const supabase = createServerSupabaseClient();

    // 处理删除操作
    if (body.action === "delete") {
      // 删除会话及所有相关消息 (需求 7.1)
      // 由于数据库中设置了级联删除，删除会话会自动删除相关消息
      const { error: deleteError } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", user.id); // 额外的安全检查

      if (deleteError) {
        return handleApiError(
          deleteError,
          "POST /api/sessions/[id] - 删除会话"
        );
      }

      // 清除相关缓存
      cacheInvalidation.invalidateUserSessions(user.id);
      cacheInvalidation.invalidateMessageHistory(sessionId);
      cacheInvalidation.invalidateSessionPermission(user.id, sessionId);

      // 返回删除成功确认 (需求 7.2)
      return createSuccessResponse({
        message: "会话已成功删除",
        deleted_session_id: sessionId,
      });
    }

    // 处理更新操作
    const updateData: any = {};

    if (body.title !== undefined) {
      updateData.title = body.title.trim();
    }

    // 如果没有要更新的字段
    if (Object.keys(updateData).length === 0) {
      return createErrorResponse(
        "MISSING_REQUIRED_FIELDS",
        "没有提供要更新的数据"
      );
    }

    // 更新会话
    const { data: updatedSession, error: updateError } = await supabase
      .from("chat_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("user_id", user.id) // 额外的安全检查
      .select("id, user_id, title, created_at, updated_at")
      .single();

    if (updateError) {
      return handleApiError(updateError, "POST /api/sessions/[id] - 更新会话");
    }

    // 清除相关缓存
    cacheInvalidation.invalidateUserSessions(user.id);
    cacheInvalidation.invalidateSessionPermission(user.id, sessionId);

    // 返回更新后的会话数据 (需求 8.2)
    return createSuccessResponse(updatedSession);
  } catch (error) {
    return handleApiError(error, "POST /api/sessions/[id]");
  }
}

export const POST = withAuth(updateOrDeleteSession);

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
