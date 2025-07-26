import { httpClient } from '../lib';
import { API_ENDPOINTS, CONVERSATION_ERROR_MESSAGES } from '../types/constants';
import { 
  GetMessagesRequest,
  GetMessagesResponse,
  CreateMessageRequest,
  MessageResponse,
  ConversationError,
  ConversationErrorType
} from '../types/conversation';
import { ApiError } from '../types/auth';
import { ErrorHandler } from '../lib/error-handler';

/**
 * 消息管理API服务类
 * 处理所有消息相关的API调用，与现有httpClient集成
 */
export class MessageService {
  /**
   * 获取会话的消息历史
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param options 请求选项
   * @returns Promise<MessageResponse[]> 消息列表
   */
  static async fetchMessages(
    userId: string, 
    sessionId: string,
    options: {
      showError?: boolean;
      retryOnFailure?: boolean;
    } = {}
  ): Promise<MessageResponse[]> {
    const { showError = false, retryOnFailure = true } = options;

    const operation = async (): Promise<MessageResponse[]> => {
      if (!userId || !sessionId) {
        throw this.createMessageError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: 'Missing userId or sessionId' }
        );
      }

      const params: GetMessagesRequest = {
        user_id: userId,
        session_id: sessionId
      };

      const response = await httpClient.get<GetMessagesResponse>(
        API_ENDPOINTS.MESSAGES,
        { params }
      );

