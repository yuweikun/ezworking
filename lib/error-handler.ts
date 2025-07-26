import React from 'react';
import { message, notification } from 'antd';
import { ConversationError, ConversationErrorType } from '../types/conversation';
import { ApiError } from '../types/auth';
import { CONVERSATION_ERROR_MESSAGES } from '../types/constants';

/**
 * 错误恢复策略类型
 */
export interface ErrorRecoveryOptions {
  showNotification?: boolean;
  showMessage?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => void;
  onRetrySuccess?: () => void;
  onRetryFailed?: (error: any) => void;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * 错误处理和恢复工具类
 */
export class ErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      // 默认只对网络错误和服务器错误进行重试
      if (error?.type === ConversationErrorType.NETWORK_ERROR) return true;
      if (error?.code === 'NETWORK_ERROR') return true;
      if (error?.code === 'SERVER_ERROR') return true;
      return false;
    }
  };

  /**
   * 显示用户友好的错误信息
   * @param error 错误对象
   * @param options 显示选项
   */
  static showError(error: ConversationError | ApiError | Error, options: ErrorRecoveryOptions = {}) {
    const {
      showNotification = false,
      showMessage = true,
      fallbackAction
    } = options;

    const errorMessage = this.getErrorMessage(error);
    const errorTitle = this.getErrorTitle(error);

    if (showNotification) {
      notification.error({
        message: errorTitle,
        description: errorMessage,
        duration: 6,
        placement: 'topRight',
        onClick: fallbackAction
      });
    } else if (showMessage) {
      message.error(errorMessage, 4);
    }
  }

  /**
   * 显示成功信息
   * @param successMessage 成功消息
   * @param showNotification 是否显示通知
   */
  static showSuccess(successMessage: string, showNotification: boolean = false) {
    if (showNotification) {
      notification.success({
        message: '操作成功',
        description: successMessage,
        duration: 3,
        placement: 'topRight'
      });
    } else {
      message.success(successMessage, 3);
    }
  }

  /**
   * 显示警告信息
   * @param warningMessage 警告消息
   * @param showNotification 是否显示通知
   */
  static showWarning(warningMessage: string, showNotification: boolean = false) {
    if (showNotification) {
      notification.warning({
        message: '注意',
        description: warningMessage,
        duration: 4,
        placement: 'topRight'
      });
    } else {
      message.warning(warningMessage, 3);
    }
  }

  /**
   * 带重试机制的操作执行
   * @param operation 要执行的操作
   * @param config 重试配置
   * @param options 错误恢复选项
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    const {
      autoRetry = true,
      onRetrySuccess,
      onRetryFailed
    } = options;

    let lastError: any;
    let attempt = 0;

    while (attempt <= retryConfig.maxRetries) {
      try {
        const result = await operation();
        
        // 如果之前有重试，显示成功恢复消息
        if (attempt > 0 && onRetrySuccess) {
          onRetrySuccess();
        }
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        // 如果是最后一次尝试或不满足重试条件，直接抛出错误
        if (attempt > retryConfig.maxRetries || !retryConfig.retryCondition?.(error)) {
          if (onRetryFailed) {
            onRetryFailed(error);
          }
          throw error;
        }

        // 如果不启用自动重试，直接抛出错误
        if (!autoRetry) {
          throw error;
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
          retryConfig.maxDelay
        );

        // 等待后重试
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * 网络状态检查和处理
   * @param operation 需要网络的操作
   * @param options 错误恢复选项
   */
  static async withNetworkCheck<T>(
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    // 检查网络状态
    if (!this.isOnline()) {
      const offlineError: ConversationError = {
        type: ConversationErrorType.NETWORK_ERROR,
        message: '网络连接已断开，请检查网络后重试',
        details: { offline: true }
      };
      
      this.showError(offlineError, {
        ...options,
        showNotification: true
      });
      
      throw offlineError;
    }

    try {
      return await operation();
    } catch (error) {
      // 如果是网络错误，提供额外的网络状态信息
      if (this.isNetworkError(error)) {
        const enhancedError = {
          ...(error as any),
          details: {
            ...(error as any)?.details,
            networkStatus: navigator.onLine ? 'online' : 'offline',
            timestamp: Date.now()
          }
        };
        
        this.showError(enhancedError, {
          ...options,
          showNotification: true
        });
        
        throw enhancedError;
      }
      
      throw error;
    }
  }

  /**
   * 批量操作错误处理
   * @param operations 操作数组
   * @param options 错误恢复选项
   */
  static async handleBatchOperations<T>(
    operations: Array<() => Promise<T>>,
    options: ErrorRecoveryOptions = {}
  ): Promise<{ results: T[]; errors: any[] }> {
    const results: T[] = [];
    const errors: any[] = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        results.push(result);
      } catch (error) {
        errors.push({ index: i, error });
        
        // 显示单个操作的错误，但不中断整个批量操作
        this.showError(error as any, {
          ...options,
          showMessage: false, // 避免过多的错误消息
          showNotification: false
        });
      }
    }

    // 如果有错误，显示汇总信息
    if (errors.length > 0) {
      const errorMessage = `批量操作完成，${results.length} 个成功，${errors.length} 个失败`;
      this.showWarning(errorMessage, true);
    }

    return { results, errors };
  }

  /**
   * 乐观更新错误处理
   * @param optimisticUpdate 乐观更新函数
   * @param actualOperation 实际操作函数
   * @param rollback 回滚函数
   * @param options 错误恢复选项
   */
  static async withOptimisticUpdate<T>(
    optimisticUpdate: () => void,
    actualOperation: () => Promise<T>,
    rollback: () => void,
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    // 先执行乐观更新
    optimisticUpdate();

    try {
      // 执行实际操作
      const result = await actualOperation();
      return result;
    } catch (error) {
      // 操作失败，回滚乐观更新
      rollback();
      
      // 显示错误信息
      this.showError(error as any, options);
      
      throw error;
    }
  }

  /**
   * 获取错误消息
   * @param error 错误对象
   */
  private static getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }

    if (error?.type) {
      const conversationError = error as ConversationError;
      switch (conversationError.type) {
        case ConversationErrorType.NETWORK_ERROR:
          return CONVERSATION_ERROR_MESSAGES.NETWORK_ERROR;
        case ConversationErrorType.UNAUTHORIZED:
          return CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED;
        case ConversationErrorType.NOT_FOUND:
          return CONVERSATION_ERROR_MESSAGES.NOT_FOUND;
        case ConversationErrorType.FETCH_FAILED:
          return CONVERSATION_ERROR_MESSAGES.FETCH_FAILED;
        case ConversationErrorType.CREATE_FAILED:
          return CONVERSATION_ERROR_MESSAGES.CREATE_FAILED;
        case ConversationErrorType.DELETE_FAILED:
          return CONVERSATION_ERROR_MESSAGES.DELETE_FAILED;
        case ConversationErrorType.UPDATE_FAILED:
          return CONVERSATION_ERROR_MESSAGES.UPDATE_FAILED;
        case ConversationErrorType.INVALID_DATA:
          return CONVERSATION_ERROR_MESSAGES.INVALID_DATA;
        default:
          return '操作失败，请稍后重试';
      }
    }

    return '发生未知错误，请稍后重试';
  }

  /**
   * 获取错误标题
   * @param error 错误对象
   */
  private static getErrorTitle(error: any): string {
    if (error?.type) {
      const conversationError = error as ConversationError;
      switch (conversationError.type) {
        case ConversationErrorType.NETWORK_ERROR:
          return '网络错误';
        case ConversationErrorType.UNAUTHORIZED:
          return '认证失败';
        case ConversationErrorType.NOT_FOUND:
          return '资源不存在';
        case ConversationErrorType.FETCH_FAILED:
          return '获取数据失败';
        case ConversationErrorType.CREATE_FAILED:
          return '创建失败';
        case ConversationErrorType.DELETE_FAILED:
          return '删除失败';
        case ConversationErrorType.UPDATE_FAILED:
          return '更新失败';
        case ConversationErrorType.INVALID_DATA:
          return '数据错误';
        default:
          return '操作失败';
      }
    }

    return '错误';
  }

  /**
   * 检查是否为网络错误
   * @param error 错误对象
   */
  private static isNetworkError(error: any): boolean {
    return error?.type === ConversationErrorType.NETWORK_ERROR ||
           error?.code === 'NETWORK_ERROR' ||
           error?.message?.includes('网络') ||
           error?.message?.includes('network');
  }

  /**
   * 检查网络连接状态
   */
  private static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建错误恢复按钮配置
   * @param retryAction 重试操作
   * @param fallbackAction 备用操作
   */
  static createRecoveryActions(
    retryAction?: () => void,
    fallbackAction?: () => void
  ) {
    const actions: any[] = [];

    if (retryAction) {
      actions.push({
        text: '重试',
        onClick: retryAction,
        type: 'primary'
      });
    }

    if (fallbackAction) {
      actions.push({
        text: '其他方式',
        onClick: fallbackAction,
        type: 'default'
      });
    }

    return actions;
  }

  /**
   * 错误边界处理
   * @param error 组件错误
   * @param errorInfo 错误信息
   */
  static handleComponentError(error: Error, errorInfo: any) {
    console.error('Component Error:', error, errorInfo);
    
    // 显示用户友好的错误信息
    notification.error({
      message: '页面出现错误',
      description: '页面遇到了一些问题，请刷新页面重试',
      duration: 0, // 不自动关闭
      placement: 'topRight',
      btn: React.createElement('button', {
        onClick: () => window.location.reload(),
        style: {
          background: '#1677ff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 12px',
          cursor: 'pointer'
        }
      }, '刷新页面')
    });
  }
}