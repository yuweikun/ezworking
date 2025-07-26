import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, handleApiError, validateMethod } from '../../../lib/utils/response';
import { validateSessionRequest, validateRequestBody } from '../../../lib/utils/validation';
import { withAuth } from '../../../lib/utils/auth';
import { 
  cachedUserSessions, 
  cacheInvalidation,
  cacheHeaders 
} from '../../../lib/utils/cache';
import { ChatSession, SessionCreateRequest } from '../../../lib/types';
import type { User } from '@supabase/supabase-js';

/**
 * GET /api/sessions - 获取用户会话列表
 * 需求: 2.1, 2.2, 2.3, 2.4
 */
async function getSessions(request: NextRequest, user: User) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ['GET']);
    if (methodError) return methodError;
    
    // 创建 Supabase 客户端
    const supabase = createServerSupabaseClient();
    
    // 获取分页参数
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // 使用缓存获取用户会话列表
    let sessions: ChatSession[];
    try {
      sessions = await cachedUserSessions(user.id, page, limit);
    } catch (error) {
      return handleApiError(error, 'GET /api/sessions - 获取会话列表');
    }

    // 如果用户没有会话，返回空数组 (需求 2.3)
    const result = {
      sessions: sessions || [],
      pagination: {
        page,
        limit,
        hasMore: sessions.length === limit
      }
    };
    
    // 添加缓存头
    const successResponse = createSuccessResponse(result);
    Object.entries(cacheHeaders.short).forEach(([key, value]) => {
      successResponse.headers.set(key, value);
    });
    
    return successResponse;

  } catch (error) {
    return handleApiError(error, 'GET /api/sessions');
  }
}

export const GET = withAuth(getSessions);

/**
 * POST /api/sessions - 创建新的聊天会话
 * 请求体: { title: string }
 * 需求: 5.1, 5.2, 5.3, 5.4
 */
async function createSession(request: NextRequest, user: User) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ['POST']);
    if (methodError) return methodError;

    // 验证请求体格式
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createErrorResponse('INVALID_JSON', bodyValidation.error);
    }
    
    const body: { title: string } = bodyValidation.data;

    // 验证请求数据 - 只需要title，user_id从认证用户获取
    const validation = validateSessionRequest({ 
      user_id: user.id, 
      title: body.title 
    } as SessionCreateRequest);
    if (!validation.isValid) {
      return createValidationErrorResponse(validation);
    }

    // 创建 Supabase 客户端
    const supabase = createServerSupabaseClient();
    
    // 在数据库中创建新会话，使用认证用户的ID
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: body.title.trim()
      })
      .select('id, user_id, title, created_at, updated_at')
      .single();

    if (error) {
      return handleApiError(error, 'POST /api/sessions - 创建会话');
    }

    // 清除用户会话列表缓存
    cacheInvalidation.invalidateUserSessions(user.id);

    // 返回创建的会话数据，包括生成的UUID (需求 5.2)
    return createSuccessResponse(session, 201);

  } catch (error) {
    return handleApiError(error, 'POST /api/sessions');
  }
}

export const POST = withAuth(createSession);

// 处理不支持的方法
export async function PUT() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}

export async function DELETE() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}

export async function PATCH() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}