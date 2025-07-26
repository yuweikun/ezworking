# Design Document

## Overview

本设计旨在将现有的会话管理前端实现与真实的后端 API 集成。当前 `app/page.tsx` 中已经有一个完整的会话管理界面，使用了 Ant Design X 的 Conversations 组件，但使用的是硬编码的静态数据。

我们需要：
1. 保持现有的 UI 和交互逻辑不变
2. 将硬编码的会话数据替换为从后端 API 获取的真实数据
3. 集成现有的认证系统，确保会话数据与当前登录用户关联
4. 实现会话的持久化存储和同步

设计采用 MVP 方法，专注于核心的 API 集成，保持现有的优雅 UI 和用户体验。

## Architecture

### 现有架构分析

当前 `app/page.tsx` 已经实现了完整的会话管理 UI：

```
Independent 组件 (主页面)
├── chatSider (左侧边栏)
│   ├── Logo 区域
│   ├── 新建会话按钮
│   ├── Conversations 组件 (Ant Design X)
│   └── 用户认证按钮 (AuthButton)
├── chatList (聊天消息列表)
└── chatSender (消息发送器)
```

### 需要添加的服务层

```
ConversationService (会话 API 服务)
├── fetchSessions(userId) → GET /api/sessions
├── createSession(userId, title) → POST /api/sessions  
├── deleteSession(sessionId) → POST /api/sessions/[id]
└── updateSession(sessionId, data) → POST /api/sessions/[id]

MessageService (消息 API 服务)
├── fetchMessages(userId, sessionId) → GET /api/messages
└── createMessage(sessionId, message) → POST /api/messages
```

### 集成策略

1. **保持现有 UI**: 不修改现有的组件结构和样式
2. **替换数据源**: 将 `DEFAULT_CONVERSATIONS_ITEMS` 替换为 API 数据
3. **集成认证**: 使用现有的 `useAuth` hook 获取用户信息
4. **渐进式改造**: 逐步替换硬编码逻辑为 API 调用

## Components and Interfaces

### 1. ConversationManager 组件

**职责**: 主容器组件，管理整个会话功能的状态和布局

```typescript
interface ConversationManagerProps {
  className?: string;
  style?: React.CSSProperties;
}

interface ConversationManagerState {
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  error: string | null;
}
```

**主要功能**:
- 初始化会话数据
- 管理全局状态
- 处理错误状态
- 提供响应式布局

### 2. ConversationList 组件

**职责**: 基于 Ant Design X Conversations 组件的会话列表

```typescript
interface ConversationListProps {
  conversations: Conversation[];
  activeKey?: string;
  onActiveChange: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  loading?: boolean;
}
```

**主要功能**:
- 渲染会话列表
- 处理会话选择
- 提供会话操作菜单
- 支持分组显示

### 3. ConversationHeader 组件

**职责**: 头部区域，包含创建按钮和用户信息

```typescript
interface ConversationHeaderProps {
  onCreateConversation: () => void;
  loading?: boolean;
}
```

**主要功能**:
- 显示当前用户信息
- 提供创建新会话功能
- 显示会话统计信息

### 4. ConversationService 服务

**职责**: 处理所有会话相关的 API 调用

```typescript
class ConversationService {
  static async fetchConversations(userId: string): Promise<Conversation[]>;
  static async createConversation(userId: string, title?: string): Promise<Conversation>;
  static async deleteConversation(conversationId: string): Promise<void>;
  static async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<Conversation>;
}
```

### 5. ConversationContext 上下文

**职责**: 提供全局会话状态管理

```typescript
interface ConversationContextType {
  // 状态
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  error: string | null;
  
  // 操作
  fetchConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversation: (id: string) => void;
  clearError: () => void;
}
```

## Data Models

### Conversation 数据模型

```typescript
interface Conversation {
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
```

### ConversationGroup 分组模型

```typescript
interface ConversationGroup {
  key: string;                    // 分组标识
  title: string;                  // 分组标题
  conversations: Conversation[];   // 该分组下的会话
  timestamp: number;              // 分组时间戳
}
```

### API 请求/响应模型

基于提供的后端 API 端点设计：

```typescript
// GET /api/sessions - 获取会话列表
interface GetSessionsRequest {
  user_id: string;
}

interface SessionResponse {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// POST /api/sessions - 创建会话
interface CreateSessionRequest {
  user_id: string;
  title: string;
}

// POST /api/sessions/[id] - 删除会话
interface DeleteSessionRequest {
  action: "delete";
}

// POST /api/sessions/[id] - 更新会话
interface UpdateSessionRequest {
  title?: string;
}

// GET /api/messages - 获取消息历史
interface GetMessagesRequest {
  user_id: string;
  session_id: string;
}

interface MessageResponse {
  role: string;
  content: string;
  workflow_stage?: string;
}

interface GetMessagesResponse {
  history: MessageResponse[];
}

// POST /api/messages - 创建消息
interface CreateMessageRequest {
  session_id: string;
  role: string;
  content: string;
  work_stage?: string;
}
```

## Error Handling

### 错误类型定义

```typescript
enum ConversationErrorType {
  FETCH_FAILED = 'FETCH_FAILED',
  CREATE_FAILED = 'CREATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND'
}

interface ConversationError {
  type: ConversationErrorType;
  message: string;
  details?: any;
}
```

### 错误处理策略


2. **认证错误**: 自动跳转到登录页面
3. **服务器错误**: 显示友好的错误提示，记录详细错误信息
4. **操作失败**: 显示具体的失败原因，保持 UI 状态一致性

### 错误恢复机制

- **自动重试**: 对于临时性网络错误，实现指数退避重试
- **本地缓存**: 在网络不可用时显示缓存的会话列表
- **乐观更新**: 操作时先更新 UI，失败时回滚状态
- **错误边界**: 使用 React Error Boundary 捕获组件错误

## Testing Strategy



1. **组件测试**
   - ConversationManager 组件渲染测试
   - ConversationList 交互测试
   - ConversationHeader 功能测试
   - 错误状态显示测试

2. **服务测试**
   - ConversationService API 调用测试
   - 错误处理逻辑测试
   - 数据转换测试

3. **上下文测试**
   - ConversationContext 状态管理测试
   - 状态更新逻辑测试

### 集成测试

1. **用户流程测试**
   - 登录后查看会话列表
   - 创建新会话流程
   - 删除会话流程
   - 会话切换流程

2. **API 集成测试**
   - 与后端 API 的集成测试
   - 错误响应处理测试
   - 数据同步测试