      return response.data.history || [];
    };

    try {
      if (retryOnFailure) {
        return await ErrorHandler.withNetworkCheck(
          () => ErrorHandler.withRetry(operation, {
            maxRetries: 2,
            retryCondition: (error) => this.shouldRetryOperation(error)
          }),
          { showMessage: showError }
        );
      } else {
        return await operation();
      }
    } catch (error) {
      const messageError = this.handleApiError(error, ConversationErrorType.FETCH_FAILED);
      
      if (showError) {
        ErrorHandler.showError(messageError);
      }
      
      throw messageError;
    }
  }

  /**
   * 创建新消息
   * @param sessionId 会话ID
   * @param role 消息角色 (user/assistant)
   * @param content 消息内容
   * @param workStage 工作阶段（可选）
   * @param options 创建选项
   * @returns Promise<void>
   */
  static async createMessage(
    sessionId: string, 
    role: string, 
    content: string,
    workStage?: string,
    options: {
      showError?: boolean;
      retryOnFailure?: boolean;
    } = {}
  ): Promise<void> {
    const { showError = true, retryOnFailure = true } = options;

    const operation = async (): Promise<void> => {
      if (!sessionId || !role || !content) {
        throw this.createMessageError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: 'Missing required fields' }
        );
      }

      const messageData: CreateMessageRequest = {
        session_id: sessionId,
        role,
        content,
        work_stage: workStage
      };

      await httpClient.post(API_ENDPOINTS.MESSAGES, messageData);
    };

    try {
      if (retryOnFailure) {
        await ErrorHandler.withNetworkCheck(
          () => ErrorHandler.withRetry(operation, {
            maxRetries: 1, // 消息创建只重试一次
            retryCondition: (error) => this.shouldRetryOperation(error)
          }),
          { showMessage: showError }
        );
      } else {
        await operation();
      }
    } catch (error) {
      const messageError = this.handleApiError(error, ConversationErrorType.CREATE_FAILED);
      
      if (showError) {
        ErrorHandler.showError(messageError);
      }
      
      throw messageError;
    }
  }

  /**
   * 批量创建消息（用于同步多条消息）
   * @param messages 消息数组
   * @returns Promise<void>
   */
  static async batchCreateMessages(messages: Array<{
    sessionId: string;
    role: string;
    content: string;
    workStage?: string;
  }>): Promise<void> {
    try {
      // 并行创建所有消息
      const promises = messages.map(msg => 
        this.createMessage(msg.sessionId, msg.role, msg.content, msg.workStage)
      );
      
      await Promise.all(promises);
    } catch (error) {
      throw this.handleApiError(error, ConversationErrorType.CREATE_FAILED);
    }
  }

  /**
   * 获取会话的最后一条消息
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @returns Promise<MessageResponse | null> 最后一条消息或null
   */
  static async getLastMessage(userId: string, sessionId: string): Promise<MessageResponse | null> {
    try {
      const messages = await this.fetchMessages(userId, sessionId);
      return messages.length > 0 ? messages[messages.length - 1] : null;
    } catch (error) {
      // 获取最后消息失败不应该阻塞主要功能，返回null
      console.warn('Failed to get last message:', error);
      return null;
    }
  }

  /**
   * 获取会话的消息数量
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @returns Promise<number> 消息数量
   */
  static async getMessageCount(userId: string, sessionId: string): Promise<number> {
    try {
      const messages = await this.fetchMessages(userId, sessionId);
      return messages.length;
    } catch (error) {
      // 获取消息数量失败不应该阻塞主要功能，返回0
      console.warn('Failed to get message count:', error);
      return 0;
    }
  }

  /**
   * 获取会话的工作流状态（从最后一条assistant消息中获取）
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @returns Promise<any | null> 工作流状态或null
   */
  static async getWorkflowState(userId: string, sessionId: string): Promise<any | null> {
    try {
      const messages = await this.fetchMessages(userId, sessionId, { 
        showError: false, 
        retryOnFailure: false 
      });
      
      // 从后往前查找最后一条assistant消息
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.role === 'assistant' && message.workflow_stage) {
          try {
            return JSON.parse(message.workflow_stage);
          } catch (parseError) {
            console.warn('Failed to parse workflow_stage JSON:', parseError);
            continue; // 继续查找上一条消息
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get workflow state:', error);
      return null;
    }
  }

  /**
   * 获取会话的工作流状态（从最后一条消息中获取，兼容旧逻辑）
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @returns Promise<any | null> 工作流状态或null
   * @deprecated 使用 getWorkflowState 替代
   */
  static async getLastMessageWorkflowState(userId: string, sessionId: string): Promise<any | null> {
    try {
      const lastMessage = await this.getLastMessage(userId, sessionId);
      if (lastMessage?.workflow_stage) {
        return JSON.parse(lastMessage.workflow_stage);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get last message workflow state:', error);
      return null;
    }
  }

  /**
   * 格式化消息历史为OpenAI消息格式
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param excludeLastUserMessage 是否排除最后一条用户消息（避免重复）
   * @returns Promise<OpenAIMessage[]> OpenAI格式的消息历史
   */
  static async formatMessagesForOpenAI(
    userId: string, 
    sessionId: string,
    excludeLastUserMessage: boolean = false
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const messages = await this.fetchMessages(userId, sessionId);
      
      let filteredMessages = messages;
      
      // 如果需要排除最后一条用户消息
      if (excludeLastUserMessage && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
          filteredMessages = messages.slice(0, -1);
        }
      }
      
      return filteredMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
    } catch (error) {
      console.warn('Failed to format messages for OpenAI:', error);
      return [];
    }
  }

  /**
   * 处理API错误并转换为ConversationError
   * @param error 原始错误
   * @param defaultType 默认错误类型
   * @returns ConversationError
   */
  private static handleApiError(error: any, defaultType: ConversationErrorType): ConversationError {
    // 如果已经是ConversationError，直接抛出
    if (error && typeof error === 'object' && 'type' in error) {
      return error as ConversationError;
    }

    // 如果是ApiError（来自httpClient），转换为ConversationError
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as ApiError;
      
      let errorType = defaultType;
      let errorMessage = this.getErrorMessage(defaultType);

      switch (apiError.code) {
        case 'UNAUTHORIZED':
          errorType = ConversationErrorType.UNAUTHORIZED;
          errorMessage = CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED;
          break;
        case 'NETWORK_ERROR':
          errorType = ConversationErrorType.NETWORK_ERROR;
          errorMessage = CONVERSATION_ERROR_MESSAGES.NETWORK_ERROR;
          break;
        case 'NOT_FOUND':
          errorType = ConversationErrorType.NOT_FOUND;
          errorMessage = CONVERSATION_ERROR_MESSAGES.NOT_FOUND;
          break;
        case 'VALIDATION_ERROR':
          errorType = ConversationErrorType.INVALID_DATA;
          errorMessage = apiError.message || CONVERSATION_ERROR_MESSAGES.INVALID_DATA;
          break;
        default:
          errorMessage = apiError.message || errorMessage;
      }

      return this.createMessageError(errorType, errorMessage, { 
        originalError: apiError 
      });
    }

    // 其他未知错误
    return this.createMessageError(
      defaultType,
      this.getErrorMessage(defaultType),
      { originalError: error }
    );
  }

  /**
   * 创建ConversationError对象
   * @param type 错误类型
   * @param message 错误消息
   * @param details 错误详情
   * @returns ConversationError
   */
  private static createMessageError(
    type: ConversationErrorType,
    message: string,
    details?: any
  ): ConversationError {
    return {
      type,
      message,
      details
    };
  }

  /**
   * 根据错误类型获取默认错误消息
   * @param type 错误类型
   * @returns 错误消息
   */
  private static getErrorMessage(type: ConversationErrorType): string {
    switch (type) {
      case ConversationErrorType.FETCH_FAILED:
        return '获取消息失败，请稍后重试';
      case ConversationErrorType.CREATE_FAILED:
        return '发送消息失败，请稍后重试';
      case ConversationErrorType.NETWORK_ERROR:
        return CONVERSATION_ERROR_MESSAGES.NETWORK_ERROR;
      case ConversationErrorType.UNAUTHORIZED:
        return CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED;
      case ConversationErrorType.NOT_FOUND:
        return CONVERSATION_ERROR_MESSAGES.NOT_FOUND;
      case ConversationErrorType.INVALID_DATA:
        return CONVERSATION_ERROR_MESSAGES.INVALID_DATA;
      default:
        return '操作失败，请稍后重试';
    }
  }

  /**
   * 检查操作是否应该重试
   * @param error 错误对象
   * @returns boolean 是否应该重试
   */
  private static shouldRetryOperation(error: any): boolean {
    // 网络错误可以重试
    if (error?.type === ConversationErrorType.NETWORK_ERROR) return true;
    if (error?.code === 'NETWORK_ERROR') return true;
    
    // 服务器错误可以重试
    if (error?.code === 'SERVER_ERROR') return true;
    
    // 认证错误不重试
    if (error?.type === ConversationErrorType.UNAUTHORIZED) return false;
    if (error?.code === 'UNAUTHORIZED') return false;
    
    // 数据验证错误不重试
    if (error?.type === ConversationErrorType.INVALID_DATA) return false;
    if (error?.code === 'VALIDATION_ERROR') return false;
    
    // 其他错误默认不重试
    return false;
  }
}