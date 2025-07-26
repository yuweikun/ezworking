import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateRegisterRequest, validateRequestBody } from '@/lib/utils/validation';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, handleApiError, validateMethod } from '@/lib/utils/response';
import type { RegisterRequest } from '@/lib/types';

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
    
    const body: RegisterRequest = bodyValidation.data;

    // 验证请求参数
    const validation = validateRegisterRequest(body);
    if (!validation.isValid) {
      return createValidationErrorResponse(validation);
    }

    // 创建 Supabase 客户端
    const supabase = createServerSupabaseClient();

    // 使用 Supabase Auth 注册用户
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name || null
        }
      }
    });

    if (error) {
      return handleApiError(error, 'POST /api/auth/register - 用户注册');
    }

    // 检查用户是否成功创建
    if (!data.user) {
      return createErrorResponse('INTERNAL_ERROR', '用户注册失败');
    }

    // 返回成功响应（不包含敏感信息）
    const responseData = {
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
        email_confirmed_at: data.user.email_confirmed_at
      },
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type
      } : null
    };

    return createSuccessResponse(responseData, 201);

  } catch (error) {
    return handleApiError(error, 'POST /api/auth/register');
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