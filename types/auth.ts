/**
 * 认证相关类型定义
 */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: AuthUser;
    session?: {
      access_token: string;
      refresh_token: string;
      expires_at?: number;
      expires_in?: number;
      token_type?: string;
    };
  };
  error?: string;
  message?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  success: boolean;
  data?: {
    user: AuthUser;
    message: string;
  };
  error?: string;
  message?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType {
  // 状态
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  // 操作
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

// 认证错误类型
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  EMAIL_NOT_CONFIRMED = 'EMAIL_NOT_CONFIRMED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: any;
}

// API 错误接口
export interface ApiError {
  error: string;
  message: string;
  status: number;
  timestamp: string;
  details?: any;
}

// 认证响应接口（完整的 API 响应）
export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: AuthUser;
  };
  error?: string;
  message?: string;
}

// 认证数据接口（AuthService 返回的数据）
export interface AuthData {
  token: string;
  user: AuthUser;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
    token_type?: string;
  };
}

// 用户信息接口（别名）
export interface UserInfo extends AuthUser {}