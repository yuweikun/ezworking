import { httpClient } from "../lib";
import { API_ENDPOINTS, CONVERSATION_ERROR_MESSAGES } from "../types/constants";
import {
  Conversation,
  SessionResponse,
  GetSessionsResponse,
  CreateSessionRequest,
  DeleteSessionRequest,
  UpdateSessionRequest,
  ConversationError,
  ConversationErrorType,
} from "../types/conversation";
import {
  transformSessionToConversation,
  generateDefaultTitle,
  validateConversationTitle,
} from "../types/conversation-utils";
import { ApiError } from "../types/auth";
import { ErrorHandler } from "../lib/error-handler";

/**
 * 会话管理API服务类
 * 处理所有会话相关的API调用，与现有httpClient集成
 */
export class ConversationService {
  /**
   * 获取用户的会话列表
   * @param userId 用户ID
   * @param options 请求选项
   * @returns Promise<Conversation[]> 会话列表
   */
  static async fetchConversations(
    userId: string,
    options: {
      showError?: boolean;
      retryOnFailure?: boolean;
    } = {}
  ): Promise<Conversation[]> {
    const { showError = false, retryOnFailure = true } = options;

    const operation = async (): Promise<Conversation[]> => {
      if (!userId) {
        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: "Missing userId" }
        );
      }

      console.log("🔍 正在请求会话列表...", {
        endpoint: API_ENDPOINTS.SESSIONS,
        userId,
        hasToken: !!localStorage.getItem("auth_token"),
        tokenPreview:
          localStorage.getItem("auth_token")?.substring(0, 20) + "...",
      });

      try {
        const response = await httpClient.get<GetSessionsResponse>(
          API_ENDPOINTS.SESSIONS
        );

        console.log("📦 会话API响应:", {
          status: response.status,
          data: response.data,
        });

        // 检查响应格式
        if (!response.data || typeof response.data !== "object") {
          throw this.createConversationError(
            ConversationErrorType.INVALID_DATA,
            "服务器返回数据格式错误：响应不是对象",
            { response: response.data }
          );
        }

        if (!response.data.success) {
          throw this.createConversationError(
            ConversationErrorType.FETCH_FAILED,
            "服务器返回失败状态",
            { response: response.data }
          );
        }

        if (!response.data.data || !response.data.data.sessions) {
          throw this.createConversationError(
            ConversationErrorType.INVALID_DATA,
            "服务器返回数据格式错误：缺少sessions字段",
            { response: response.data }
          );
        }

        // 转换API响应数据为Conversation对象
        const conversations = response.data.data.sessions.map((session) =>
          transformSessionToConversation(session, userId)
        );

        console.log("✅ 会话数据转换完成:", {
          sessionCount: response.data.data.sessions.length,
          conversationCount: conversations.length,
        });

        return conversations;
      } catch (error: any) {
        console.error("❌ 会话API请求失败:", {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        throw error;
      }
    };

    try {
      if (retryOnFailure) {
        return await ErrorHandler.withNetworkCheck(
          () =>
            ErrorHandler.withRetry(operation, {
              maxRetries: 2,
              retryCondition: (error) => this.shouldRetryOperation(error),
            }),
          { showMessage: showError }
        );
      } else {
        return await operation();
      }
    } catch (error: any) {
      // 处理API错误并转换为ConversationError
      const conversationError = this.handleApiError(
        error,
        ConversationErrorType.FETCH_FAILED
      );

      if (showError) {
        ErrorHandler.showError(conversationError);
      }

      throw conversationError;
    }
  }

  /**
   * 创建新会话
   * @param userId 用户ID
   * @param title 会话标题（可选，默认生成）
   * @param options 创建选项
   * @returns Promise<Conversation> 新创建的会话
   */
  static async createConversation(
    userId: string,
    title?: string,
    options: {
      showSuccess?: boolean;
      showError?: boolean;
      retryOnFailure?: boolean;
    } = {}
  ): Promise<Conversation> {
    const {
      showSuccess = false,
      showError = true,
      retryOnFailure = true,
    } = options;

    const operation = async (): Promise<Conversation> => {
      if (!userId) {
        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: "Missing userId" }
        );
      }

