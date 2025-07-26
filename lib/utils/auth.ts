import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createErrorResponse } from './response';
import type { User } from '@supabase/supabase-js';

/**
 * 认证结果接口
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  status?: number;
}

/**
 * 从请求头中提取JWT令牌
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }

  // 支持 "Bearer token" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 直接返回令牌
  return authHeader;
}

/**
 * 验证JWT令牌并获取用户信息
 */
export async function verifyToken(token: string): Promise<AuthResult> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 使用Supabase验证JWT令牌
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return {
        success: false,
        error: '无效的认证令牌',
        status: 401
      };
    }

    return {
      success: true,
      user
    };
  } catch (error) {
    return {
      success: false,
      error: '令牌验证失败',
      status: 401
    };
  }
}

/**
 * 认证中间件 - 验证请求中的JWT令牌
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    return {
      success: false,
      error: '缺少认证令牌',
      status: 401
    };
  }

  return await verifyToken(token);
}

/**
 * 检查用户是否有权限访问指定的会话
 */
export async function checkSessionPermission(
  userId: string, 
  sessionId: string
): Promise<{ hasPermission: boolean; error?: string; status?: number }> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 查询会话是否存在且属于该用户
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          hasPermission: false,
          error: '无权访问此会话',
          status: 403
        };
      }
      return {
        hasPermission: false,
        error: '会话查询失败',
        status: 500
      };
    }

    if (!session) {
      return {
        hasPermission: false,
        error: '会话不存在',
        status: 404
      };
    }

    return { hasPermission: true };
  } catch (error) {
    return {
      hasPermission: false,
      error: '权限检查失败',
      status: 500
    };
  }
}

/**
 * 检查用户是否有权限访问指定的消息
 */
export async function checkMessagePermission(
  userId: string, 
  messageId: string
): Promise<{ hasPermission: boolean; error?: string; status?: number }> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 通过消息查找对应的会话，然后检查用户权限
    const { data: message, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        session_id,
        chat_sessions!inner (
          user_id
        )
      `)
      .eq('id', messageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          hasPermission: false,
          error: '无权访问此消息',
          status: 403
        };
      }
      return {
        hasPermission: false,
        error: '消息查询失败',
        status: 500
      };
    }

    if (!message || message.chat_sessions.user_id !== userId) {
      return {
        hasPermission: false,
        error: '无权访问此消息',
        status: 403
      };
    }

    return { hasPermission: true };
  } catch (error) {
    return {
      hasPermission: false,
      error: '权限检查失败',
      status: 500
    };
  }
}

/**
 * 认证装饰器 - 包装API处理函数以添加认证检查
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: User, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(
        'AUTHENTICATION_FAILED',
        authResult.error || '认证失败',
        authResult.status || 401
      );
    }

    return handler(request, authResult.user, ...args);
  };
}

/**
 * 会话权限装饰器 - 包装API处理函数以添加会话权限检查
 */
export function withSessionPermission<T extends any[]>(
  handler: (request: NextRequest, user: User, sessionId: string, ...args: T) => Promise<Response>,
  getSessionId: (request: NextRequest, ...args: T) => string | Promise<string>
) {
  return withAuth(async (request: NextRequest, user: User, ...args: T): Promise<Response> => {
    const sessionId = await getSessionId(request, ...args);
    
    const permissionResult = await checkSessionPermission(user.id, sessionId);
    
    if (!permissionResult.hasPermission) {
      return createErrorResponse(
        'ACCESS_DENIED',
        permissionResult.error || '无权访问',
        permissionResult.status || 403
      );
    }

    return handler(request, user, sessionId, ...args);
  });
}