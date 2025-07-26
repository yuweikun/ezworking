'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  ConversationContextType, 
  Conversation, 
  ConversationError,
  ConversationErrorType 
} from '../types/conversation';
import { ConversationService } from '../services/conversation-service';
import { useAuth } from './auth-context';
import { CONVERSATION_ERROR_MESSAGES } from '../types/constants';
import { ErrorHandler } from '../lib/error-handler';

// 重试操作的辅助函数（带指数退避）
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  isOnline: () => boolean = () => true
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 如果是网络错误且当前离线，不进行重试
      if (!isOnline()) {
        throw error;
      }
      
      // 指数退避延迟
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// 创建会话上下文
const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

// ConversationProvider组件的Props类型
interface ConversationProviderProps {
  children: ReactNode;
}

// ConversationProvider组件
export function ConversationProvider({ children }: ConversationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  // 状态管理
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<ConversationError | null>(null);

  // 清除错误状态
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 创建会话错误对象
  const createError = useCallback((type: ConversationErrorType, message: string, details?: any): ConversationError => {
    return { type, message, details };
  }, []);

  // 检查网络连接状态
  const isOnline = useCallback(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }, []);

  // 获取会话列表
  const fetchConversations = useCallback(async (options: { 
    showError?: boolean;
    silent?: boolean;
  } = {}) => {
    if (!isAuthenticated || !user?.id) {
      setConversations([]);
      return;
    }

    const { showError = false, silent = false } = options;

    try {
      if (!silent) {
        setLoading(true);
      }
      clearError();
      
      // 使用增强的服务方法
      const fetchedConversations = await ConversationService.fetchConversations(
        user.id,
        { 
          showError,
          retryOnFailure: true
        }
      );
      
      setConversations(fetchedConversations);
    } catch (err: any) {
      console.error('获取会话列表失败:', err);
      const conversationError = err as ConversationError;
      setError(conversationError);
      
      // 如果是认证错误，清空会话列表
      if (conversationError.type === ConversationErrorType.UNAUTHORIZED) {
        setConversations([]);
        setActiveConversationId(null);
      }
      
      // 如果不是静默模式且需要显示错误，使用ErrorHandler
      if (!silent && showError) {
        ErrorHandler.showError(conversationError, {
          showNotification: true,
          fallbackAction: () => fetchConversations({ ...options })
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, user?.id, clearError]);

  // 创建新会话
  const createConversation = useCallback(async (
    title?: string,
    options: {
      showSuccess?: boolean;
      showError?: boolean;
      autoSelect?: boolean;
    } = {}
  ) => {
    if (!isAuthenticated || !user?.id) {
      const error = createError(
        ConversationErrorType.UNAUTHORIZED,
        CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED
      );
      setError(error);
      
      ErrorHandler.showError(error, { showMessage: true });
      throw error;
    }

    const { showSuccess = true, showError = true, autoSelect = true } = options;

    try {
      setLoading(true);
      clearError();
      
      const newConversation = await ConversationService.createConversation(
        user.id, 
        title,
        { showSuccess, showError, retryOnFailure: true }
      );
      
      // 创建成功后刷新会话列表以确保数据一致性
      console.log('🔄 创建会话成功，刷新会话列表...');
      await fetchConversations({ showError: false, silent: true });
      
      // 自动选中新创建的会话
      if (autoSelect) {
        setActiveConversationId(newConversation.key);
      }
      
      return newConversation;
    } catch (err: any) {
      console.error('创建会话失败:', err);
      const conversationError = err as ConversationError;
      setError(conversationError);
      
      // 错误已在服务层处理，这里不重复显示
      throw conversationError;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, clearError, createError]);

  // 删除会话
  const deleteConversation = useCallback(async (
    conversationId: string,
    options: {
      showSuccess?: boolean;
      showError?: boolean;
      optimistic?: boolean;
    } = {}
  ) => {
    if (!isAuthenticated || !user?.id) {
      const error = createError(
        ConversationErrorType.UNAUTHORIZED,
        CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED
      );
      setError(error);
      
      ErrorHandler.showError(error, { showMessage: true });
      throw error;
    }

    const { showSuccess = true, showError = true, optimistic = true } = options;

    // 保存原始状态用于回滚
    const originalConversations = conversations;
    const originalActiveId = activeConversationId;

    const rollback = () => {
      setConversations(originalConversations);
      setActiveConversationId(originalActiveId);
    };

    try {
      setLoading(true);
      clearError();
      
      if (optimistic) {
        // 乐观更新：先更新UI
        setConversations(prev => prev.filter(conv => conv.key !== conversationId));
        
        // 如果删除的是当前活跃会话，清除活跃状态
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
        }
      }
      
      await ConversationService.deleteConversation(conversationId, {
        showSuccess,
        showError,
        retryOnFailure: true,
        optimistic,
        rollback: optimistic ? rollback : undefined
      });
      
      if (!optimistic) {
        // 非乐观更新：操作成功后更新UI
        setConversations(prev => prev.filter(conv => conv.key !== conversationId));
        
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
        }
      }
    } catch (err: any) {
      console.error('删除会话失败:', err);
      const conversationError = err as ConversationError;
      setError(conversationError);
      
      // 乐观更新模式下，错误已在服务层处理（包括回滚）
      // 非乐观更新模式下，需要显示错误
      if (!optimistic && showError) {
        ErrorHandler.showError(conversationError, { showMessage: true });
      }
      
      throw conversationError;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, activeConversationId, conversations, clearError, createError]);

  // 更新会话
  const updateConversation = useCallback(async (conversationId: string, updates: Partial<Conversation>) => {
    if (!isAuthenticated || !user?.id) {
      const error = createError(
        ConversationErrorType.UNAUTHORIZED,
        CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED
      );
      setError(error);
      throw error;
    }

    try {
      setLoading(true);
      clearError();
      
      // 只支持标题更新
      const updateData: { title?: string } = {};
      if (updates.label && typeof updates.label === 'string') {
        updateData.title = updates.label;
      }
      
      const updatedConversation = await ConversationService.updateConversation(conversationId, updateData);
      
      // 更新成功后刷新会话列表以确保数据一致性
      console.log('🔄 更新会话成功，刷新会话列表...');
      await fetchConversations({ showError: false, silent: true });
      
      return updatedConversation;
    } catch (err: any) {
      console.error('更新会话失败:', err);
      const conversationError = err as ConversationError;
      setError(conversationError);
      throw conversationError;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, clearError, createError]);

  // 设置活跃会话
  const setActiveConversation = useCallback((conversationId: string) => {
    // 验证会话是否存在
    const conversationExists = conversations.some(conv => conv.key === conversationId);
    if (conversationExists) {
      setActiveConversationId(conversationId);
      clearError();
    } else {
      const error = createError(
        ConversationErrorType.NOT_FOUND,
        CONVERSATION_ERROR_MESSAGES.NOT_FOUND,
        { conversationId }
      );
      setError(error);
    }
  }, [conversations, clearError, createError]);

  // 刷新会话列表（手动刷新）
  const refreshConversations = useCallback(async (options: {
    showSuccess?: boolean;
    force?: boolean;
  } = {}) => {
    const { showSuccess = false, force = false } = options;
    
    try {
      await fetchConversations({ 
        showError: true,
        silent: false
      });
      
      if (showSuccess) {
        ErrorHandler.showSuccess('会话列表已刷新');
      }
    } catch (error) {
      // 错误已在fetchConversations中处理
      console.error('刷新会话列表失败:', error);
    }
  }, [fetchConversations]);

  // 批量删除会话
  const batchDeleteConversations = useCallback(async (
    conversationIds: string[],
    options: {
      showProgress?: boolean;
      showSummary?: boolean;
    } = {}
  ) => {
    if (!isAuthenticated || !user?.id) {
      const error = createError(
        ConversationErrorType.UNAUTHORIZED,
        CONVERSATION_ERROR_MESSAGES.UNAUTHORIZED
      );
      setError(error);
      ErrorHandler.showError(error, { showMessage: true });
      throw error;
    }

    try {
      setLoading(true);
      clearError();

      const result = await ConversationService.batchDeleteConversations(
        conversationIds,
        options
      );

      // 从列表中移除成功删除的会话
      if (result.success.length > 0) {
        setConversations(prev => 
          prev.filter(conv => !result.success.includes(conv.key))
        );

        // 如果当前活跃会话被删除，清除活跃状态
        if (activeConversationId && result.success.includes(activeConversationId)) {
          setActiveConversationId(null);
        }
      }

      return result;
    } catch (err: any) {
      console.error('批量删除会话失败:', err);
      const conversationError = err as ConversationError;
      setError(conversationError);
      ErrorHandler.showError(conversationError, { showMessage: true });
      throw conversationError;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, activeConversationId, clearError, createError]);



  // 处理网络连接状态变化
  const handleOnlineStatusChange = useCallback(() => {
    if (navigator.onLine && isAuthenticated && user?.id) {
      // 网络恢复时重新获取会话列表
      fetchConversations();
    }
  }, [isAuthenticated, user?.id, fetchConversations]);

  // 监听认证状态变化，自动获取会话列表
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchConversations();
    } else {
      // 用户未认证时清空状态
      setConversations([]);
      setActiveConversationId(null);
      clearError();
    }
  }, [isAuthenticated, user?.id, fetchConversations, clearError]);

  // 监听网络状态变化
  useEffect(() => {
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', () => {
      // 网络断开时可以显示离线状态，但不清空数据
      console.log('网络连接已断开');
    });

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', () => {});
    };
  }, [handleOnlineStatusChange]);

  // 实时更新会话时间戳（当有新消息时）
  const updateConversationTimestamp = useCallback((conversationId: string, timestamp?: number) => {
    const newTimestamp = timestamp || Date.now();
    
    setConversations(prev => {
      const updatedConversations = prev.map(conv => 
        conv.key === conversationId 
          ? { ...conv, timestamp: newTimestamp }
          : conv
      );
      
      // 按时间戳重新排序（最新的在前）
      return updatedConversations.sort((a, b) => b.timestamp - a.timestamp);
    });
  }, []);

  // 更新会话消息数量和最后消息预览
  const updateConversationMessage = useCallback((
    conversationId: string, 
    messageCount?: number, 
    lastMessage?: string,
    timestamp?: number
  ) => {
    const newTimestamp = timestamp || Date.now();
    
    setConversations(prev => {
      const updatedConversations = prev.map(conv => 
        conv.key === conversationId 
          ? { 
              ...conv, 
              timestamp: newTimestamp,
              ...(messageCount !== undefined && { messageCount }),
              ...(lastMessage !== undefined && { lastMessage })
            }
          : conv
      );
      
      // 按时间戳重新排序（最新的在前）
      return updatedConversations.sort((a, b) => b.timestamp - a.timestamp);
    });
  }, []);

  // 批量更新会话状态
  const batchUpdateConversations = useCallback((updates: Array<{
    conversationId: string;
    updates: Partial<Conversation>;
  }>) => {
    setConversations(prev => {
      let updatedConversations = [...prev];
      
      updates.forEach(({ conversationId, updates: convUpdates }) => {
        updatedConversations = updatedConversations.map(conv => 
          conv.key === conversationId 
            ? { ...conv, ...convUpdates }
            : conv
        );
      });
      
      // 按时间戳重新排序（最新的在前）
      return updatedConversations.sort((a, b) => b.timestamp - a.timestamp);
    });
  }, []);

  // 同步会话状态（确保数据一致性）
  const syncConversationState = useCallback(async (conversationId: string) => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    try {
      // 重新获取特定会话的最新状态
      const allConversations = await ConversationService.fetchConversations(user.id);
      const targetConversation = allConversations.find(conv => conv.key === conversationId);
      
      if (targetConversation) {
        setConversations(prev => {
          const updatedConversations = prev.map(conv => 
            conv.key === conversationId ? targetConversation : conv
          );
          return updatedConversations.sort((a, b) => b.timestamp - a.timestamp);
        });
      }
    } catch (error) {
      console.warn('同步会话状态失败:', error);
      // 同步失败不影响主要功能，只记录警告
    }
  }, [isAuthenticated, user?.id]);

  // 全量同步所有会话状态
  const syncAllConversations = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    try {
      const latestConversations = await ConversationService.fetchConversations(user.id);
      setConversations(latestConversations);
    } catch (error) {
      console.warn('全量同步会话状态失败:', error);
    }
  }, [isAuthenticated, user?.id]);

  // 智能合并会话状态（保留本地更新，同步远程变更）
  const mergeConversationState = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    try {
      const remoteConversations = await ConversationService.fetchConversations(user.id);
      
      setConversations(prev => {
        // 创建一个映射来快速查找远程会话
        const remoteMap = new Map(remoteConversations.map(conv => [conv.key, conv]));
        
        // 合并逻辑：保留本地的时间戳更新，但同步远程的其他变更
        const mergedConversations = prev.map(localConv => {
          const remoteConv = remoteMap.get(localConv.key);
          if (remoteConv) {
            // 如果本地时间戳更新，保留本地时间戳，否则使用远程时间戳
            const shouldKeepLocalTimestamp = localConv.timestamp > new Date(remoteConv.timestamp || 0).getTime();
            
            return {
              ...remoteConv,
              timestamp: shouldKeepLocalTimestamp ? localConv.timestamp : remoteConv.timestamp,
              messageCount: localConv.messageCount || remoteConv.messageCount,
              lastMessage: localConv.lastMessage || remoteConv.lastMessage
            };
          }
          return localConv;
        });

        // 添加本地没有的远程会话
        const localKeys = new Set(prev.map(conv => conv.key));
        const newRemoteConversations = remoteConversations.filter(conv => !localKeys.has(conv.key));
        
        const finalConversations = [...mergedConversations, ...newRemoteConversations];
        return finalConversations.sort((a, b) => b.timestamp - a.timestamp);
      });
    } catch (error) {
      console.warn('智能合并会话状态失败:', error);
    }
  }, [isAuthenticated, user?.id]);

  // 上下文值
  const contextValue: ConversationContextType = {
    // 状态
    conversations,
    activeConversationId,
    loading,
    error,
    
    // 操作
    fetchConversations,
    createConversation,
    deleteConversation,
    updateConversation,
    setActiveConversation,
    clearError,
    refreshConversations,
  };

  // 扩展上下文值以包含内部更新函数
  const extendedContextValue = {
    ...contextValue,
    // 内部更新函数（供useConversationUpdates使用）
    updateConversationTimestamp,
    updateConversationMessage,
    batchUpdateConversations,
    syncConversationState,
    syncAllConversations,
    mergeConversationState,
    batchDeleteConversations,
    isOnline,
  };

  return (
    <ConversationContext.Provider value={extendedContextValue as any}>
      {children}
    </ConversationContext.Provider>
  );
}

