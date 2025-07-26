# 后端交互实现详解

## 🏗️ 架构概览

EzWorking的conversation部分采用分层架构设计，实现了完整的前后端交互机制：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Components │ -> │   Context Layer │ -> │  Service Layer  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │   HTTP Client   │
                                               └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │  Backend APIs   │
                                               └─────────────────┘
```

## 📡 HTTP客户端层 (`lib/http-client.ts`)

### 核心功能
- **统一的HTTP请求处理**
- **自动Token管理**
- **请求/响应拦截器**
- **统一错误处理**

### 关键实现

```typescript
// 创建axios实例
const httpClient: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  timeout: ENV.AUTH_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加认证Token
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 统一错误处理
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = handleApiError(error);
    return Promise.reject(apiError);
  }
);
```

### 错误映射机制

| HTTP状态码 | 错误类型 | 处理方式 |
|-----------|---------|---------|
| 400 | VALIDATION_ERROR | 显示具体验证错误信息 |
| 401 | UNAUTHORIZED | 清除Token，跳转登录 |
| 409 | CONFLICT | 处理资源冲突（如邮箱已存在） |
| 422 | VALIDATION_ERROR | 表单验证错误 |
| 5xx | SERVER_ERROR | 服务器错误提示 |
| 网络错误 | NETWORK_ERROR | 网络连接失败提示 |

## 🔧 服务层 (`services/`)

### 1. 会话服务 (`conversation-service.ts`)

#### 核心API交互

**获取会话列表**
```typescript
// GET /api/sessions?id={userId}
static async fetchConversations(userId: string): Promise<Conversation[]> {
  const response = await httpClient.get<SessionResponse[]>(
    API_ENDPOINTS.SESSIONS,
    { params: { id: userId } }
  );
  
  // 数据转换：SessionResponse -> Conversation
  return response.data.map(session => 
    transformSessionToConversation(session, userId)
  );
}
```

**创建新会话**
```typescript
// POST /api/sessions
static async createConversation(userId: string, title?: string): Promise<Conversation> {
  const createData: CreateSessionRequest = {
    user_id: userId,
    title: title || generateDefaultTitle()
  };

  const response = await httpClient.post<SessionResponse>(
    API_ENDPOINTS.SESSIONS,
    createData
  );

  return transformSessionToConversation(response.data, userId);
}
```

**删除会话**
```typescript
// POST /api/sessions/{conversationId}
static async deleteConversation(conversationId: string): Promise<void> {
  const deleteData: DeleteSessionRequest = {
    action: "delete"
  };

  await httpClient.post(
    `${API_ENDPOINTS.SESSIONS}/${conversationId}`,
    deleteData
  );
}
```

**更新会话**
```typescript
// POST /api/sessions/{conversationId}
static async updateConversation(conversationId: string, updates: { title?: string }): Promise<Conversation> {
  const updateData: UpdateSessionRequest = {
    title: updates.title
  };

  const response = await httpClient.post<SessionResponse>(
    `${API_ENDPOINTS.SESSIONS}/${conversationId}`,
    updateData
  );

  return transformSessionToConversation(response.data, userId);
}
```

### 2. 消息服务 (`message-service.ts`)

**获取消息历史**
```typescript
// GET /api/messages?user_id={userId}&session_id={sessionId}
static async fetchMessages(userId: string, sessionId: string): Promise<MessageResponse[]> {
  const params: GetMessagesRequest = {
    user_id: userId,
    session_id: sessionId
  };

  const response = await httpClient.get<GetMessagesResponse>(
    API_ENDPOINTS.MESSAGES,
    { params }
  );

  return response.data.history || [];
}
```

**创建新消息**
```typescript
// POST /api/messages
static async createMessage(sessionId: string, role: string, content: string, workStage?: string): Promise<void> {
  const messageData: CreateMessageRequest = {
    session_id: sessionId,
    role,
    content,
    work_stage: workStage
  };

  await httpClient.post(API_ENDPOINTS.MESSAGES, messageData);
}
```

## 🎯 数据转换层

### API响应到前端模型的转换

```typescript
// 后端SessionResponse -> 前端Conversation
export function transformSessionToConversation(
  session: SessionResponse, 
  userId: string
): Conversation {
  return {
    key: session.id,
    label: session.title,
    timestamp: new Date(session.updated_at).getTime(),
    userId: userId,
    group: getTimeGroup(new Date(session.updated_at).getTime()),
    messageCount: 0, // 需要单独获取
    lastMessage: '', // 需要单独获取
  };
}
```

### 请求数据结构

**创建会话请求**
```typescript
interface CreateSessionRequest {
  user_id: string;    // 用户ID
  title: string;      // 会话标题
}
```

**删除会话请求**
```typescript
interface DeleteSessionRequest {
  action: "delete";   // 固定值，表示删除操作
}
```

**更新会话请求**
```typescript
interface UpdateSessionRequest {
  title?: string;     // 可选的新标题
}
```

## 🔄 上下文层集成 (`contexts/conversation-context.tsx`)

### 状态管理与API集成

```typescript
// 获取会话列表
const fetchConversations = useCallback(async (options = {}) => {
  try {
    setLoading(true);
    clearError();
    
    const fetchedConversations = await ConversationService.fetchConversations(
      user.id,
      { useCache, showError, retryOnFailure: true }
    );
    
    setConversations(fetchedConversations);
  } catch (err) {
    const conversationError = err as ConversationError;
    setError(conversationError);
  } finally {
    setLoading(false);
  }
}, [user?.id]);

