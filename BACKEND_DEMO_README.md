# Ant Design X 后端集成演示

这个演示展示了如何将 Ant Design X 聊天界面与后端API集成，支持数据持久化和实时交互。

## 功能特性

### 🚀 核心功能
- **会话管理**: 创建、删除、切换会话
- **消息处理**: 发送用户消息，接收AI回复
- **数据持久化**: 会话和消息数据保存到后端
- **文件上传**: 支持文件上传和管理
- **实时更新**: 支持实时消息同步
- **错误处理**: 完善的错误处理和用户反馈

### 🛠 技术栈
- **前端**: React 19, Next.js 15, Ant Design X, TypeScript
- **HTTP客户端**: Axios
- **状态管理**: React Hooks
- **样式**: Ant Design + antd-style

## 文件结构

```
my-app/
├── app/
│   ├── page.tsx                 # 原始页面
│   ├── demo-with-backend.tsx    # 后端集成演示组件
│   └── demo-page.tsx           # 演示页面入口
├── lib/
│   └── api-mock.ts             # 模拟API服务
├── .env.local                  # 环境配置
└── BACKEND_DEMO_README.md      # 本文档
```

## 快速开始

### 1. 安装依赖
```bash
npm install
# 或
yarn install
```

### 2. 配置环境变量
编辑 `.env.local` 文件：

```env
# API配置
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api

# 是否使用模拟API (设置为false使用真实API)
NEXT_PUBLIC_USE_MOCK_API=true

# 认证配置
NEXT_PUBLIC_AUTH_ENABLED=true

# 文件上传配置
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/*,application/pdf,text/*
```

### 3. 运行演示
```bash
npm run dev
```

然后访问：
- 原始页面: `http://localhost:3000`
- 后端集成演示: 在代码中导入 `DemoWithBackend` 组件

## API 接口设计

### 会话管理
```typescript
// 获取会话列表
GET /api/conversations
Response: { success: boolean, data: ConversationItem[] }

// 创建新会话
POST /api/conversations
Body: { title: string, group: string }
Response: { success: boolean, data: ConversationItem }

// 删除会话
DELETE /api/conversations/:id
Response: { success: boolean, data: boolean }
```

### 消息处理
```typescript
// 获取会话消息
GET /api/conversations/:id/messages
Response: { success: boolean, data: MessageItem[] }

// 发送消息
POST /api/conversations/:id/messages
Body: { content: string, role: 'user' | 'assistant' }
Response: { success: boolean, data: MessageItem }

// 获取AI回复
POST /api/conversations/:id/ai-response
Body: { message: string }
Response: { success: boolean, data: MessageItem }
```

### 其他功能
```typescript
// 获取热门话题
GET /api/hot-topics
Response: { success: boolean, data: TopicItem[] }

// 文件上传
POST /api/upload
Body: FormData with file
Response: { success: boolean, data: { url: string } }
```

## 数据类型定义

```typescript
interface ConversationItem {
  key: string;
  label: string;
  group: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  conversationId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
```

## 使用模拟API

项目包含了一个完整的模拟API服务 (`lib/api-mock.ts`)，可以在没有真实后端的情况下测试所有功能：

### 特性
- 完整的CRUD操作
- 模拟网络延迟
- 智能AI回复生成
- 数据持久化（内存中）
- 错误处理

### 切换到真实API
1. 设置环境变量 `NEXT_PUBLIC_USE_MOCK_API=false`
2. 确保后端服务运行在配置的URL上
3. 实现对应的API端点

## 核心功能实现

### 1. 会话管理
```typescript
// 创建新会话
const handleCreateConversation = async () => {
  const title = `New Conversation ${conversations.length + 1}`;
  const newConversation = await apiService.createConversation(title);
  
  if (newConversation) {
    setConversations([newConversation, ...conversations]);
    setCurConversation(newConversation.key);
  }
};
```

### 2. 消息发送
```typescript
// 发送消息并获取AI回复
const handleSubmit = async (val: string) => {
  setLoading(true);
  
  try {
    // 发送用户消息
    await apiService.sendMessage(curConversation, val);
    
    // 获取AI回复
    const aiResponse = await apiService.getAIResponse(curConversation, val);
    
    if (aiResponse) {
      // 更新消息历史
      setMessageHistory(prev => ({
        ...prev,
        [curConversation]: [...currentMessages, userMessage, aiResponse]
      }));
    }
  } catch (error) {
    message.error('发送消息失败，请重试');
  } finally {
    setLoading(false);
  }
};
```

### 3. 文件上传
```typescript
// 处理文件上传
const handleFileUpload = async (file: File) => {
  const uploadedUrl = await apiService.uploadFile(file);
  if (uploadedUrl) {
    message.success('文件上传成功');
    return uploadedUrl;
  }
  return null;
};
```

## 错误处理

### HTTP拦截器
```typescript
// 请求拦截器 - 添加认证
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      message.error('认证失败，请重新登录');
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);
```

### 组件级错误处理
```typescript
try {
  const result = await apiService.someOperation();
  // 处理成功结果
} catch (error) {
  console.error('操作失败:', error);
  message.error('操作失败，请重试');
  // 回退到默认状态
}
```

## 性能优化

### 1. 请求去重
- 使用 AbortController 取消重复请求
- 实现请求缓存机制

### 2. 状态管理
- 合理使用 useEffect 依赖
- 避免不必要的重新渲染

### 3. 数据加载
- 实现懒加载和分页
- 使用骨架屏提升用户体验

## 部署建议

### 环境配置
```env
# 生产环境
NEXT_PUBLIC_API_BASE_URL=https://your-api.com/api
NEXT_PUBLIC_USE_MOCK_API=false
```

### 安全考虑
- 实现JWT认证
- 添加CORS配置
- 输入验证和清理
- 文件上传安全检查

## 扩展功能

### 1. 实时通信
- 集成WebSocket或Server-Sent Events
- 实现消息推送

### 2. 高级功能
- 消息搜索和过滤
- 会话导出和导入
- 多用户支持
- 消息加密

### 3. 监控和分析
- 添加错误监控
- 用户行为分析
- 性能监控

## 故障排除

### 常见问题
1. **API连接失败**: 检查网络配置和后端服务状态
2. **认证错误**: 验证token有效性和权限设置
3. **文件上传失败**: 检查文件大小和类型限制
4. **消息不同步**: 确认WebSocket连接状态

### 调试技巧
- 使用浏览器开发者工具查看网络请求
- 检查控制台错误信息
- 启用详细日志记录

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

MIT License