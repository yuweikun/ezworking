import { NextRequest } from 'next/server';
import { createErrorResponse, handleApiError, validateMethod } from '../../../../lib/utils/response';
import { validateRequestBody } from '../../../../lib/utils/validation';

import { MessageService } from '../../../../services/message-service';
import { CoordinatorAgent } from '../../../../lib/ai/agents/coordinator-agent';
import { ConversationAgent } from '../../../../lib/ai/agents/conversation-agent';
import { CareerPositioningWorkflow } from '../../../../lib/ai/workflows/career-positioning-workflow';
import { getOpenAIConfig, validateOpenAIConfig } from '../../../../lib/ai/config';
import { OpenAIMessage, WorkflowState, StreamChunk } from '../../../../lib/ai/types';
import { createStreamResponse } from '../../../../lib/ai/stream-utils';


/**
 * AI流式响应接口请求体
 */
interface StreamRequest {
  query: string;
  sessionId: string;
}

/**
 * POST /api/ai/stream - AI流式响应接口
 * 处理用户查询，通过CoordinatorAgent分配任务，返回流式响应
 * Requirements: 6.1, 1.4
 */
async function handleStreamRequest(request: NextRequest) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ['POST']);
    if (methodError) return methodError;

    // 验证请求体格式
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createErrorResponse('INVALID_JSON', bodyValidation.error);
    }

    const body: StreamRequest = bodyValidation.data;

    // 验证必需字段
    if (!body.query || typeof body.query !== 'string') {
      return createErrorResponse('VALIDATION_ERROR', '缺少必需字段: query');
    }

    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return createErrorResponse('VALIDATION_ERROR', '缺少必需字段: sessionId');
    }

    // 验证和获取OpenAI配置
    let openaiConfig;
    try {
      openaiConfig = getOpenAIConfig();
      validateOpenAIConfig(openaiConfig);
    } catch (configError: any) {
      return createErrorResponse('CONFIG_ERROR', `OpenAI配置错误: ${configError.message}`);
    }

    // 存储用户消息
    try {
      await MessageService.createMessage(
        body.sessionId,
        'user',
        body.query,
        undefined,
        { showError: false, retryOnFailure: false }
      );
    } catch (messageError) {
      console.warn('Failed to store user message:', messageError);
    }

    // 获取对话历史和工作流状态
    let history: OpenAIMessage[] = [];
    let currentWorkflowState: WorkflowState | undefined;
    
    try {
      history = await MessageService.formatMessagesForOpenAI(
        body.sessionId, // 直接使用sessionId作为用户标识
        body.sessionId,
        true
      );
      currentWorkflowState = await MessageService.getWorkflowState(body.sessionId, body.sessionId);
    } catch (historyError) {
      console.warn('Failed to fetch message history:', historyError);
    }

    // 创建流式响应
    const responseStream = await createAIResponseStream(
      body.query,
      history,
      currentWorkflowState,
      body.sessionId,
      openaiConfig
    );

    // 创建流式响应并收集内容用于存储
    const stream = createStreamResponse(responseStream, async (fullContent: string, finalWorkflowState: any) => {
      // 存储AI回复
      try {
        const workStage = finalWorkflowState ? JSON.stringify(finalWorkflowState) : undefined;
        await MessageService.createMessage(
          body.sessionId,
          'assistant',
          fullContent,
          workStage,
          { showError: false, retryOnFailure: false }
        );
      } catch (storeError) {
        console.warn('Failed to store assistant message:', storeError);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    return handleApiError(error, 'POST /api/ai/stream');
  }
}

/**
 * 创建AI响应流生成器
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
async function createAIResponseStream(
  query: string,
  history: OpenAIMessage[],
  workflowState: WorkflowState | undefined,
  sessionId: string,
  openaiConfig: any
): Promise<AsyncGenerator<StreamChunk>> {
  return (async function* () {
    try {
      // 初始化CoordinatorAgent
      const coordinator = new CoordinatorAgent(openaiConfig);
      
      // 任务分配
      let nodeId: 'conversation' | 'career-positioning';
      try {
        const assignment = await coordinator.assignTask(query, workflowState);
        nodeId = assignment.nodeId;
      } catch (coordinatorError) {
        console.warn('Coordinator assignment failed, defaulting to conversation:', coordinatorError);
        nodeId = 'conversation';
      }

      // 根据选择的节点执行相应的Agent
      let responseStream: AsyncGenerator<StreamChunk>;
      
      if (nodeId === 'conversation') {
        const conversationAgent = new ConversationAgent(openaiConfig);
        responseStream = conversationAgent.streamExecute({
          query,
          history,
          workflowState
        });
      } else {
        const careerWorkflow = new CareerPositioningWorkflow(openaiConfig);
        responseStream = careerWorkflow.execute(query, history, workflowState);
      }

      // 直接传递响应流，存储逻辑移到createStreamResponse中处理
      for await (const chunk of responseStream) {
        yield chunk;
      }

    } catch (error: any) {
      // Requirement 4.5: 错误处理 - 返回错误信息并结束流式响应
      yield {
        content: `处理失败: ${error.message}`,
        finished: true,
        workflowState: workflowState || null
      };
    }
  })();
}

export const POST = handleStreamRequest;

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

export async function PATCH() {
  return createErrorResponse('METHOD_NOT_ALLOWED');
}