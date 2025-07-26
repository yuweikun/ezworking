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
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  RESEND_CONFIRMATION: '/auth/resend-confirmation',
  // 会话相关端点
  SESSIONS: '/sessions',
  MESSAGES: '/messages'
} as const;

// 会话相关常量
export const CONVERSATION_CONSTANTS = {
  // 分组标识
  GROUPS: {
    TODAY: 'Today',
    YESTERDAY: 'Yesterday',
    EARLIER: 'Earlier'
  },
  // 默认会话标题
  DEFAULT_TITLE: 'New Conversation',
  // 最大会话标题长度
  MAX_TITLE_LENGTH: 100,
  // 分页大小
  PAGE_SIZE: 50
} as const;

// 会话错误信息常量
export const CONVERSATION_ERROR_MESSAGES = {
  FETCH_FAILED: '获取会话列表失败，请稍后重试',
  CREATE_FAILED: '创建会话失败，请稍后重试',
  DELETE_FAILED: '删除会话失败，请稍后重试',
  UPDATE_FAILED: '更新会话失败，请稍后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  UNAUTHORIZED: '未授权访问，请重新登录',
  NOT_FOUND: '会话不存在或已被删除',
  INVALID_DATA: '数据格式错误',
  EMPTY_TITLE: '会话标题不能为空',
  TITLE_TOO_LONG: `会话标题不能超过${CONVERSATION_CONSTANTS.MAX_TITLE_LENGTH}个字符`
} as const;