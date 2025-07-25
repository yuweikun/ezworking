# 设计文档

## 概述

本设计实现一个轻量化的用户认证系统，集成到现有的EzWorking聊天应用中。系统将在左下角添加登录按钮，通过居中弹窗提供注册和登录功能。设计遵循MVP原则，保持简洁优雅的用户体验。

## 架构

### 技术栈
- **前端框架**: Next.js 15 (React 19)
- **UI组件库**: Ant Design + Ant Design X
- **样式方案**: antd-style (已集成)
- **状态管理**: React useState (轻量化方案)
- **HTTP客户端**: axios
- **存储方案**: localStorage (简单持久化)

### 前端架构
```
┌─────────────────────────────────────┐
│           用户界面层                 │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐   │
│  │  登录按钮    │  │  认证弹窗    │   │
│  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────┤
│           状态管理层                 │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐   │
│  │  用户状态    │  │  认证服务    │   │
│  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────┤
│           HTTP通信层                │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐   │
│  │    axios    │  │ localStorage │   │
│  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────┤
│           后端API                   │
│         (不在本次实现范围)            │
└─────────────────────────────────────┘
```

## 组件和接口

### 核心组件

#### 1. AuthButton 组件
- **位置**: 左下角侧边栏底部
- **功能**: 显示登录按钮或用户信息
- **状态**: 根据用户登录状态动态切换

#### 2. AuthModal 组件
- **类型**: 居中弹窗
- **模式**: 登录/注册切换
- **表单**: 邮箱、密码输入
- **验证**: 基础前端验证

#### 3. AuthService 服务
- **HTTP客户端**: 基于axios封装
- **登录**: POST /api/auth/login
- **注册**: POST /api/auth/register
- **令牌管理**: localStorage存储
- **状态同步**: 跨组件状态更新

### 接口设计

#### API接口
```typescript
// 登录接口
POST /api/auth/login
Request: { email: string, password: string }
Response: { token: string, user: UserInfo }

// 注册接口  
POST /api/auth/register
Request: { email: string, password: string }
Response: { token: string, user: UserInfo }
```

#### 数据类型
```typescript
interface UserInfo {
  id: string;
  email: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
}
```

## 数据模型

### 用户状态模型
```typescript
interface AuthContextType {
  // 状态
  isAuthenticated: boolean;
  user: UserInfo | null;
  loading: boolean;
  
  // 操作
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### 本地存储模型
```typescript
// localStorage keys
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_info'
} as const;
```

## 错误处理

### 错误类型
1. **网络错误**: 连接失败、超时
2. **认证错误**: 邮箱密码错误、用户不存在
3. **验证错误**: 邮箱格式、密码强度
4. **系统错误**: 服务器内部错误

### 错误处理策略
- **用户友好**: 显示中文错误提示
- **非阻塞**: 错误不影响主应用功能
- **重试机制**: 网络错误支持重试
- **降级处理**: API失败时保持界面可用

### 错误提示设计
```typescript
const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  INVALID_CREDENTIALS: '邮箱或密码错误',
  EMAIL_EXISTS: '该邮箱已被注册',
  INVALID_EMAIL: '请输入有效的邮箱地址',
  WEAK_PASSWORD: '密码至少需要6位字符'
} as const;
```

## HTTP客户端配置

### axios配置
```typescript
// 基础配置
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证头
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 清除过期token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }
    return Promise.reject(error);
  }
);
```

## 实现细节

### 集成方案
1. **最小侵入**: 在现有页面组件中添加认证功能
2. **样式一致**: 复用现有的antd-style样式系统
3. **状态隔离**: 认证状态独立管理，不影响聊天功能
4. **依赖管理**: 添加axios依赖到项目中

### 性能优化
1. **懒加载**: 弹窗组件按需加载
2. **缓存策略**: 用户信息本地缓存
3. **请求优化**: axios自动处理请求重复和超时

### 用户体验
1. **响应式**: 支持不同屏幕尺寸
2. **加载状态**: 请求过程中显示loading
3. **键盘支持**: Enter键提交表单
4. **焦点管理**: 弹窗打开时自动聚焦

### 前端安全考虑
1. **令牌存储**: localStorage存储（MVP阶段可接受）
2. **输入验证**: 前端基础验证
3. **错误信息**: 避免泄露敏感信息
4. **请求拦截**: 自动添加认证头和处理401错误