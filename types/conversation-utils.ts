import dayjs from 'dayjs';
import { Conversation, ConversationGroup, SessionResponse } from './conversation';
import { CONVERSATION_CONSTANTS } from './constants';

// ==================== 数据转换工具 ====================

/**
 * 将 API 响应数据转换为 Conversation 对象
 */
export const transformSessionToConversation = (
  session: SessionResponse,
  userId: string
): Conversation => {
  const timestamp = new Date(session.updated_at).getTime();
  
  return {
    key: session.id,
    label: session.title,
    timestamp,
    group: getTimeGroup(timestamp),
    userId,
    disabled: false
  };
};

/**
 * 根据时间戳确定分组
 */
export const getTimeGroup = (timestamp: number): string => {
  const now = dayjs();
  const messageTime = dayjs(timestamp);
  
  if (messageTime.isSame(now, 'day')) {
    return CONVERSATION_CONSTANTS.GROUPS.TODAY;
  } else if (messageTime.isSame(now.subtract(1, 'day'), 'day')) {
    return CONVERSATION_CONSTANTS.GROUPS.YESTERDAY;
  } else {
    return CONVERSATION_CONSTANTS.GROUPS.EARLIER;
  }
};

/**
 * 获取分组的显示优先级（数字越小优先级越高）
 */
export const getGroupPriority = (groupKey: string): number => {
  switch (groupKey) {
    case CONVERSATION_CONSTANTS.GROUPS.TODAY:
      return 1;
    case CONVERSATION_CONSTANTS.GROUPS.YESTERDAY:
      return 2;
    case CONVERSATION_CONSTANTS.GROUPS.EARLIER:
      return 3;
    default:
      return 999;
  }
};

/**
 * 检查分组是否为空
 */
export const isGroupEmpty = (group: ConversationGroup): boolean => {
  return !group.conversations || group.conversations.length === 0;
};

/**
 * 过滤空分组
 */
export const filterEmptyGroups = (groups: ConversationGroup[]): ConversationGroup[] => {
  return groups.filter(group => !isGroupEmpty(group));
};

/**
 * 获取分组统计信息
 */
export const getGroupStats = (groups: ConversationGroup[]): {
  totalGroups: number;
  totalConversations: number;
  emptyGroups: number;
  groupCounts: Record<string, number>;
} => {
  const stats = {
    totalGroups: groups.length,
    totalConversations: 0,
    emptyGroups: 0,
    groupCounts: {} as Record<string, number>
  };
  
  groups.forEach(group => {
    const count = group.conversations.length;
    stats.groupCounts[group.key] = count;
    stats.totalConversations += count;
    
    if (count === 0) {
      stats.emptyGroups++;
    }
  });
  
  return stats;
};

/**
 * 按时间戳降序排序会话（最新的在前）
 */
