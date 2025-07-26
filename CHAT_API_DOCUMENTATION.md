# 聊天API文档

本文档描述了新实现的两个聊天API端点，用于处理用户与AI的对话交互。

## 概述

实现了以下两个核心功能：

1. **消息存储** - 将用户查询和AI流式输出的完整回复保存到 `chat_messages` 表
2. **上下文对话** - 将当前session的所有消息作为上下文传入AI流程

## API端点

### 1. 普通聊天API

**端点**: `POST /api/chat`

**功能**: 
- 存储用户消息到数据库（role: user）
- 获取当前session的所有消息作为上下文
- 调用AI流程生成完整回复
- 存储AI回复到数据库（role: ai）

**请求格式**:
```json
{
  "session_id": "uuid-string",
  "query": "用户的问题或消息"
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "message-uuid",
      "session_id": "session-uuid", 
      "role": "ai",
      "content": "AI的完整回复",
      "work_stage": "工作流状态JSON字符串",
      "timestamp": "2025-01-26T10:30:00Z"
    },
    "response": "AI的完整回复内容"
  },
  "timestamp": "2025-01-26T10:30:00Z"
}
```

**使用示例**:
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    session_id: 'your-session-id',
    query: '你好，请介绍一下你自己'
  })
});

const data = await response.json();
console.log('AI回复:', data.data.response);
```

### 2. 流式聊天API

**端点**: `POST /api/chat/stream`

**功能**:
- 存储用户消息到数据库（role: user）
- 获取当前session的所有消息作为上下文
- 调用AI流程生成流式回复
- 在流式响应结束后存储完整的AI回复到数据库（role: ai）

**请求格式**:
```json
{
  "session_id": "uuid-string", 
  "query": "用户的问题或消息"
}
```

**响应格式**: Server-Sent Events (SSE)
```
data: {"content": "部分", "finished": false, "workflowState": null}
data: {"content": "回复", "finished": false, "workflowState": null}
data: {"content": "内容", "finished": true, "workflowState": {...}}
```

**使用示例**:
```javascript
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    session_id: 'your-session-id',
    query: '请详细介绍人工智能的发展历程'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let fullContent = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.substring(6));
      
      if (data.content) {
        fullContent += data.content;
        console.log('接收到内容:', data.content);
      }
      
      if (data.finished) {
        console.log('完整回复:', fullContent);
        break;
      }
    }
  }
}
```

## 数据库存储

### chat_messages 表结构

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  work_stage TEXT, -- JSON字符串，存储工作流状态
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 存储逻辑

1. **用户消息存储**:
   - `role`: "user"
   - `content`: 用户输入的查询内容
   - `work_stage`: null

2. **AI消息存储**:
   - `role`: "ai" 
   - `content`: AI生成的完整回复内容
   - `work_stage`: 工作流状态的JSON字符串（如果有）

## 上下文处理

### 消息上下文格式化

API会自动获取当前session的所有历史消息，并格式化为OpenAI兼容的消息格式：

```javascript
const context = messages.map(msg => ({
  role: msg.role === "ai" ? "assistant" : msg.role,
  content: msg.content
}));
```

### 工作流状态管理

- 从最后一条AI消息中提取 `work_stage` 字段
- 解析JSON格式的工作流状态
- 传递给AI流程以维持对话连续性

## 错误处理

### 常见错误码

- `VALIDATION_ERROR`: 缺少必需参数
- `INVALID_SESSION_ID`: 会话ID格式无效
- `ACCESS_DENIED`: 无权访问指定会话
- `CONFIG_ERROR`: OpenAI配置错误
- `METHOD_NOT_ALLOWED`: 不支持的HTTP方法

### 错误响应格式

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "错误描述信息",
  "timestamp": "2025-01-26T10:30:00Z"
}
```

## 认证和权限

### 认证要求

- 所有API都需要Bearer Token认证
- Token通过 `/api/auth/login` 获取

### 权限检查

- 验证用户是否有权限访问指定的session
- 通过 `checkSessionPermission` 函数实现

## 测试工具

### PowerShell测试脚本

