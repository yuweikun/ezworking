import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateMethod,
} from "../../../lib/utils/response";
import {
  validateRequestBody,
  validateUUID,
} from "../../../lib/utils/validation";
import { withAuth, checkSessionPermission } from "../../../lib/utils/auth";
import type { AuthUser } from "../../../lib/utils/auth";
import type { OpenAIMessage } from "../../../lib/ai/types";

/**
 * 聊天请求接口
 */
interface ChatRequest {
  session_id: string;
  query: string;
}

/**
 * POST /api/chat - 处理聊天对话
 * 1. 存储用户消息到数据库
 * 2. 获取当前session的所有消息作为上下文
 * 3. 调用AI流程生成回复
 * 4. 存储AI回复到数据库
 */
async function handleChat(request: NextRequest, user: AuthUser) {
  try {
    // 验证请求方法
    const methodError = validateMethod(request, ["POST"]);
    if (methodError) return methodError;

    // 验证请求体
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createErrorResponse("INVALID_JSON", bodyValidation.error);
    }

    const { session_id, query }: ChatRequest = bodyValidation.data;

    // 验证必需字段
    if (!session_id || !query) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "缺少必需参数: session_id 或 query"
      );
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

    // 2. 获取当前session的所有消息作为上下文
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("role, content, workflow_stage")
      .eq("session_id", session_id)
      .order("timestamp", { ascending: true });

    if (messagesError) {
      return handleApiError(messagesError, "获取消息历史失败");
    }

    // 3. 准备AI上下文（格式化为OpenAI消息格式）
    const context: OpenAIMessage[] = (messages || []).map((msg) => ({
      role: msg.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: msg.content,
    }));

    // 4. 调用AI流程生成回复
    const aiResponse = await generateAIResponse(query, context, session_id);

    // 5. 存储AI回复到数据库
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from("chat_messages")
      .insert({
        session_id,
        role: "ai",
        content: aiResponse.content,
        workflow_stage: aiResponse.work_stage
          ? JSON.stringify(aiResponse.work_stage)
          : null,
      })
      .select("id, session_id, role, content, workflow_stage, timestamp")
      .single();

    if (aiMessageError) {
      return handleApiError(aiMessageError, "存储AI回复失败");
    }

    return createSuccessResponse(
      {
        message: aiMessage,
        response: aiResponse.content,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, "POST /api/chat");
  }
}

/**
 * 生成AI回复
 * @param query 用户查询
 * @param context 对话上下文
 * @param sessionId 会话ID
 */
async function generateAIResponse(
  query: string,
  context: OpenAIMessage[],
  sessionId: string
) {
  try {
    // 这里集成现有的AI流程
    const { CoordinatorAgent } = await import(
      "../../../lib/ai/agents/coordinator-agent"
    );
    const { ConversationAgent } = await import(
      "../../../lib/ai/agents/conversation-agent"
    );
    const { CareerPositioningWorkflow } = await import(
      "../../../lib/ai/workflows/career-positioning-workflow"
    );
    const { getOpenAIConfig, validateOpenAIConfig } = await import(
      "../../../lib/ai/config"
    );

    // 获取OpenAI配置
    const openaiConfig = getOpenAIConfig();
    validateOpenAIConfig(openaiConfig);

    // 初始化CoordinatorAgent进行任务分配
    const coordinator = new CoordinatorAgent(openaiConfig);

    // 获取当前工作流状态
    let currentWorkflowState;
    try {
      const { MessageService } = await import(
        "../../../services/message-service"
      );
      currentWorkflowState = await MessageService.getWorkflowState(
        sessionId,
        sessionId
      );
    } catch (error) {
      console.warn("Failed to get workflow state:", error);
      currentWorkflowState = undefined;
    }

    // 任务分配
    let nodeId: "conversation" | "career-positioning";
    try {
      const assignment = await coordinator.assignTask(
        query,
        currentWorkflowState
      );
      nodeId = assignment.nodeId;
    } catch (error) {
      console.warn(
        "Coordinator assignment failed, defaulting to conversation:",
        error
      );
      nodeId = "conversation";
    }

    // 根据分配的节点执行相应的Agent
    let fullContent = "";
    let finalWorkflowState = currentWorkflowState;

    if (nodeId === "conversation") {
      const conversationAgent = new ConversationAgent(openaiConfig);
      const responseStream = conversationAgent.streamExecute({
        query,
        history: context,
        workflowState: currentWorkflowState,
      });

      // 收集流式响应的完整内容
      for await (const chunk of responseStream) {
        if (chunk.content) {
          fullContent += chunk.content;
        }
        if (chunk.workflowState) {
          finalWorkflowState = chunk.workflowState;
        }
      }
    } else {
      const careerWorkflow = new CareerPositioningWorkflow(openaiConfig);
      const responseStream = careerWorkflow.execute(
        query,
        context,
        currentWorkflowState
      );

      // 收集流式响应的完整内容
      for await (const chunk of responseStream) {
        if (chunk.content) {
          fullContent += chunk.content;
        }
        if (chunk.workflowState) {
          finalWorkflowState = chunk.workflowState;
        }
      }
    }

    return {
      content: fullContent,
      work_stage: finalWorkflowState,
    };
  } catch (error) {
    console.error("AI response generation failed:", error);
    return {
      content: "抱歉，我现在无法处理您的请求，请稍后再试。",
      work_stage: null,
    };
  }
}

export const POST = withAuth(handleChat);

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
