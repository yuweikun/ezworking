import { httpClient } from '../lib';
import { API_ENDPOINTS, CONVERSATION_ERROR_MESSAGES } from '../types/constants';
import { 
  Conversation,
  SessionResponse,
  CreateSessionRequest,
  DeleteSessionRequest,
  UpdateSessionRequest,
  ConversationError,
  ConversationErrorType
} from '../types/conversation';
import { 
  transformSessionToConversation,
  generateDefaultTitle,
  validateConversationTitle
} from '../types/conversation-utils';
import { ApiError } from '../types/auth';
import { ErrorHandler } from '../lib/error-handler';

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
      useCache?: boolean; 
      showError?: boolean;
      retryOnFailure?: boolean;
    } = {}
  ): Promise<Conversation[]> {
    const { useCache = false, showError = false, retryOnFailure = true } = options;

    const operation = async (): Promise<Conversation[]> => {
      if (!userId) {
        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: 'Missing userId' }
        );
      }

      // 如果启用缓存，先尝试从缓存获取
      if (useCache) {
        const cached = this.getCachedConversations(userId);
        if (cached) {
          return cached;
        }
      }

      const response = await httpClient.get<SessionResponse[]>(
        API_ENDPOINTS.SESSIONS,
        {
          params: { user_id: userId }
        }
      );

      // 转换API响应数据为Conversation对象
      const conversations = response.data.map(session => 
        transformSessionToConversation(session, userId)
      );

      // 缓存结果
      this.setCachedConversations(userId, conversations);

      return conversations;
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
    } catch (error: any) {
      // 处理API错误并转换为ConversationError
      const conversationError = this.handleApiError(error, ConversationErrorType.FETCH_FAILED);
      
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
    const { showSuccess = false, showError = true, retryOnFailure = true } = options;

    const operation = async (): Promise<Conversation> => {
      if (!userId) {
        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: 'Missing userId' }
        );
      }

      // 使用提供的标题或生成默认标题
      const conversationTitle = title || generateDefaultTitle();
      
      // 验证标题
      const titleValidation = validateConversationTitle(conversationTitle);
      if (!titleValidation.valid) {
        const errorMessage = titleValidation.error === 'EMPTY_TITLE' 
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
        title: conversationTitle
      };

      const response = await httpClient.post<SessionResponse>(
        API_ENDPOINTS.SESSIONS,
        createData
      );

      // 转换API响应数据为Conversation对象
      const newConversation = transformSessionToConversation(response.data, userId);
      
      // 更新缓存
      this.addToCache(userId, newConversation);
      
      return newConversation;
    };

    try {
      const result = retryOnFailure 
        ? await ErrorHandler.withNetworkCheck(
            () => ErrorHandler.withRetry(operation, {
              maxRetries: 1, // 创建操作只重试一次
              retryCondition: (error) => this.shouldRetryOperation(error)
            }),
            { showMessage: showError }
          )
        : await operation();

      if (showSuccess) {
        ErrorHandler.showSuccess('会话创建成功');
      }

      return result;
    } catch (error: any) {
      // 处理API错误并转换为ConversationError
      const conversationError = this.handleApiError(error, ConversationErrorType.CREATE_FAILED);
      
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
      rollback
    } = options;

    const operation = async (): Promise<void> => {
      if (!conversationId) {
        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: 'Missing conversationId' }
        );
      }

      const deleteData: DeleteSessionRequest = {
        action: "delete"
      };

      await httpClient.post(
        `${API_ENDPOINTS.SESSIONS}/${conversationId}`,
        deleteData
      );

      // 从缓存中移除
      this.removeFromCache(conversationId);
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
          () => ErrorHandler.withRetry(operation, {
            maxRetries: 1, // 删除操作只重试一次
            retryCondition: (error) => this.shouldRetryOperation(error)
          }),
          { showMessage: showError }
        );
      } else {
        await operation();
      }

      if (showSuccess) {
        ErrorHandler.showSuccess('会话删除成功');
      }
    } catch (error: any) {
      // 处理API错误并转换为ConversationError
      const conversationError = this.handleApiError(error, ConversationErrorType.DELETE_FAILED);
      
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
   * @returns Promise<Conversation> 更新后的会话
   */
  static async updateConversation(
    conversationId: string, 
    updates: { title?: string }
  ): Promise<Conversation> {
    try {
      if (!conversationId) {
        throw this.createConversationError(
          ConversationErrorType.INVALID_DATA,
          CONVERSATION_ERROR_MESSAGES.INVALID_DATA,
          { reason: 'Missing conversationId' }
        );
      }

      // 验证更新数据
      if (updates.title !== undefined) {
        const titleValidation = validateConversationTitle(updates.title);
        if (!titleValidation.valid) {
          const errorMessage = titleValidation.error === 'EMPTY_TITLE' 
            ? CONVERSATION_ERROR_MESSAGES.EMPTY_TITLE
            : CONVERSATION_ERROR_MESSAGES.TITLE_TOO_LONG;
          
          throw this.createConversationError(
            ConversationErrorType.INVALID_DATA,
            errorMessage,
            { reason: titleValidation.error }
          );
        }
      }

      const updateData: UpdateSessionRequest = {
        title: updates.title
      };

      const response = await httpClient.post<SessionResponse>(
        `${API_ENDPOINTS.SESSIONS}/${conversationId}`,
        updateData
      );

      // 从响应中获取userId（这里需要从其他地方获取，因为API响应中没有userId）
      // 在实际使用中，userId应该从认证上下文中获取
      const userId = this.getCurrentUserId();
      
      return transformSessionToConversation(response.data, userId);
    } catch (error) {
      // 处理API错误并转换为ConversationError
      throw this.handleApiError(error, ConversationErrorType.UPDATE_FAILED);
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
      
      // 根据API错误码映射到ConversationError类型
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
          // 使用API错误消息或默认消息
          errorMessage = apiError.message || errorMessage;
      }

      return this.createConversationError(errorType, errorMessage, { 
        originalError: apiError 
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
      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        return user.id || user.user_id || '';
      }
    } catch (error) {
      console.warn('Failed to get current user ID from localStorage:', error);
    }
    return '';
  }

  /**
   * 验证用户权限
   * 检查用户是否有权限访问指定会话
   * @param conversationId 会话ID
   * @param userId 用户ID
   * @returns Promise<boolean> 是否有权限
   */
  static async validateUserAccess(conversationId: string, userId: string): Promise<boolean> {
    try {
      // 获取用户的所有会话
      const conversations = await this.fetchConversations(userId, { useCache: true });
      
      // 检查会话是否属于该用户
      return conversations.some(conversation => conversation.key === conversationId);
    } catch (error) {
      // 如果获取失败，默认拒绝访问
      console.warn('Failed to validate user access:', error);
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

    const operations = conversationIds.map(id => 
      () => this.deleteConversation(id, { showError: false, showSuccess: false })
    );

    const { results, errors } = await ErrorHandler.handleBatchOperations(operations);

    const success = conversationIds.filter((_, index) => !errors.some(e => e.index === index));
    const failed = errors.map(e => conversationIds[e.index]);

    if (showSummary) {
      if (failed.length === 0) {
        ErrorHandler.showSuccess(`成功删除 ${success.length} 个会话`);
      } else {
        ErrorHandler.showWarning(`删除完成：${success.length} 个成功，${failed.length} 个失败`);
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

  // ==================== 缓存管理 ====================
  private static readonly CACHE_KEY_PREFIX = 'conversations_cache_';
  private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟

  /**
   * 获取缓存的会话列表
   * @param userId 用户ID
   * @returns Conversation[] | null 缓存的会话列表或null
   */
  private static getCachedConversations(userId: string): Conversation[] | null {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      
      // 检查缓存是否过期
      if (Date.now() - timestamp > this.CACHE_EXPIRY) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Failed to get cached conversations:', error);
      return null;
    }
  }

  /**
   * 设置会话列表缓存
   * @param userId 用户ID
   * @param conversations 会话列表
   */
  private static setCachedConversations(userId: string, conversations: Conversation[]): void {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}`;
      const cacheData = {
        data: conversations,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache conversations:', error);
    }
  }

  /**
   * 添加会话到缓存
   * @param userId 用户ID
   * @param conversation 新会话
   */
  private static addToCache(userId: string, conversation: Conversation): void {
    try {
      const cached = this.getCachedConversations(userId);
      if (cached) {
        const updated = [conversation, ...cached];
        this.setCachedConversations(userId, updated);
      }
    } catch (error) {
      console.warn('Failed to add conversation to cache:', error);
    }
  }

  /**
   * 从缓存中移除会话
   * @param conversationId 会话ID
   */
  private static removeFromCache(conversationId: string): void {
    try {
      // 遍历所有用户的缓存
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_KEY_PREFIX)
      );
      
      keys.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const filtered = data.filter((conv: Conversation) => conv.key !== conversationId);
          
          if (filtered.length !== data.length) {
            localStorage.setItem(key, JSON.stringify({ data: filtered, timestamp }));
          }
        }
      });
    } catch (error) {
      console.warn('Failed to remove conversation from cache:', error);
    }
  }

  /**
   * 清除所有缓存
   */
  static clearCache(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_KEY_PREFIX)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear conversation cache:', error);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  static getCacheStats(): { totalUsers: number; totalConversations: number; cacheSize: string } {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_KEY_PREFIX)
      );
      
      let totalConversations = 0;
      let totalSize = 0;
      
      keys.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { data } = JSON.parse(cached);
          totalConversations += data.length;
          totalSize += cached.length;
        }
      });
      
      return {
        totalUsers: keys.length,
        totalConversations,
        cacheSize: `${(totalSize / 1024).toFixed(2)} KB`
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { totalUsers: 0, totalConversations: 0, cacheSize: '0 KB' };
    }
  }
}