```bash
# 测试所有功能
./test-chat-apis.ps1

# 只测试普通聊天API
./test-chat-apis.ps1 -TestType chat

# 只测试流式聊天API  
./test-chat-apis.ps1 -TestType stream
```

### HTML测试页面

打开 `test-chat-stream.html` 在浏览器中进行交互式测试：

1. 输入用户凭据并登录
2. 创建测试会话
3. 选择API类型（普通/流式）
4. 发送消息并查看响应
5. 查看统计信息（响应时间、数据块数等）

## 性能考虑

### 普通聊天API
- 适合简短对话
- 响应时间较短
- 一次性返回完整结果

### 流式聊天API
- 适合长文本生成
- 提供实时反馈
- 更好的用户体验
- 支持中断和错误恢复

## 集成示例

### React组件示例

```jsx
import { useState } from 'react';

function ChatComponent({ sessionId, authToken }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sendStreamMessage = async (query) => {
    setIsStreaming(true);
    
    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ session_id: sessionId, query })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessage = { role: 'ai', content: '' };
      
      // 添加空的AI消息
      setMessages(prev => [...prev, aiMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            
            if (data.content) {
              aiMessage.content += data.content;
              setMessages(prev => [...prev.slice(0, -1), { ...aiMessage }]);
            }
            
            if (data.finished) return;
          }
        }
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendStreamMessage(input)}
        disabled={isStreaming}
      />
      
      <button 
        onClick={() => sendStreamMessage(input)}
        disabled={isStreaming}
      >
        {isStreaming ? '发送中...' : '发送'}
      </button>
    </div>
  );
}
```

## 消息管理API

除了聊天API外，还提供了专门的消息管理API用于直接操作聊天消息。

### 3. 获取消息历史

**端点**: `GET /api/messages`

**功能**: 获取指定会话的消息历史记录

**查询参数**:
- `session_id` (必需): 会话ID

**响应格式**:
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "history": [
      {
        "id": "uuid",
        "role": "user|assistant",
        "content": "消息内容",
        "workflow_stage": "工作流阶段JSON字符串",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 4. 创建单条消息

**端点**: `POST /api/messages/create`

**功能**: 在指定会话中插入一条新消息

**请求体**:
```json
{
  "session_id": "uuid",
  "role": "user|assistant",
  "content": "消息内容",
  "workflow_stage": {
    "stage": "阶段名称",
    "step": 1
  }
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "消息创建成功"
}
```

### 5. 批量创建消息

**端点**: `POST /api/messages/batch`

**功能**: 在指定会话中批量插入多条消息

**请求体**:
```json
{
  "session_id": "uuid",
  "messages": [
    {
      "role": "user|assistant",
      "content": "消息内容1",
      "workflow_stage": {
        "stage": "阶段名称",
        "step": 1
      }
    },
    {
      "role": "assistant",
      "content": "消息内容2",
      "workflow_stage": {
        "stage": "阶段名称",
        "step": 2
      }
    }
  ]
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "inserted_count": 2,
    "message_ids": ["uuid1", "uuid2"]
  },
  "message": "成功插入 2 条消息"
}
```

**消息API注意事项**:
- 单次批量插入最多支持100条消息
- 所有消息的`content`字段不能为空
- `workflow_stage`字段是可选的，如果提供则会以JSON字符串形式存储
- 插入消息后会自动更新会话的`updated_at`和`last_message_at`时间戳
- 只能在用户有权限的会话中插入消息

## 总结

这些API提供了完整的聊天功能实现：

1. **数据持久化** - 所有对话都会保存到数据库
2. **上下文连续性** - 每次对话都会考虑历史消息
3. **灵活的响应模式** - 支持普通和流式两种响应方式
4. **完整的错误处理** - 提供详细的错误信息和恢复机制
5. **权限控制** - 确保用户只能访问自己的会话
6. **消息管理** - 支持单条和批量消息插入，便于数据导入和测试

通过这些API，前端可以轻松实现一个功能完整的聊天界面，支持实时对话和历史记录管理。消息管理API还可以用于数据迁移、批量导入历史对话等场景。