# 工作流状态管理方案

## 概述

本文档描述了AI Agent系统中工作流状态的管理方案，包括存储、获取和使用方式。

## 当前实现

### 数据库存储结构

工作流状态存储在 `chat_messages` 表的 `work_stage` 字段中：

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  work_stage TEXT,           -- JSON字符串格式的WorkflowState
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### WorkflowState 数据结构

```typescript
interface WorkflowState {
  workflowId: 'career-positioning';  // 工作流类型
  phase: 'info_collection' | 'assessment' | 'analysis' | 'recommendation' | 'completed';
  progress: number;  // 当前阶段进度
}
```

### 存储逻辑

1. **用户消息存储**：
   - 如果前端提供了 `workflowState`，存储到 `work_stage` 字段
   - 通常用户消息不包含工作流状态

2. **AI回复存储**：
   - 存储AI处理后的最新 `workflowState`
   - 这是工作流状态的权威来源

## 新的获取逻辑

### 核心原理

**前端不需要在请求中传递 `workflowState`，系统会自动从数据库中获取最新状态。**

### 实现方式

```typescript
// MessageService.getWorkflowState()
static async getWorkflowState(userId: string, sessionId: string): Promise<WorkflowState | null> {
  const messages = await this.fetchMessages(userId, sessionId);
  
  // 从后往前查找最后一条assistant消息
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant' && message.workflow_stage) {
      try {
        return JSON.parse(message.workflow_stage);
      } catch (parseError) {
        console.warn('Failed to parse workflow_stage JSON:', parseError);
        continue; // 继续查找上一条消息
      }
    }
  }
  
  return null;
}
```

### API处理流程

```typescript
// app/api/ai/stream/route.ts
async function handleStreamRequest(request: NextRequest, user: User) {
  const body: StreamRequest = await request.json();
  
  // 获取对话历史
  const history = await MessageService.formatMessagesForOpenAI(user.id, body.sessionId, true);
  
  // 如果前端没有提供workflowState，从数据库获取
  let currentWorkflowState = body.workflowState;
  if (!currentWorkflowState) {
    currentWorkflowState = await MessageService.getWorkflowState(user.id, body.sessionId);
  }
  
  // 使用获取到的状态继续处理...
}
```

## 使用方式对比

### 方式一：前端管理状态（原方案）

**前端请求**：
```json
{
  "query": "A",
  "sessionId": "session_123",
  "workflowState": {
    "workflowId": "career-positioning",
    "phase": "assessment", 
    "progress": 5
  }
}
```

**流式响应**：
```json
{"content": "下一个问题...", "workflowState": {...}, "finished": false}
{"content": "", "workflowState": {...}, "finished": true}
```

### 方式二：后端管理状态（新方案）

**前端请求**：
```json
{
  "query": "A",
  "sessionId": "session_123"
}
```

**流式响应（简化模式）**：
```json
{"content": "下一个问题...", "finished": false}
{"content": "", "finished": true}
```

**获取工作流状态**：
```typescript
// 前端需要时可以单独查询
const workflowState = await MessageService.getWorkflowState(userId, sessionId);
```

## 优势分析

### 新方案优势

1. **简化前端逻辑**
   - 前端不需要维护工作流状态
   - 减少状态同步问题
   - 降低前端复杂度

2. **数据一致性**
   - 状态完全由后端管理
   - 避免前后端状态不一致
   - 单一数据源原则

3. **减少网络传输**
   - 流式响应不包含重复的状态信息
   - 减少带宽使用
   - 提高响应速度

4. **更好的容错性**
   - 即使前端状态丢失，也能从数据库恢复
   - 支持多设备同步
   - 支持会话恢复

### 潜在问题及解决方案

1. **额外数据库查询**
   - **问题**：每次请求都需要查询数据库获取状态
   - **解决**：查询很轻量，且可以与历史消息查询合并

2. **并发处理**
   - **问题**：多个并发请求可能导致状态不一致
   - **解决**：使用数据库事务和乐观锁机制

3. **缓存策略**
   - **问题**：频繁查询数据库可能影响性能
   - **解决**：可以在会话级别添加缓存

## 兼容性方案

系统同时支持两种方式，确保向后兼容：

```typescript
// 混合方案：优先使用前端提供的状态，否则从数据库获取
let currentWorkflowState = body.workflowState;
if (!currentWorkflowState) {
  currentWorkflowState = await MessageService.getWorkflowState(user.id, body.sessionId);
}
```

## 实际使用场景

### 职业定位工作流示例

1. **用户开始职业规划**
   ```json
   POST /api/ai/stream
   {"query": "我想做职业规划", "sessionId": "session_123"}
   ```

2. **系统响应并存储状态**
   ```
   // 流式响应
   data: {"content": "欢迎使用职业定位服务！", "finished": false}
   data: {"content": "请告诉我您的教育背景", "finished": true}
   
   // 数据库存储
   INSERT INTO chat_messages (session_id, role, content, work_stage) VALUES 
   ('session_123', 'assistant', '欢迎使用职业定位服务！请告诉我您的教育背景', 
    '{"workflowId":"career-positioning","phase":"info_collection","progress":0}');
   ```

3. **用户继续对话**
   ```json
   POST /api/ai/stream
   {"query": "我是计算机专业", "sessionId": "session_123"}
   ```

4. **系统自动获取状态并继续工作流**
   ```typescript
   // 后端自动获取：workflowState = {workflowId: 'career-positioning', phase: 'info_collection', progress: 0}
   // 继续信息收集或转入测评阶段
   ```

## 前端集成建议

### React Hook 示例

```typescript
function useAIChat(sessionId: string) {
  const [messages, setMessages] = useState([]);
  const [workflowState, setWorkflowState] = useState(null);

  const sendMessage = async (query: string) => {
    // 发送消息（不需要传递workflowState）
    const response = await fetch('/api/ai/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sessionId })
    });

    // 处理流式响应...
    
    // 如果需要获取工作流状态
    if (needWorkflowState) {
      const state = await MessageService.getWorkflowState(userId, sessionId);
      setWorkflowState(state);
    }
  };

  return { messages, workflowState, sendMessage };
}
```

### 状态显示组件

```typescript
function WorkflowProgress({ sessionId }: { sessionId: string }) {
  const [workflowState, setWorkflowState] = useState(null);

  useEffect(() => {
    // 获取当前工作流状态
    MessageService.getWorkflowState(userId, sessionId)
      .then(setWorkflowState);
  }, [sessionId]);

  if (!workflowState) return null;

  return (
    <div className="workflow-progress">
      <h3>职业定位进度</h3>
      <p>当前阶段: {workflowState.phase}</p>
      <p>进度: {workflowState.progress}</p>
    </div>
  );
}
```

## 总结

新的工作流状态管理方案通过将状态管理责任转移到后端，简化了前端逻辑，提高了数据一致性，并减少了网络传输。同时保持了向后兼容性，支持渐进式迁移。

**推荐使用新方案**，特别是对于新开发的功能。现有功能可以逐步迁移到新方案。