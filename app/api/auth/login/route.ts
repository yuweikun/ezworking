import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateLoginRequest, validateRequestBody } from '@/lib/utils/validation';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, handleApiError, validateMethod } from '@/lib/utils/response';
import type { LoginRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ['POST']);
    if (methodError) return methodError;

    // 验证请求体格式
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createErrorResponse('INVALID_JSON', bodyValidation.error);
    }
    
    const body: LoginRequest = bodyValidation.data;

    // 验证请求参数
    const validation = validateLoginRequest(body);
    if (!validation.isValid) {
      return createValidationErrorResponse(validation);
    }

    // 创建 Supabase 客户端
    const supabase = createServerSupabaseClient();

    // 使用 Supabase Auth 登录用户
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password
    });

    if (error) {
      return handleApiError(error, 'POST /api/auth/login - 用户登录');
    }

    // 检查用户和会话是否存在
    if (!data.user || !data.session) {
      return createErrorResponse('LOGIN_FAILED');
    }

    // 返回成功响应（包含认证令牌）
    const responseData = {
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at,
        email_confirmed_at: data.user.email_confirmed_at
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: {
          id: data.session.user.id,
          email: data.session.user.email
        }
      }
    };

    return createSuccessResponse(responseData, 200);

  } catch (error) {
    return handleApiError(error, 'POST /api/auth/login');
  }
}

// 处理不支持的方法
export async function GET() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}

export async function PUT() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}

export async function DELETE() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}