      // 使用提供的标题或生成默认标题
      const conversationTitle = title || generateDefaultTitle();

      // 验证标题
      const titleValidation = validateConversationTitle(conversationTitle);
      if (!titleValidation.isValid) {
        const errorMessage =
          titleValidation.error === "EMPTY_TITLE"
            ? CONVERSATION_ERROR_MESSAGES.EMPTY_TITLE
            : CONVERSATION_ERROR_MESSAGES.TITLE_TOO_LONG;

        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          errorMessage,
          { reason: titleValidation.error }
        );
      }

      const createData: CreateSessionRequest = {
        user_id: userId,
        title: conversationTitle,
      };

      const response = await httpClient.post<SessionResponse>(
        API_ENDPOINTS.SESSIONS,
        createData
      );

      console.log("📝 会话创建成功，ID:", response.data.id);

      // 直接返回新创建的会话，刷新由上下文层处理
      return transformSessionToConversation(response.data, userId);
    };

    try {
      const result = retryOnFailure
        ? await ErrorHandler.withNetworkCheck(
            () =>
              ErrorHandler.withRetry(operation, {
                maxRetries: 1, // 创建操作只重试一次
                retryCondition: (error) => this.shouldRetryOperation(error),
              }),
            { showMessage: showError }
          )
        : await operation();

      if (showSuccess) {
        ErrorHandler.showSuccess("会话创建成功");
      }

      return result;
    } catch (error: any) {
      // 处理API错误并转换为ConversationError
      const conversationError = this.handleApiError(
        error,
        ConversationErrorType.CREATE_FAILED
      );

      if (showError) {
        ErrorHandler.showError(conversationError);
      }

      throw conversationError;
    }
  }

  /**
   * 删除会话
   * @param conversationId 会话ID
   * @param options 删除选项
   * @returns Promise<void>
   */
  static async deleteConversation(
    conversationId: string,
    options: {
      showSuccess?: boolean;
      showError?: boolean;
      retryOnFailure?: boolean;
      optimistic?: boolean;
      rollback?: () => void;
    } = {}
  ): Promise<void> {
    const {
      showSuccess = false,
      showError = true,
      retryOnFailure = true,
      optimistic = false,
      rollback,
    } = options;

    const operation = async (): Promise<void> => {
      if (!conversationId) {
        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: "Missing conversationId" }
        );
      }

      const deleteData = {
        sessionId: conversationId,
      };

      console.log("🗑️ 正在删除会话...", {
        conversationId,
        endpoint: `${API_ENDPOINTS.SESSIONS}/delete`,
        data: deleteData,
      });

      await httpClient.post(`${API_ENDPOINTS.SESSIONS}/delete`, deleteData);

      console.log("✅ 会话删除成功");
    };

    try {
      if (optimistic && rollback) {
        // 乐观更新模式
        await ErrorHandler.withOptimisticUpdate(
          () => {}, // 乐观更新已在调用方执行
          operation,
          rollback,
          { showMessage: showError }
        );
      } else if (retryOnFailure) {
        await ErrorHandler.withNetworkCheck(
          () =>
            ErrorHandler.withRetry(operation, {
              maxRetries: 1, // 删除操作只重试一次
              retryCondition: (error) => this.shouldRetryOperation(error),
            }),
          { showMessage: showError }
        );
      } else {
        await operation();
      }

      if (showSuccess) {
        ErrorHandler.showSuccess("会话删除成功");
      }
    } catch (error: any) {
      // 处理API错误并转换为ConversationError
      const conversationError = this.handleApiError(
        error,
        ConversationErrorType.DELETE_FAILED
      );

      if (showError) {
        ErrorHandler.showError(conversationError);
      }

      throw conversationError;
    }
  }

  /**
   * 更新会话
   * @param conversationId 会话ID
   * @param updates 更新数据
   * @param options 更新选项
   * @returns Promise<Conversation> 更新后的会话
   */
  static async updateConversation(
    conversationId: string,
    updates: { title?: string; label?: string },
    options: {
      showSuccess?: boolean;
      showError?: boolean;
      retryOnFailure?: boolean;
    } = {}
  ): Promise<Conversation> {
    const {
      showSuccess = false,
      showError = true,
      retryOnFailure = true,
    } = options;

    const operation = async (): Promise<Conversation> => {
      if (!conversationId) {
        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: "Missing conversationId" }
        );
      }

      // 支持 label 和 title 两种参数名（兼容前端调用）
      const title = updates.title || updates.label;

      // 验证更新数据
      if (title !== undefined) {
        const titleValidation = validateConversationTitle(title);
        if (!titleValidation.isValid) {
          const errorMessage =
            titleValidation.error === "EMPTY_TITLE"
              ? CONVERSATION_ERROR_MESSAGES.EMPTY_TITLE
              : CONVERSATION_ERROR_MESSAGES.TITLE_TOO_LONG;

          throw this.createConversationError(
            ConversationErrorType.INVALID_DATA,
            errorMessage,
            { reason: titleValidation.error }
          );
        }
      }

      const updateData = {
        sessionId: conversationId,
        title: title,
      };

      console.log("✏️ 正在更新会话...", {
        conversationId,
        endpoint: `${API_ENDPOINTS.SESSIONS}/update`,
        data: updateData,
      });

      const response = await httpClient.post<SessionResponse>(
        `${API_ENDPOINTS.SESSIONS}/update`,
        updateData
      );

      console.log("✅ 会话更新成功:", response.data);

      // 从响应中获取userId（这里需要从其他地方获取，因为API响应中没有userId）
      // 在实际使用中，userId应该从认证上下文中获取
      const userId = this.getCurrentUserId();

      return transformSessionToConversation(response.data, userId);
    };

    try {
      const result = retryOnFailure
        ? await ErrorHandler.withNetworkCheck(
            () =>
              ErrorHandler.withRetry(operation, {
                maxRetries: 1, // 更新操作只重试一次
                retryCondition: (error) => this.shouldRetryOperation(error),
              }),
            { showMessage: showError }
          )
        : await operation();

      if (showSuccess) {
        ErrorHandler.showSuccess("会话更新成功");
      }

      return result;
    } catch (error: any) {
      // 处理API错误并转换为ConversationError
      const conversationError = this.handleApiError(
        error,
        ConversationErrorType.UPDATE_FAILED
      );

      if (showError) {
        ErrorHandler.showError(conversationError);
      }

      throw conversationError;
    }
  }

  /**
   * 处理API错误并转换为ConversationError
   * @param error 原始错误
   * @param defaultType 默认错误类型
   * @returns ConversationError
   */
  private static handleApiError(
    error: any,
    defaultType: ConversationErrorType
  ): ConversationError {
    // 如果已经是ConversationError，直接抛出
    if (error && typeof error === "object" && "type" in error) {
      return error as ConversationError;
    }

    // 如果是ApiError（来自httpClient），转换为ConversationError
    if (error && typeof error === "object" && "error" in error) {
      const apiError = error as ApiError;

      // 根据API错误码映射到ConversationError类型
      let errorType = defaultType;
      let errorMessage = this.getErrorMessage(defaultType);

      switch (apiError.error) {
        case "UNAUTHORIZED":
          errorType = ConversationErrorType.UNAUTHORIZED;
          errorMessage = CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED;
          break;
        case "NETWORK_ERROR":
          errorType = ConversationErrorType.NETWORK_ERROR;
          errorMessage = CONVERSATION_ERROR_MESSAGES.NETWORK_ERROR;
          break;
        case "NOT_FOUND":
          errorType = ConversationErrorType.NOT_FOUND;
          errorMessage = CONVERSATION_ERROR_MESSAGES.NOT_FOUND;
          break;
        case "VALIDATION_ERROR":
          errorType = ConversationErrorType.INVALID_DATA;
          errorMessage =
            apiError.message || CONVERSATION_ERROR_MESSAGES.INVALID_DATA;
          break;
        default:
          // 使用API错误消息或默认消息
          errorMessage = apiError.message || errorMessage;
      }

      return this.createConversationError(errorType, errorMessage, {
        originalError: apiError,
      });
    }

    // 其他未知错误
    return this.createConversationError(
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
  private static createConversationError(
    type: ConversationErrorType,
    message: string,
    details?: any
  ): ConversationError {
    return {
      type,
      message,
      details,
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
        return CONVERSATION_ERROR_MESSAGES.FETCH_FAILED;
      case ConversationErrorType.CREATE_FAILED:
        return CONVERSATION_ERROR_MESSAGES.CREATE_FAILED;
      case ConversationErrorType.DELETE_FAILED:
        return CONVERSATION_ERROR_MESSAGES.DELETE_FAILED;
      case ConversationErrorType.UPDATE_FAILED:
        return CONVERSATION_ERROR_MESSAGES.UPDATE_FAILED;
      case ConversationErrorType.NETWORK_ERROR:
        return CONVERSATION_ERROR_MESSAGES.NETWORK_ERROR;
      case ConversationErrorType.UNAUTHORIZED:
        return CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED;
      case ConversationErrorType.NOT_FOUND:
        return CONVERSATION_ERROR_MESSAGES.NOT_FOUND;
      case ConversationErrorType.INVALID_DATA:
        return CONVERSATION_ERROR_MESSAGES.INVALID_DATA;
      default:
        return CONVERSATION_ERROR_MESSAGES.FETCH_FAILED;
    }
  }

  /**
   * 获取当前用户ID
   * 这是一个辅助方法，在实际使用中应该从认证上下文中获取
   * @returns 用户ID
   */
  private static getCurrentUserId(): string {
    try {
      const userInfo = localStorage.getItem("user_info");
      if (userInfo) {
        const user = JSON.parse(userInfo);
        return user.id || user.user_id || "";
      }
    } catch (error) {
      console.warn("Failed to get current user ID from localStorage:", error);
    }
    return "";
  }

  /**
   * 验证用户权限
   * 检查用户是否有权限访问指定会话
   * @param conversationId 会话ID
   * @param userId 用户ID
   * @returns Promise<boolean> 是否有权限
   */
  static async validateUserAccess(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // 获取用户的所有会话
      const conversations = await this.fetchConversations(userId);

      // 检查会话是否属于该用户
      return conversations.some(
        (conversation) => conversation.key === conversationId
      );
    } catch (error) {
      // 如果获取失败，默认拒绝访问
      console.warn("Failed to validate user access:", error);
      return false;
    }
  }

  /**
   * 批量删除会话
   * @param conversationIds 会话ID数组
   * @param options 删除选项
   * @returns Promise<{ success: string[]; failed: string[] }> 删除结果
   */
  static async batchDeleteConversations(
    conversationIds: string[],
    options: {
      showProgress?: boolean;
      showSummary?: boolean;
    } = {}
  ): Promise<{ success: string[]; failed: string[] }> {
    const { showProgress = true, showSummary = true } = options;

    const operations = conversationIds.map(
      (id) => () =>
        this.deleteConversation(id, { showError: false, showSuccess: false })
    );

    const { results, errors } = await ErrorHandler.handleBatchOperations(
      operations
    );

    const success = conversationIds.filter(
      (_, index) => !errors.some((e) => e.index === index)
    );
    const failed = errors.map((e) => conversationIds[e.index]);

    if (showSummary) {
      if (failed.length === 0) {
        ErrorHandler.showSuccess(`成功删除 ${success.length} 个会话`);
      } else {
        ErrorHandler.showWarning(
          `删除完成：${success.length} 个成功，${failed.length} 个失败`
        );
      }
    }

    return { success, failed };
  }

  /**
   * 检查操作是否应该重试
   * @param error 错误对象
   * @returns boolean 是否应该重试
   */
  private static shouldRetryOperation(error: any): boolean {
    // 网络错误可以重试
    if (error?.type === ConversationErrorType.NETWORK_ERROR) return true;
    if (error?.error === "NETWORK_ERROR") return true;

    // 服务器错误可以重试
    if (error?.error === "SERVER_ERROR") return true;

    // 认证错误不重试
    if (error?.type === ConversationErrorType.UNAUTHORIZED) return false;
    if (error?.error === "UNAUTHORIZED") return false;

    // 数据验证错误不重试
    if (error?.type === ConversationErrorType.INVALID_DATA) return false;
    if (error?.error === "VALIDATION_ERROR") return false;

    // 其他错误默认不重试
    return false;
  }
}