export const sortConversationsByTime = (conversations: Conversation[]): Conversation[] => {
  return [...conversations].sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * 按时间戳升序排序会话（最旧的在前）
 */
export const sortConversationsByTimeAsc = (conversations: Conversation[]): Conversation[] => {
  return [...conversations].sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * 按标题排序会话
 */
export const sortConversationsByTitle = (conversations: Conversation[]): Conversation[] => {
  return [...conversations].sort((a, b) => {
    const titleA = typeof a.label === 'string' ? a.label : a.key;
    const titleB = typeof b.label === 'string' ? b.label : b.key;
    return titleA.localeCompare(titleB, 'zh-CN');
  });
};

/**
 * 按日期分组会话
 * 支持空分组处理和分组可见性
 */
export const groupConversationsByDate = (
  conversations: Conversation[],
  options: {
    hideEmptyGroups?: boolean;
    includeGroupCounts?: boolean;
  } = {}
): ConversationGroup[] => {
  const { hideEmptyGroups = true, includeGroupCounts = false } = options;
  const groups: Record<string, Conversation[]> = {};
  
  // 首先对所有会话按时间戳降序排序
  const sortedConversations = sortConversationsByTime(conversations);
  
  // 按分组归类
  sortedConversations.forEach(conversation => {
    // 重新计算分组，确保时间分组的准确性
    const group = getTimeGroup(conversation.timestamp);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push({
      ...conversation,
      group // 更新会话的分组信息
    });
  });
  
  // 定义分组顺序和标题映射
  const groupOrder = [
    CONVERSATION_CONSTANTS.GROUPS.TODAY,
    CONVERSATION_CONSTANTS.GROUPS.YESTERDAY,
    CONVERSATION_CONSTANTS.GROUPS.EARLIER
  ] as const;
  
  const groupTitles: Record<string, string> = {
    [CONVERSATION_CONSTANTS.GROUPS.TODAY]: '今天',
    [CONVERSATION_CONSTANTS.GROUPS.YESTERDAY]: '昨天',
    [CONVERSATION_CONSTANTS.GROUPS.EARLIER]: '更早'
  };
  
  // 转换为 ConversationGroup 数组
  const result: ConversationGroup[] = groupOrder
    .map(groupKey => {
      const groupConversations = groups[groupKey] || [];
      const isEmpty = groupConversations.length === 0;
      
      // 如果启用了隐藏空分组且当前分组为空，则跳过
      if (hideEmptyGroups && isEmpty) {
        return null;
      }
      
      const baseTitle = groupTitles[groupKey] || groupKey;
      const title = includeGroupCounts && !isEmpty 
        ? `${baseTitle} (${groupConversations.length})`
        : baseTitle;
      
      return {
        key: groupKey,
        title,
        conversations: groupConversations,
        timestamp: isEmpty ? 0 : Math.max(...groupConversations.map(c => c.timestamp))
      } as ConversationGroup;
    })
    .filter((group): group is ConversationGroup => group !== null);
  
  return result;
};

/**
 * 生成默认会话标题
 */
export const generateDefaultTitle = (index?: number): string => {
  const suffix = index !== undefined ? ` ${index + 1}` : '';
  return `${CONVERSATION_CONSTANTS.DEFAULT_TITLE}${suffix}`;
};

/**
 * 验证会话标题
 */
export const validateConversationTitle = (title: string): { valid: boolean; error?: string } => {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'EMPTY_TITLE' };
  }
  
  if (title.length > CONVERSATION_CONSTANTS.MAX_TITLE_LENGTH) {
    return { valid: false, error: 'TITLE_TOO_LONG' };
  }
  
  return { valid: true };
};

/**
 * 更新会话时间戳并重新分组
 */
export const updateConversationTimestamp = (
  conversations: Conversation[],
  conversationId: string,
  newTimestamp?: number
): Conversation[] => {
  const timestamp = newTimestamp || Date.now();
  
  return conversations.map(conversation => {
    if (conversation.key === conversationId) {
      return {
        ...conversation,
        timestamp,
        group: getTimeGroup(timestamp)
      };
    }
    return conversation;
  });
};

/**
 * 查找会话
 */
export const findConversationById = (
  conversations: Conversation[],
  id: string
): Conversation | undefined => {
  return conversations.find(conversation => conversation.key === id);
};

/**
 * 移除会话
 */
export const removeConversation = (
  conversations: Conversation[],
  id: string
): Conversation[] => {
  return conversations.filter(conversation => conversation.key !== id);
};

/**
 * 添加或更新会话
 */
export const upsertConversation = (
  conversations: Conversation[],
  conversation: Conversation
): Conversation[] => {
  const existingIndex = conversations.findIndex(c => c.key === conversation.key);
  
  if (existingIndex >= 0) {
    // 更新现有会话
    const updated = [...conversations];
    updated[existingIndex] = conversation;
    return updated;
  } else {
    // 添加新会话到开头
    return [conversation, ...conversations];
  }
};

// ==================== 高级分组和排序功能 ====================

/**
 * 分组选项接口
 */
export interface GroupingOptions {
  hideEmptyGroups?: boolean;
  includeGroupCounts?: boolean;
  sortWithinGroups?: 'time-desc' | 'time-asc' | 'title';
  customGroupOrder?: string[];
}

/**
 * 完整的会话分组和排序处理
 * 这是主要的分组函数，整合了所有分组和排序逻辑
 */
