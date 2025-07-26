/**
 * 会话相关工具函数类型定义
 */

import { Conversation, ConversationGroup, SessionResponse } from './conversation';
import { CONVERSATION_CONSTANTS } from './constants';

/**
 * 将 API 响应转换为 Conversation 对象
 */
export function transformSessionToConversation(
  session: SessionResponse, 
  userId: string
): Conversation {
  const timestamp = new Date(session.updated_at).getTime();
  
  return {
    key: session.id,
    label: session.title || '未命名会话', // 添加默认值
    timestamp,
    group: getTimeGroup(timestamp),
    userId,
    disabled: false
  };
}

/**
 * 根据时间戳确定分组
 */
export function getTimeGroup(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const oneDay = CONVERSATION_CONSTANTS.TIME.ONE_DAY;
  
  if (diff < oneDay) {
    return CONVERSATION_CONSTANTS.GROUPS.TODAY;
  } else if (diff < oneDay * 2) {
    return CONVERSATION_CONSTANTS.GROUPS.YESTERDAY;
  } else {
    return CONVERSATION_CONSTANTS.GROUPS.EARLIER;
  }
}

/**
 * 按时间排序会话
 */
export function sortConversationsByTime(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 将会话按时间分组
 */
export function groupConversationsByTime(conversations: Conversation[]): ConversationGroup[] {
  const groups: { [key: string]: Conversation[] } = {};
  
  // 按分组归类
  conversations.forEach(conversation => {
    const group = conversation.group || CONVERSATION_CONSTANTS.GROUPS.EARLIER;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(conversation);
  });
  
  // 转换为 ConversationGroup 数组
  const result: ConversationGroup[] = [];
  
  // 按顺序添加分组
  const groupOrder = [
    CONVERSATION_CONSTANTS.GROUPS.TODAY,
    CONVERSATION_CONSTANTS.GROUPS.YESTERDAY,
    CONVERSATION_CONSTANTS.GROUPS.EARLIER
  ];
  
  groupOrder.forEach(groupKey => {
    if (groups[groupKey] && groups[groupKey].length > 0) {
      result.push({
        key: groupKey,
        title: CONVERSATION_CONSTANTS.GROUP_TITLES[groupKey as keyof typeof CONVERSATION_CONSTANTS.GROUP_TITLES],
        conversations: sortConversationsByTime(groups[groupKey]),
        timestamp: Math.max(...groups[groupKey].map(c => c.timestamp))
      });
    }
  });
  
  return result;
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = CONVERSATION_CONSTANTS.TIME.ONE_MINUTE;
  const hour = CONVERSATION_CONSTANTS.TIME.ONE_HOUR;
  const day = CONVERSATION_CONSTANTS.TIME.ONE_DAY;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}分钟前`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}小时前`;
  } else if (diff < day * 7) {
    const days = Math.floor(diff / day);
    return `${days}天前`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * 生成默认会话标题
 */
export function generateDefaultTitle(count?: number): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (count !== undefined && count > 0) {
    return `${CONVERSATION_CONSTANTS.DEFAULTS.TITLE} ${count + 1}`;
  }
  
  return `${CONVERSATION_CONSTANTS.DEFAULTS.TITLE} ${timeStr}`;
}

/**
 * 验证会话标题
 */
export function validateConversationTitle(title: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = title.trim();
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: '标题不能为空'
    };
  }
  
  if (trimmed.length > CONVERSATION_CONSTANTS.DEFAULTS.MAX_TITLE_LENGTH) {
    return {
      isValid: false,
      error: `标题长度不能超过${CONVERSATION_CONSTANTS.DEFAULTS.MAX_TITLE_LENGTH}个字符`
    };
  }
  
  return { isValid: true };
}

/**
 * 搜索会话
 */
export function searchConversations(
  conversations: Conversation[], 
  query: string
): Conversation[] {
  if (!query.trim()) {
    return conversations;
  }
  
  const lowerQuery = query.toLowerCase();
  
  return conversations.filter(conversation => {
    const label = typeof conversation.label === 'string' 
      ? conversation.label 
      : String(conversation.label);
    
    return label.toLowerCase().includes(lowerQuery);
  });
}

/**
 * 获取会话统计信息
 */
export function getConversationStats(conversations: Conversation[]): {
  total: number;
  today: number;
  yesterday: number;
  earlier: number;
  withMessages: number;
} {
  const stats = {
    total: conversations.length,
    today: 0,
    yesterday: 0,
    earlier: 0,
    withMessages: 0
  };
  
  conversations.forEach(conversation => {
    switch (conversation.group) {
      case CONVERSATION_CONSTANTS.GROUPS.TODAY:
        stats.today++;
        break;
      case CONVERSATION_CONSTANTS.GROUPS.YESTERDAY:
        stats.yesterday++;
        break;
      case CONVERSATION_CONSTANTS.GROUPS.EARLIER:
        stats.earlier++;
        break;
    }
    
    if (conversation.messageCount && conversation.messageCount > 0) {
      stats.withMessages++;
    }
  });
  
  return stats;
}