// 创建会话
const createConversation = useCallback(async (title?: string, options = {}) => {
  try {
    setLoading(true);
    clearError();
    
    const newConversation = await ConversationService.createConversation(
      user.id, 
      title,
      { showSuccess, showError, retryOnFailure: true }
    );
    
    // 更新本地状态
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.key);
    
    return newConversation;
  } catch (err) {
    const conversationError = err as ConversationError;
    setError(conversationError);
    throw conversationError;
  } finally {
    setLoading(false);
  }
}, [user?.id]);
```

## 🛡️ 错误处理机制

### 多层错误处理

1. **HTTP客户端层**：统一处理HTTP错误，转换为标准ApiError
2. **服务层**：将ApiError转换为业务相关的ConversationError
3. **上下文层**：处理业务逻辑错误，更新UI状态
4. **组件层**：显示用户友好的错误信息

### 错误恢复策略

```typescript
// 自动重试机制
return await ErrorHandler.withNetworkCheck(
  () => ErrorHandler.withRetry(operation, {
    maxRetries: 2,
    retryCondition: (error) => this.shouldRetryOperation(error)
  }),
  { showMessage: showError }
);

// 乐观更新与回滚
await ErrorHandler.withOptimisticUpdate(
  optimisticUpdate,    // 立即更新UI
  actualOperation,     // 执行实际API调用
  rollback,           // 失败时回滚UI
  { showMessage: showError }
);
```

## 💾 缓存机制

### 本地缓存策略

```typescript
// 缓存配置
private static readonly CACHE_KEY_PREFIX = 'conversations_cache_';
private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟

// 获取缓存
private static getCachedConversations(userId: string): Conversation[] | null {
  const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  
  // 检查缓存是否过期
  if (Date.now() - timestamp > this.CACHE_EXPIRY) {
    localStorage.removeItem(cacheKey);
    return null;
  }
  
  return data;
}
```

### 缓存更新策略

- **读取时**：优先使用缓存，过期时重新获取
- **创建时**：立即更新缓存，添加新会话到列表顶部
- **删除时**：从缓存中移除对应会话
- **更新时**：更新缓存中的会话信息

## 🔐 认证集成

### Token管理

```typescript
// 请求拦截器自动添加Token
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401错误自动清除Token
case 401:
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  return {
    message: ERROR_MESSAGES.INVALID_CREDENTIALS,
    code: 'UNAUTHORIZED'
  };