// 使用会话上下文的Hook
export function useConversation(): ConversationContextType {
  const context = useContext(ConversationContext);
  
  if (context === undefined) {
    throw new Error('useConversation必须在ConversationProvider内部使用');
  }
  
  return context;
}

// 导出内部更新函数供其他组件使用
export function useConversationUpdates() {
  const context = useContext(ConversationContext);
  
  if (context === undefined) {
    throw new Error('useConversationUpdates必须在ConversationProvider内部使用');
  }
  
  // 获取扩展的上下文（包含内部更新函数）
  const extendedContext = context as any;
  
  // 返回用于实时更新的辅助函数
  return {
    // 更新会话时间戳
    updateTimestamp: (conversationId: string, timestamp?: number) => {
      extendedContext.updateConversationTimestamp?.(conversationId, timestamp);
    },
    
    // 更新会话消息信息
    updateMessage: (
      conversationId: string, 
      messageCount?: number, 
      lastMessage?: string,
      timestamp?: number
    ) => {
      extendedContext.updateConversationMessage?.(conversationId, messageCount, lastMessage, timestamp);
    },
    
    // 批量更新会话
    batchUpdate: (updates: Array<{
      conversationId: string;
      updates: Partial<Conversation>;
    }>) => {
      extendedContext.batchUpdateConversations?.(updates);
    },
    
    // 同步会话状态
    syncConversation: (conversationId: string) => {
      extendedContext.syncConversationState?.(conversationId);
    },
    
    // 全量同步所有会话
    syncAllConversations: () => {
      extendedContext.syncAllConversations?.();
    },
    
    // 智能合并会话状态
    mergeConversationState: () => {
      extendedContext.mergeConversationState?.();
    },
    
    // 检查网络状态
    isOnline: () => {
      return extendedContext.isOnline?.() ?? true;
    }
  };
}