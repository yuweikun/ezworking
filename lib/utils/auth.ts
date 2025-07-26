import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "../supabase";
import { createErrorResponse } from "./response";

/**
 * 用户认证信息接口
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * 认证结果接口
 */
export interface AuthResult {
  success: boolean;
  user?: AuthUser | null;
  error?: string | null;
}

/**
 * 验证用户认证状态
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = createServerSupabaseClient();

    // 从请求头获取认证令牌
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: "Missing or invalid authorization header",
      };
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证令牌
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        success: false,
        error: "Invalid or expired token",
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || "",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Authentication verification failed",
    };
  }
}

/**
 * 中间件：验证用户权限访问会话
 */
export async function verifySessionAccess(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: session, error } = await supabase
      .from("chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    if (session.user_id !== userId) {
      return {
        success: false,
        error: "Access denied",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "Session access verification failed",
    };
  }
}

/**
 * 中间件：验证用户权限访问消息
 */
export async function verifyMessageAccess(
  messageId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: message, error } = await supabase
      .from("chat_messages")
      .select(
        `
        id,
        chat_sessions!inner (
          user_id
        )
      `
      )
      .eq("id", messageId)
      .single();

    if (error || !message) {
      return {
        success: false,
        error: "Message not found",
      };
    }

    // 修复类型错误：正确访问嵌套的 user_id
    const session = message.chat_sessions as any;
    if (!session || session.user_id !== userId) {
      return {
        success: false,
        error: "Access denied",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "Message access verification failed",
    };
  }
}

/**
 * 认证中间件包装器
 */
export function withAuth<T extends any[]>(
  handler: (
    request: NextRequest,
    user: AuthUser,
    ...args: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authResult = await verifyAuth(request);

    if (!authResult.success || !authResult.user) {
      return createErrorResponse("UNAUTHORIZED", authResult.error || undefined);
    }

    return handler(request, authResult.user, ...args);
  };
}

/**
 * 获取当前用户信息（用于客户端）
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
    };
  } catch (error) {
    return null;
  }
}

/**
 * 登出用户
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "Sign out failed",
    };
  }
}

/**
 * 检查会话权限（别名函数，用于向后兼容）
 */
export const checkSessionPermission = verifySessionAccess;
