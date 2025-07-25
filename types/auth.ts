// 用户信息接口
export interface UserInfo {
  id: string;
  email: string;
}

// 认证状态接口
export interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
}

// 认证上下文类型
export interface AuthContextType {
  // 状态
  isAuthenticated: boolean;
  user: UserInfo | null;
  loading: boolean;
  
  // 操作
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => void;
}

// API请求类型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// API响应类型
export interface AuthResponse {
  token: string;
  user: UserInfo;
}

// 错误类型
export interface ApiError {
  message: string;
  code?: string;
}