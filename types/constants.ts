// localStorage 键名常量
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_info'
} as const;

// 错误信息常量
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  INVALID_CREDENTIALS: '邮箱或密码错误',
  EMAIL_EXISTS: '该邮箱已被注册',
  INVALID_EMAIL: '请输入有效的邮箱地址',
  WEAK_PASSWORD: '密码至少需要6位字符',
  UNKNOWN_ERROR: '发生未知错误，请稍后重试'
} as const;

// API 端点常量
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register'
} as const;