import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase";
import {
  createErrorResponse,
  handleApiError,
  validateMethod,
} from "../../../../lib/utils/response";
import { validateRequestBody, validateUUID } from "../../../../lib/utils/validation";
import { withAuth, checkSessionPermission } from "../../../../lib/utils/auth";
import type { AuthUser } from "../../../../lib/utils/auth";
import type { OpenAIMessage } from "../../../../lib/ai/types";

/**
 * 流式聊天请求接口
 */
interface StreamChatRequest {
  session_id: string;
  query: string;
}

/**
 * POST /api/chat/stream - 流式聊天对话
 * 1. 存储用户消息到数据库
 * 2. 获取当前session的所有消息作为上下文
 * 3. 调用AI流程生成流式回复
 * 4. 在流式响应结束后存储完整的AI回复到数据库
 */
async function handleStreamChat(request: NextRequest, user: AuthUser) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ["POST"]);
    if (methodError) return methodError;

    // 验证请求体
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createErrorResponse("INVALID_JSON", bodyValidation.error);
    }

    const { session_id, query }: StreamChatRequest = bodyValidation.data;

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

    // 2. 获取当前session的所有消息作为上下文（包括刚刚存储的用户消息）
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("role, content, workflow_stage")
      .eq("session_id", session_id)
      .order("timestamp", { ascending: true });

    if (messagesError) {
      return handleApiError(messagesError, "获取消息历史失败");
    }

    // 3. 准备AI上下文（排除最后一条用户消息，避免重复）
    const context: OpenAIMessage[] = (messages || [])
      .slice(0, -1) // 排除最后一条消息（刚存储的用户消息）
      .map((msg): OpenAIMessage => {
        // 确保角色类型正确
        let role: "user" | "assistant" | "system";
        if (msg.role === "ai") {
          role = "assistant";
        } else if (msg.role === "user") {
          role = "user";
        } else if (msg.role === "system") {
          role = "system";
        } else {
          // 默认为user，处理未知角色
          role = "user";
        }
        
        return {
          role,
          content: msg.content,
        } as OpenAIMessage;
      });

    // 4. 创建流式响应
    const responseStream = await createAIStreamResponse(query, context, session_id);

    // 5. 创建流式响应并在结束时存储完整内容
    const stream = createStreamResponseWithStorage(
      responseStream,
      session_id,
      supabase
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

  } catch (error) {
    return handleApiError(error, "POST /api/chat/stream");
  }
}

/**
 * 创建AI流式响应
 */
async function createAIStreamResponse(
  query: string,
  context: Array<{role: string, content: string}>,
  sessionId: string
) {
  try {
    // 导入AI相关模块
    const { CoordinatorAgent } = await import("../../../../lib/ai/agents/coordinator-agent");
    const { ConversationAgent } = await import("../../../../lib/ai/agents/conversation-agent");
    const { CareerPositioningWorkflow } = await import("../../../../lib/ai/workflows/career-positioning-workflow");
    const { getOpenAIConfig, validateOpenAIConfig } = await import("../../../../lib/ai/config");

    // 获取OpenAI配置
    const openaiConfig = getOpenAIConfig();
    validateOpenAIConfig(openaiConfig);

    // 初始化CoordinatorAgent进行任务分配
    const coordinator = new CoordinatorAgent(openaiConfig);
    
    // 获取当前工作流状态
    let currentWorkflowState;
    try {
      const { MessageService } = await import("../../../../services/message-service");
      currentWorkflowState = await MessageService.getWorkflowState(sessionId, sessionId);
    } catch (error) {
      console.warn("Failed to get workflow state:", error);
      currentWorkflowState = undefined;
    }

    // 任务分配
    let nodeId: "conversation" | "career-positioning";
    try {
      const assignment = await coordinator.assignTask(query, currentWorkflowState);
      nodeId = assignment.nodeId;
    } catch (error) {
      console.warn("Coordinator assignment failed, defaulting to conversation:", error);
      nodeId = "conversation";
    }

    // 根据分配的节点执行相应的Agent
    if (nodeId === "conversation") {
      const conversationAgent = new ConversationAgent(openaiConfig);
      return conversationAgent.streamExecute({
        query,
        history: context,
        workflowState: currentWorkflowState,
      });
    } else {
      const careerWorkflow = new CareerPositioningWorkflow(openaiConfig);
      return careerWorkflow.execute(query, context, currentWorkflowState);
    }

  } catch (error) {
    console.error("AI stream response generation failed:", error);
    // 返回错误流
    return (async function* () {
      yield {
        content: "抱歉，我现在无法处理您的请求，请稍后再试。",
        finished: true,
        workflowState: null,
      };
    })();
  }
}

/**
 * 创建带存储功能的流式响应
 */
function createStreamResponseWithStorage(
  responseStream: AsyncGenerator<any>,
  sessionId: string,
  supabase: any
): ReadableStream {
  let fullContent = "";
  let finalWorkflowState: any = null;

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of responseStream) {
          // 累积完整内容
          if (chunk.content) {
            fullContent += chunk.content;
          }
          
          // 更新工作流状态
          if (chunk.workflowState) {
            finalWorkflowState = chunk.workflowState;
          }

          // 发送流式数据
          const data = JSON.stringify({
            content: chunk.content || "",
            finished: chunk.finished || false,
            workflowState: chunk.workflowState || null,
          });
          
          controller.enqueue(`data: ${data}\n\n`);

          // 如果流结束，存储完整的AI回复
          if (chunk.finished) {
            try {
              await supabase
                .from("chat_messages")
                .insert({
                  session_id: sessionId,
                  role: "ai",
                  content: fullContent,
                  workflow_stage: finalWorkflowState ? JSON.stringify(finalWorkflowState) : null,
                });
            } catch (storeError) {
              console.error("Failed to store AI message:", storeError);
            }
            break;
          }
        }
      } catch (error) {
        console.error("Stream processing error:", error);
        
        // 发送错误信息
        const errorData = JSON.stringify({
          content: "处理过程中出现错误，请稍后重试。",
          finished: true,
          workflowState: null,
          error: true,
        });
        controller.enqueue(`data: ${errorData}\n\n`);
      } finally {
        controller.close();
      }
    },
  });
}

export const POST = withAuth(handleStreamChat);

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