export const processConversationsWithGrouping = (
  conversations: Conversation[],
  options: GroupingOptions = {}
): ConversationGroup[] => {
  const {
    hideEmptyGroups = true,
    includeGroupCounts = false,
    sortWithinGroups = 'time-desc',
    customGroupOrder
  } = options;
  
  // 1. 首先确保所有会话都有正确的分组信息
  const conversationsWithGroups = conversations.map(conversation => ({
    ...conversation,
    group: getTimeGroup(conversation.timestamp)
  }));
  
  // 2. 按分组归类
  const groups: Record<string, Conversation[]> = {};
  conversationsWithGroups.forEach(conversation => {
    const group = conversation.group || CONVERSATION_CONSTANTS.GROUPS.EARLIER;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(conversation);
  });
  
  // 3. 确定分组顺序
  const groupOrder = customGroupOrder || [
    CONVERSATION_CONSTANTS.GROUPS.TODAY,
    CONVERSATION_CONSTANTS.GROUPS.YESTERDAY,
    CONVERSATION_CONSTANTS.GROUPS.EARLIER
  ];
  
  // 4. 分组标题映射
  const groupTitles: Record<string, string> = {
    [CONVERSATION_CONSTANTS.GROUPS.TODAY]: '今天',
    [CONVERSATION_CONSTANTS.GROUPS.YESTERDAY]: '昨天',
    [CONVERSATION_CONSTANTS.GROUPS.EARLIER]: '更早'
  };
  
  // 5. 创建分组对象
  const result: ConversationGroup[] = groupOrder
    .map(groupKey => {
      const groupConversations = groups[groupKey] || [];
      const isEmpty = groupConversations.length === 0;
      
      // 如果启用了隐藏空分组且当前分组为空，则跳过
      if (hideEmptyGroups && isEmpty) {
        return null;
      }
      
      // 6. 根据选项对分组内的会话进行排序
      let sortedConversations: Conversation[];
      switch (sortWithinGroups) {
        case 'time-asc':
          sortedConversations = sortConversationsByTimeAsc(groupConversations);
          break;
        case 'title':
          sortedConversations = sortConversationsByTitle(groupConversations);
          break;
        case 'time-desc':
        default:
          sortedConversations = sortConversationsByTime(groupConversations);
          break;
      }
      
      // 7. 生成分组标题
      const baseTitle = groupTitles[groupKey] || groupKey;
      const title = includeGroupCounts && !isEmpty 
        ? `${baseTitle} (${sortedConversations.length})`
        : baseTitle;
      
      return {
        key: groupKey,
        title,
        conversations: sortedConversations,
        timestamp: isEmpty ? 0 : Math.max(...sortedConversations.map(c => c.timestamp))
      } as ConversationGroup;
    })
    .filter((group): group is ConversationGroup => group !== null);
  
  return result;
};

/**
 * 重新分组现有的会话组
 * 当时间发生变化时（如跨越午夜），需要重新计算分组
 */
export const regroupConversations = (groups: ConversationGroup[]): ConversationGroup[] => {
  // 提取所有会话
  const allConversations = groups.flatMap(group => group.conversations);
  
  // 重新分组
  return processConversationsWithGrouping(allConversations);
};

/**
 * 获取扁平化的会话列表（按时间排序）
 */
export const getFlattenedConversations = (groups: ConversationGroup[]): Conversation[] => {
  return groups
    .sort((a, b) => getGroupPriority(a.key) - getGroupPriority(b.key))
    .flatMap(group => group.conversations);
};

// ==================== 类型守卫 ====================

/**
 * 检查是否为有效的会话对象
 */
export const isValidConversation = (obj: any): obj is Conversation => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.key === 'string' &&
    obj.label !== undefined &&
    typeof obj.timestamp === 'number' &&
    typeof obj.userId === 'string'
  );
};

/**
 * 检查是否为有效的会话数组
 */
export const isValidConversationArray = (arr: any): arr is Conversation[] => {
  return Array.isArray(arr) && arr.every(isValidConversation);
};