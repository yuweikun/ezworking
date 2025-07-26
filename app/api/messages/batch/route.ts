import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/utils/auth';

/**
 * POST /api/messages/batch
 * 批量创建聊天消息
 * 
 * 请求体: {
 *   session_id: string,
 *   messages: Array<{
 *     role: 'user' | 'assistant',
 *     content: string,
 *     workflow_stage?: object
 *   }>
 * }
 * 
 * 响应: {
 *   success: boolean,
 *   data?: { inserted_count: number, message_ids: string[] },
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

    const { session_id, messages } = body;

    // 验证必需字段
    if (!session_id || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { 
          success: false, 
          message: '缺少必需字段: session_id, messages (数组)' 
        },
        { status: 400 }
      );
    }

    // 验证消息数组不为空
    if (messages.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'messages 数组不能为空' 
        },
        { status: 400 }
      );
    }

    // 验证消息数组长度限制
    if (messages.length > 100) {
      return NextResponse.json(
        { 
          success: false, 
          message: '单次最多只能插入100条消息' 
        },
        { status: 400 }
      );
    }

    // 验证每条消息的格式
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { 
            success: false, 
            message: `消息 ${i + 1} 缺少必需字段: role, content` 
          },
          { status: 400 }
        );
      }

      if (!['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `消息 ${i + 1} 的 role 必须是 user 或 assistant` 
          },
          { status: 400 }
        );
      }

      if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: `消息 ${i + 1} 的 content 不能为空` 
          },
          { status: 400 }
        );
      }
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

    // 准备批量插入的数据
    const insertData = messages.map(msg => ({
      session_id: session_id,
      role: msg.role === 'assistant' ? 'ai' : msg.role, // 将 assistant 转换为 ai
      content: msg.content.trim(),
      workflow_stage: msg.workflow_stage ? JSON.stringify(msg.workflow_stage) : null,
    }));

    // 批量插入消息到数据库
    const { data: messageData, error: insertError } = await supabase
      .from('chat_messages')
      .insert(insertData)
      .select('id, timestamp');

    if (insertError) {
      console.error('批量插入消息失败:', insertError);
      return NextResponse.json(
        { 
          success: false, 
          message: '批量插入消息失败',
          error: insertError.message,
          details: insertError
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
        inserted_count: messageData?.length || 0,
        message_ids: messageData?.map((msg: any) => msg.id) || []
      },
      message: `成功插入 ${messageData?.length || 0} 条消息`
    });

  } catch (error) {
    console.error('批量创建消息API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '服务器内部错误' 
      },
      { status: 500 }
    );
  }
}