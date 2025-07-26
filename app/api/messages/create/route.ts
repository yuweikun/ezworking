import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/utils/auth';

/**
 * POST /api/messages/create
 * 创建新的聊天消息
 * 
 * 请求体: {
 *   session_id: string,
 *   role: 'user' | 'assistant',
 *   content: string,
 *   workflow_stage?: object
 * }
 * 
 * 响应: {
 *   success: boolean,
 *   data?: { id: string, created_at: string },
 *   message?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 验证认证
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: '认证失败' },
        { status: 401 }
      );
    }

    const user = authResult.user;

    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, message: '请求体格式错误' },
        { status: 400 }
      );
    }

    const { session_id, role, content, workflow_stage } = body;

    // 验证必需字段
    if (!session_id || !role || !content) {
      return NextResponse.json(
        { 
          success: false, 
          message: '缺少必需字段: session_id, role, content' 
        },
        { status: 400 }
      );
    }

    // 验证角色
    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'role 必须是 user 或 assistant' 
        },
        { status: 400 }
      );
    }

    // 将 assistant 转换为 ai 以匹配数据库约束
    const dbRole = role === 'assistant' ? 'ai' : role;

    // 验证内容不为空
    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'content 不能为空' 
        },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 验证会话是否存在且属于当前用户
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { 
          success: false, 
          message: '会话不存在或无权限访问' 
        },
        { status: 404 }
      );
    }

    // 插入消息到数据库
    const { data: messageData, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: session_id,
        role: dbRole,
        content: content.trim(),
        workflow_stage: workflow_stage ? JSON.stringify(workflow_stage) : null,
      })
      .select('id, timestamp')
      .single();

    if (insertError) {
      console.error('插入消息失败:', insertError);
      return NextResponse.json(
        { 
          success: false, 
          message: '插入消息失败' 
        },
        { status: 500 }
      );
    }

    // 更新会话的最后活动时间
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({ 
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      console.warn('更新会话时间失败:', updateError);
      // 不返回错误，因为消息已经成功插入
    }

    return NextResponse.json({
      success: true,
      data: {
        id: messageData.id,
        created_at: messageData.timestamp
      },
      message: '消息创建成功'
    });

  } catch (error) {
    console.error('创建消息API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '服务器内部错误' 
      },
      { status: 500 }
    );
  }
}