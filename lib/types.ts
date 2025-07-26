// 聊天会话接口
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// 聊天消息接口
export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'ai';
  content: string;
  work_stage?: string;
  timestamp: string;
}

// 消息历史格式
export interface MessageHistory {
  history: Array<{
    role: 'user' | 'ai';
    content: string;
    workflow_stage?: string;
  }>;
  pagination?: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

// API 错误格式
export interface ApiError {
  error: string;
  message: string;
  status: number;
  timestamp: string;
  details?: any;
}

// 认证相关类型
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

// 会话操作类型
export interface SessionUpdateRequest {
  title?: string;
  action?: 'delete';
}

// 消息创建请求
export interface MessageCreateRequest {
  session_id: string;
  role: 'user' | 'ai';
  content: string;
  work_stage?: string;
}

// 会话创建请求
export interface SessionCreateRequest {
  user_id: string;
  title: string;
}

// 数据库表类型 (基于 schema.sql)
export interface Database {
  public: {
    Tables: {
      chat_sessions: {
        Row: ChatSession;
        Insert: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatSession, 'id' | 'created_at'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'timestamp'>;
        Update: Partial<Omit<ChatMessage, 'id' | 'timestamp'>>;
      };
    };
  };
}