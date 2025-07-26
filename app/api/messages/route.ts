import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  handleApiError, 
  validateMethod 
} from '../../../lib/utils/response';
import { 
  validateQueryParams, 
  validateMessageRequest, 
  validateUUID,
  validateRequestBody
} from '../../../lib/utils/validation';
import { 
  withAuth, 
  checkSessionPermission 
} from '../../../lib/utils/auth';
import { 
  cachedMessageHistory, 
  cachedSessionPermissionCheck,
  cacheInvalidation,
  cacheHeaders 
} from '../../../lib/utils/cache';
import { MessageHistory } from '../../../lib/types';
import type { User } from '@supabase/supabase-js';

/**
 * GET /api/messages - 获取会话消息历史
 * 查询参数: session_id
 * 需求: 1.1, 1.2, 1.3, 1.4
 */
async function getMessages(request: NextRequest, user: User) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ['GET']);
    if (methodError) return methodError;

    const { searchParams } = new URL(request.url);
    
    // 验证必需的查询参数
    const paramValidation = validateQueryParams(searchParams, ['session_id'], ['page', 'limit']);
    if (!paramValidation.isValid) {
      return createValidationErrorResponse(paramValidation, 'INVALID_PARAMS');
    }

    const session_id = searchParams.get('session_id')!;

    // 验证UUID格式
    if (!validateUUID(session_id)) {
      return createErrorResponse('INVALID_SESSION_ID');
    }

    // 检查用户是否有权限访问此会话 (使用缓存)
    const permissionResult = await cachedSessionPermissionCheck(user.id, session_id);
    if (!permissionResult.hasPermission) {
      return createErrorResponse(
        'ACCESS_DENIED',
        permissionResult.error || '无权访问此会话',
        permissionResult.status || 403
      );
    }

    // 获取分页参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // 使用缓存获取消息历史
    let messages;
    try {
      messages = await cachedMessageHistory(session_id, page, limit);
    } catch (messagesError) {
      return handleApiError(messagesError, 'GET /api/messages - 查询消息历史');
    }

    // 格式化响应为 history 结构
    const history = (messages || []).map(msg => ({
      role: msg.role as 'user' | 'ai',
      content: msg.content,
      workflow_stage: msg.work_stage || undefined
    }));

    const response: MessageHistory = { 
      history,
      pagination: {
        page,
        limit,
        hasMore: history.length === limit
      }
    };
    
    // 添加缓存头
    const successResponse = createSuccessResponse(response);
    Object.entries(cacheHeaders.short).forEach(([key, value]) => {
      successResponse.headers.set(key, value);
    });
    
    return successResponse;

  } catch (error) {
    return handleApiError(error, 'GET /api/messages');
  }
}

export const GET = withAuth(getMessages);

/**
 * POST /api/messages - 创建新消息
 * 请求体: { session_id, role, content, work_stage? }
 * 需求: 6.1, 6.2, 6.3, 6.4
 */
async function createMessage(request: NextRequest, user: User) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ['POST']);
    if (methodError) return methodError;

    // 验证请求体格式
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createErrorResponse('INVALID_JSON', bodyValidation.error);
    }
    
    const body = bodyValidation.data;

    // 验证请求数据
    const validation = validateMessageRequest(body);
    if (!validation.isValid) {
      return createValidationErrorResponse(validation);
    }

    const { session_id, role, content, work_stage } = body;

    // 验证session_id格式
    if (!validateUUID(session_id)) {
      return createErrorResponse('INVALID_SESSION_ID');
    }

    // 检查用户是否有权限访问此会话 (使用缓存)
    const permissionResult = await cachedSessionPermissionCheck(user.id, session_id);
    if (!permissionResult.hasPermission) {
      return createErrorResponse(
        'ACCESS_DENIED',
        permissionResult.error || '无权访问此会话',
        permissionResult.status || 403
      );
    }

    const supabase = createServerSupabaseClient();

    // 创建新消息
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        role,
        content,
        work_stage: work_stage || null
      })
      .select('id, session_id, role, content, work_stage, timestamp')
      .single();

    if (messageError) {
      return handleApiError(messageError, 'POST /api/messages - 创建消息');
    }

    // 清除相关缓存
    cacheInvalidation.invalidateMessageHistory(session_id);

    return createSuccessResponse(message, 201);

  } catch (error) {
    return handleApiError(error, 'POST /api/messages');
  }
}

export const POST = withAuth(createMessage);
// Handle unsupported methods
export async function PUT() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}

export async function DELETE() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}

export async function PATCH() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}