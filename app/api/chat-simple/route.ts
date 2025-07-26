import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateMethod,
} from "../../../lib/utils/response";
import { validateRequestBody, validateUUID } from "../../../lib/utils/validation";
import { withAuth, checkSessionPermission } from "../../../lib/utils/auth";
import type { AuthUser } from "../../../lib/utils/auth";

/**
 * 简化版聊天API - 用于测试基本功能
 * POST /api/chat-simple
 */
async function handleSimpleChat(request: NextRequest, user: AuthUser) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ["POST"]);
    if (methodError) return methodError;

    // 验证请求体
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createErrorResponse("INVALID_JSON", bodyValidation.error);
    }

    const { session_id, query } = bodyValidation.data;

    // 验证必需字段
    if (!session_id || !query) {
      return createErrorResponse("VALIDATION_ERROR", "缺少必需参数: session_id 或 query");
    }

    // 验证session_id格式
    if (!validateUUID(session_id)) {
      return createErrorResponse("INVALID_SESSION_ID");
    }

    // 检查用户权限
    const permissionResult = await checkSessionPermission(session_id, user.id);
    if (!permissionResult.success) {
      return createErrorResponse(
        "ACCESS_DENIED",
        permissionResult.error || "无权访问此会话",
        403
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. 存储用户消息到数据库
    const { error: userMessageError } = await supabase
      .from("chat_messages")
      .insert({
        session_id,
        role: "user",
        content: query,
      });

    if (userMessageError) {
      return handleApiError(userMessageError, "存储用户消息失败");
    }

    // 2. 获取当前session的所有消息作为上下文
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("timestamp", { ascending: true });

    if (messagesError) {
      return handleApiError(messagesError, "获取消息历史失败");
    }

    // 3. 生成简单的AI回复（模拟）
    const contextLength = (messages || []).length;
    const aiResponse = `你好！我收到了你的消息："${query}"。这是我们对话中的第 ${contextLength} 条消息。当前会话包含 ${contextLength} 条历史消息。`;

    // 4. 存储AI回复到数据库
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from("chat_messages")
      .insert({
        session_id,
        role: "ai",
        content: aiResponse,
      })
      .select("id, session_id, role, content, timestamp")
      .single();

    if (aiMessageError) {
      return handleApiError(aiMessageError, "存储AI回复失败");
    }

    return createSuccessResponse({
      message: aiMessage,
      response: aiResponse,
      context_info: {
        total_messages: contextLength,
        user_query: query
      }
    }, 201);

  } catch (error) {
    return handleApiError(error, "POST /api/chat-simple");
  }
}

export const POST = withAuth(handleSimpleChat);

// 不支持的方法
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