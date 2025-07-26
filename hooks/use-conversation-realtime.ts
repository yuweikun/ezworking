import { useCallback, useEffect, useRef } from 'react';
import { useConversationUpdates } from '../contexts/conversation-context';
import { MessageService } from '../services/message-service';
import { useAuth } from '../contexts/auth-context';

/**
 * 实时会话更新Hook
 * 提供消息添加时的会话状态同步功能
 */
export function useConversationRealtime() {
  const { user } = useAuth();
  const {
    updateTimestamp,
    updateMessage,
    batchUpdate,
    syncConversation,
    isOnline
  } = useConversationUpdates();

  // 防抖定时器引用
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // 批量更新队列
  const updateQueue = useRef<Map<string, {
    conversationId: string;
    messageCount?: number;
    lastMessage?: string;
    timestamp: number;
  }>>(new Map());

  /**
   * 当消息添加到会话时更新会话状态
   * @param conversationId 会话ID
   * @param messageContent 消息内容（用于预览）
   * @param messageRole 消息角色
   * @param options 更新选项
   */
  const onMessageAdded = useCallback(async (
    conversationId: string,
    messageContent: string,
    messageRole: 'user' | 'assistant',
    options: {
      skipSync?: boolean; // 跳过同步（用于避免重复同步）
      batchUpdate?: boolean; // 批量更新模式
      customTimestamp?: number; // 自定义时间戳
    } = {}
  ) => {
    if (!conversationId || !user?.id) {
      return;
    }

    const { skipSync = false, batchUpdate: useBatchUpdate = false, customTimestamp } = options;
    const timestamp = customTimestamp || Date.now();

    try {
      // 生成消息预览（限制长度）
      const lastMessage = messageContent.length > 50 
        ? `${messageContent.substring(0, 50)}...` 
        : messageContent;

      if (useBatchUpdate) {
        // 批量更新模式：将更新添加到队列
        updateQueue.current.set(conversationId, {
          conversationId,
          lastMessage,
          timestamp
        });
        
        // 设置防抖定时器，延迟执行批量更新
        const existingTimer = debounceTimers.current.get(conversationId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        const timer = setTimeout(() => {
          flushBatchUpdates();
          debounceTimers.current.delete(conversationId);
        }, 300); // 300ms防抖
        
        debounceTimers.current.set(conversationId, timer);
      } else {
        // 立即更新模式
        if (!skipSync && isOnline()) {
          // 获取最新的消息数量
          try {
            const messageCount = await MessageService.getMessageCount(user.id, conversationId);
            updateMessage(conversationId, messageCount, lastMessage, timestamp);
          } catch (error) {
            // 如果获取消息数量失败，仍然更新时间戳和预览
            console.warn('Failed to get message count, updating without count:', error);
            updateMessage(conversationId, undefined, lastMessage, timestamp);
          }
        } else {
          // 离线模式或跳过同步时，只更新本地状态
          updateMessage(conversationId, undefined, lastMessage, timestamp);
        }
      }
    } catch (error) {
      console.error('Failed to update conversation on message added:', error);
      // 即使更新失败，也要更新时间戳以保持排序正确
      updateTimestamp(conversationId, timestamp);
    }
  }, [user?.id, updateMessage, updateTimestamp, isOnline]);

  /**
   * 刷新批量更新队列
   */
  const flushBatchUpdates = useCallback(async () => {
    if (updateQueue.current.size === 0 || !user?.id) {
      return;
    }

    const updates = Array.from(updateQueue.current.values());
    updateQueue.current.clear();

    try {
      // 如果在线，尝试获取准确的消息数量
      if (isOnline()) {
        const updatesWithCounts = await Promise.allSettled(
          updates.map(async (update) => {
            try {
              const messageCount = await MessageService.getMessageCount(user.id, update.conversationId);
              return {
                conversationId: update.conversationId,
                updates: {
                  timestamp: update.timestamp,
                  messageCount,
                  lastMessage: update.lastMessage
                }
              };
            } catch (error) {
              // 如果获取失败，返回不包含消息数量的更新
              return {
                conversationId: update.conversationId,
                updates: {
                  timestamp: update.timestamp,
                  lastMessage: update.lastMessage
                }
              };
            }
          })
        );

        const successfulUpdates = updatesWithCounts
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value);

        if (successfulUpdates.length > 0) {
          batchUpdate(successfulUpdates);
        }
      } else {
        // 离线模式，只更新本地状态
        const offlineUpdates = updates.map(update => ({
          conversationId: update.conversationId,
          updates: {
            timestamp: update.timestamp,
            lastMessage: update.lastMessage
          }
        }));
        
        batchUpdate(offlineUpdates);
      }
    } catch (error) {
      console.error('Failed to flush batch updates:', error);
      
      // 如果批量更新失败，尝试单独更新时间戳
      updates.forEach(update => {
        updateTimestamp(update.conversationId, update.timestamp);
      });
    }
  }, [user?.id, batchUpdate, updateTimestamp, isOnline]);

  /**
   * 当用户开始输入时更新会话活动状态
   * @param conversationId 会话ID
   */
  const onUserTyping = useCallback((conversationId: string) => {
    if (!conversationId) return;
    
    // 更新时间戳以反映用户活动
    updateTimestamp(conversationId);
  }, [updateTimestamp]);

  /**
   * 同步会话状态（确保数据一致性）
   * @param conversationId 会话ID
   * @param force 强制同步
   */
  const syncConversationState = useCallback(async (
    conversationId: string, 
    force: boolean = false
  ) => {
    if (!conversationId || !user?.id) {
      return;
    }

    // 如果离线且不是强制同步，跳过
    if (!isOnline() && !force) {
      return;
    }

    try {
      await syncConversation(conversationId);
    } catch (error) {
      console.warn('Failed to sync conversation state:', error);
    }
  }, [user?.id, syncConversation, isOnline]);

  /**
   * 处理多个会话的活动更新
   * @param activities 活动数组
   */
  const handleMultipleActivities = useCallback(async (activities: Array<{
    conversationId: string;
    messageContent: string;
    messageRole: 'user' | 'assistant';
    timestamp?: number;
  }>) => {
    if (activities.length === 0) {
      return;
    }

    // 使用批量更新模式处理多个活动
    const promises = activities.map(activity => 
      onMessageAdded(
        activity.conversationId,
        activity.messageContent,
        activity.messageRole,
        {
          batchUpdate: true,
          customTimestamp: activity.timestamp
        }
      )
    );

    await Promise.all(promises);
  }, [onMessageAdded]);

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    // 清理所有防抖定时器
    debounceTimers.current.forEach(timer => clearTimeout(timer));
    debounceTimers.current.clear();
    
    // 清空更新队列
    updateQueue.current.clear();
  }, []);

  // 组件卸载时清理资源
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // 网络状态变化时处理队列
  useEffect(() => {
    if (isOnline() && updateQueue.current.size > 0) {
      // 网络恢复时立即刷新队列
      flushBatchUpdates();
    }
  }, [isOnline, flushBatchUpdates]);

  return {
    // 主要功能
    onMessageAdded,
    onUserTyping,
    syncConversationState,
    handleMultipleActivities,
    
    // 批量操作
    flushBatchUpdates,
    
    // 状态查询
    hasPendingUpdates: () => updateQueue.current.size > 0,
    getPendingUpdateCount: () => updateQueue.current.size,
    
    // 清理
    cleanup
  };
}

/**
 * 简化版的实时更新Hook（用于基本场景）
 */
export function useSimpleConversationRealtime() {
  const { updateTimestamp, updateMessage } = useConversationUpdates();

  const updateOnMessage = useCallback((
    conversationId: string,
    messageContent?: string,
    messageCount?: number
  ) => {
    const timestamp = Date.now();
    
    if (messageContent !== undefined || messageCount !== undefined) {
      const lastMessage = messageContent && messageContent.length > 50 
        ? `${messageContent.substring(0, 50)}...` 
        : messageContent;
      
      updateMessage(conversationId, messageCount, lastMessage, timestamp);
    } else {
      updateTimestamp(conversationId, timestamp);
    }
  }, [updateMessage, updateTimestamp]);

  return {
    updateOnMessage,
    updateTimestamp: (conversationId: string) => updateTimestamp(conversationId)
  };
}