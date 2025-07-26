# AI Agent系统接口文档

## 接口地址

```
POST /api/ai/stream
```

## 请求格式

### 请求头
```http
Content-Type: application/json
Authorization: Bearer <token>
```

### 请求参数
```json
{
  "query": "用户查询内容",
  "sessionId": "会话ID"
}
```

## 响应格式

### 流式响应 (Server-Sent Events)
```
data: {"content": "响应内容", "workflowState": {...}}
data: {"content": "更多内容"}
data: {"content": "最后内容", "finished": true}
```

### 响应数据结构
```typescript
{
  content: string                    // 响应内容片段
  workflowState?: WorkflowState      // 工作流状态（仅第一条消息包含）
  finished?: boolean                 // 是否完成（仅最后一条消息包含）
}
```

### 工作流状态结构
```typescript
{
  workflowId: 'career-positioning'
  phase: 'info_collection' | 'assessment' | 'analysis' | 'recommendation' | 'completed'
  progress: number
}
```

## 请求示例

**基础对话**
```json
{
  "query": "你好，我想了解一下人工智能",
  "sessionId": "session_123456"
}
```

**职业规划**
```json
{
  "query": "我想做职业规划",
  "sessionId": "session_123456"
}
```

## 响应示例

**一般对话**
```
data: {"content": "你好！我是AI助手，很高兴为您服务。", "finished": true}
```

**职业规划测评**
```
data: {"content": "{\"question\": \"您更喜欢哪种工作环境？\", \"A\": \"团队合作\", \"B\": \"独立工作\", \"C\": \"混合模式\", \"D\": \"远程工作\"}", "workflowState": {"workflowId": "career-positioning", "phase": "assessment", "progress": 1}, "finished": true}
```

## 客户端实现

```typescript
async function sendMessage(query: string, sessionId: string) {
  const response = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, sessionId })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        console.log('Content:', data.content);
        if (data.workflowState) {
          console.log('Workflow State:', data.workflowState);
        }
        if (data.finished) {
          console.log('Response completed');
          return;
        }
      }
    }
  }
}
```

## 错误处理

### 状态码
- `200` - 成功
- `400` - 请求参数错误
- `401` - 认证失败
- `500` - 服务器错误

### 错误响应
```json
{
  "error": "错误类型",
  "message": "详细描述",
  "code": "ERROR_CODE"
}
```