```

### 用户权限验证

```typescript
// 验证用户是否有权限访问指定会话
static async validateUserAccess(conversationId: string, userId: string): Promise<boolean> {
  try {
    const conversations = await this.fetchConversations(userId, { useCache: true });
    return conversations.some(conversation => conversation.key === conversationId);
  } catch (error) {
    return false; // 默认拒绝访问
  }
}
```

## 🚀 性能优化

### 1. 请求优化
- **并发控制**：避免重复请求
- **请求去重**：相同参数的请求只发送一次
- **超时控制**：设置合理的请求超时时间

### 2. 缓存优化
- **智能缓存**：根据数据更新频率设置缓存时间
- **缓存预热**：提前加载常用数据
- **缓存清理**：定期清理过期缓存

### 3. 错误处理优化
- **指数退避**：重试间隔逐渐增加
- **熔断机制**：连续失败时暂停请求
- **降级策略**：API失败时使用缓存数据

## 📋 API接口规范

### 会话管理接口

| 接口 | 方法 | 路径 | 参数 | 响应 |
|------|------|------|------|------|
| 获取会话列表 | GET | `/api/sessions` | `user_id` | `SessionResponse[]` |
| 创建会话 | POST | `/api/sessions` | `CreateSessionRequest` | `SessionResponse` |
| 删除会话 | POST | `/api/sessions/{id}` | `DeleteSessionRequest` | `void` |
| 更新会话 | POST | `/api/sessions/{id}` | `UpdateSessionRequest` | `SessionResponse` |

### 消息管理接口

| 接口 | 方法 | 路径 | 参数 | 响应 |
|------|------|------|------|------|
| 获取消息历史 | GET | `/api/messages` | `user_id`, `session_id` | `GetMessagesResponse` |
| 创建消息 | POST | `/api/messages` | `CreateMessageRequest` | `void` |

### 数据模型

**SessionResponse**
```typescript
interface SessionResponse {
  id: string;           // 会话ID
  title: string;        // 会话标题
  created_at: string;   // 创建时间（ISO格式）
  updated_at: string;   // 更新时间（ISO格式）
}
```

**MessageResponse**
```typescript
interface MessageResponse {
  role: string;              // 消息角色：user/assistant
  content: string;           // 消息内容
  workflow_stage?: string;   // 工作流阶段（可选）
}
```

## 🔧 开发调试

### 1. 网络请求监控
```typescript
// 开发环境下的请求日志
if (process.env.NODE_ENV === 'development') {
  httpClient.interceptors.request.use((config) => {
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  });

  httpClient.interceptors.response.use(
    (response) => {
      console.log('✅ API Response:', response.config.url, response.status, response.data);
      return response;
    },
    (error) => {
      console.error('❌ API Error:', error.config?.url, error.response?.status, error.message);
      return Promise.reject(error);
    }
  );
}
```

### 2. 错误追踪
```typescript
// 错误上报（生产环境）
if (process.env.NODE_ENV === 'production') {
  window.addEventListener('unhandledrejection', (event) => {
    // 上报未处理的Promise错误
    console.error('Unhandled Promise Rejection:', event.reason);
  });
}
```

### 3. 性能监控
```typescript
// API响应时间监控
const startTime = Date.now();
const response = await httpClient.get(url);
const duration = Date.now() - startTime;
console.log(`API ${url} took ${duration}ms`);
```

这个完整的后端交互实现提供了：
- 🔄 **完整的CRUD操作**
- 🛡️ **多层错误处理**
- 💾 **智能缓存机制**
- 🔐 **安全的认证集成**
- 🚀 **性能优化策略**
- 📊 **详细的监控和调试**

通过这套架构，前端可以与后端API进行高效、可靠的数据交互，同时提供优秀的用户体验。