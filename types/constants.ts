/**
 * 应用常量定义
 */

export const CONVERSATION_CONSTANTS = {
  // 分组标识
  GROUPS: {
    TODAY: 'today',
    YESTERDAY: 'yesterday',
    EARLIER: 'earlier'
  } as const,
  
  // 分组标题
  GROUP_TITLES: {
    today: '今天',
    yesterday: '昨天',
    earlier: '更早'
  } as const,
  
  // 默认配置
  DEFAULTS: {
    TITLE: '新对话',
    PAGE_SIZE: 20,
    MAX_TITLE_LENGTH: 200,
    MAX_MESSAGE_LENGTH: 10000
  } as const,
  
  // 时间相关
  TIME: {
    ONE_DAY: 24 * 60 * 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    ONE_MINUTE: 60 * 1000
  } as const
} as const;

export const API_CONSTANTS = {
  // API 端点
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout'
    },
    SESSIONS: '/api/sessions',
    MESSAGES: '/api/messages'
  } as const,
  
  // HTTP 状态码
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500
  } as const,
  
  // 请求配置
  REQUEST: {
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  } as const
} as const;

export const UI_CONSTANTS = {
  // 消息类型
  MESSAGE_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  } as const,
  
  // 加载状态
  LOADING_STATES: {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
  } as const,
  
  // 动画持续时间
  ANIMATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500
  } as const
} as const;

// 类型推导辅助
export type MessageType = keyof typeof UI_CONSTANTS.MESSAGE_TYPES;
export type LoadingState = keyof typeof UI_CONSTANTS.LOADING_STATES;

// 错误消息常量
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  UNAUTHORIZED: '未授权访问，请重新登录',
  FORBIDDEN: '权限不足，无法执行此操作',
  NOT_FOUND: '请求的资源不存在',
  VALIDATION_ERROR: '输入数据验证失败',
  SERVER_ERROR: '服务器内部错误，请稍后重试'
} as const;

// 会话错误消息
export const CONVERSATION_ERROR_MESSAGES = {
  FETCH_FAILED: '获取会话列表失败',
  CREATE_FAILED: '创建会话失败',
  DELETE_FAILED: '删除会话失败',
  UPDATE_FAILED: '更新会话失败',
  NETWORK_ERROR: '网络连接失败',
  UNAUTHORIZED: '未授权访问',
  NOT_FOUND: '会话不存在',
  INVALID_DATA: '数据格式无效',
  EMPTY_TITLE: '会话标题不能为空',
  TITLE_TOO_LONG: '会话标题过长'
} as const;

// API 端点常量
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout'
  },
  SESSIONS: '/api/sessions',
  MESSAGES: '/api/messages'
} as const;

// 存储键常量
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  REFRESH_TOKEN: 'refresh_token',
  LAST_ACTIVITY: 'last_activity'
} as const;