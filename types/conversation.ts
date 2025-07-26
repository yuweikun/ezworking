import React from 'react';

// ==================== 核心数据模型 ====================

/**
 * 会话数据模型
 * 与 Ant Design X Conversations 组件兼容
 */
export interface Conversation {
  key: string;                    // 唯一标识符
  label: React.ReactNode;         // 会话标题
  timestamp: number;              // 创建/更新时间戳
  group?: string;                 // 分组标识（今天、昨天、更早）
  icon?: React.ReactNode;         // 会话图标
  disabled?: boolean;             // 是否禁用
  messageCount?: number;          // 消息数量
  lastMessage?: string;           // 最后一条消息预览
  userId: string;                 // 所属用户ID
}

/**
 * 会话分组模型
 */
export interface ConversationGroup {
  key: string;                    // 分组标识
  title: string;                  // 分组标题
  conversations: Conversation[];   // 该分组下的会话
  timestamp: number;              // 分组时间戳
}

// ==================== API 请求/响应模型 ====================

/**
 * 获取会话列表请求
 */
export interface GetSessionsRequest {
  id: string;
}

/**
 * 会话响应数据
 */
export interface SessionResponse {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 获取会话列表响应
 */
export interface GetSessionsResponse {
  success: boolean;
  data: {
    sessions: SessionResponse[];
    pagination: PaginationInfo;
  };
  timestamp: string;
}

/**
 * 创建会话请求
 */
export interface CreateSessionRequest {
  user_id: string;
  title: string;
}

/**
 * 删除会话请求
 */
export interface DeleteSessionRequest {
  action: "delete";
}

/**
 * 更新会话请求
 */
export interface UpdateSessionRequest {
  title?: string;
}

/**
 * 获取消息历史请求
 */
export interface GetMessagesRequest {
  user_id: string;
  session_id: string;
}

/**
 * 消息响应数据
 */
export interface MessageResponse {
  role: string;
  content: string;
  workflow_stage?: string;
}

/**
 * 获取消息历史响应
 */
export interface GetMessagesResponse {
  history: MessageResponse[];
}

/**
 * 创建消息请求
 */
export interface CreateMessageRequest {
  session_id: string;
  role: string;
  content: string;
  work_stage?: string;
}

// ==================== 错误处理类型 ====================

/**
 * 会话错误类型枚举
 */
export enum ConversationErrorType {
  FETCH_FAILED = 'FETCH_FAILED',
  CREATE_FAILED = 'CREATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_DATA = 'INVALID_DATA'
}

/**
 * 会话错误接口
 */
export interface ConversationError {
  type: ConversationErrorType;
  message: string;
  details?: any;
}

// ==================== 状态管理类型 ====================

/**
 * 会话管理状态
 */
export interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  error: ConversationError | null;
  groups: ConversationGroup[];
}

/**
 * 会话上下文类型
 */
export interface ConversationContextType {
  // 状态
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  error: ConversationError | null;
  
  // 操作
  fetchConversations: (options?: { 
    showError?: boolean;
    silent?: boolean;
  }) => Promise<void>;
  createConversation: (
    title?: string,
    options?: {
      showSuccess?: boolean;
      showError?: boolean;
      autoSelect?: boolean;
    }
  ) => Promise<Conversation>;
  deleteConversation: (
    id: string,
    options?: {
      showSuccess?: boolean;
      showError?: boolean;
      optimistic?: boolean;
    }
  ) => Promise<void>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<Conversation>;
  setActiveConversation: (id: string) => void;
  clearError: () => void;
  refreshConversations: (options?: {
    showSuccess?: boolean;
    force?: boolean;
  }) => Promise<void>;
}

/**
 * 扩展的会话上下文类型（包含内部更新函数）
 */
export interface ExtendedConversationContextType extends ConversationContextType {
  // 内部更新函数
  updateConversationTimestamp: (conversationId: string, timestamp?: number) => void;
  updateConversationMessage: (
    conversationId: string, 
    messageCount?: number, 
    lastMessage?: string,
    timestamp?: number
  ) => void;
  batchUpdateConversations: (updates: Array<{
    conversationId: string;
    updates: Partial<Conversation>;
  }>) => void;
}

// ==================== 组件属性类型 ====================

/**
 * 会话管理器组件属性
 */
export interface ConversationManagerProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 会话列表组件属性
 */
export interface ConversationListProps {
  conversations: Conversation[];
  activeKey?: string;
  onActiveChange: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  loading?: boolean;
  groupable?: boolean;
}

/**
 * 会话头部组件属性
 */
export interface ConversationHeaderProps {
  onCreateConversation: () => void;
  loading?: boolean;
  userInfo?: {
    name: string;
    avatar?: string;
  };
}

// ==================== 工具函数类型 ====================

/**
 * 会话分组函数类型
 */
export type GroupConversationsFunction = (conversations: Conversation[]) => ConversationGroup[];

/**
 * 会话排序函数类型
 */
export type SortConversationsFunction = (conversations: Conversation[]) => Conversation[];

/**
 * 数据转换函数类型
 */
export type ConversationTransformer = (apiData: SessionResponse) => Conversation;