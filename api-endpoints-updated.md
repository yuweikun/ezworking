# 更新后的Session API端点文档

## 概述

Session API已经重构为更清晰的分离端点，便于前端调用和维护。

## API端点

### 1. 获取会话列表
- **端点**: `GET /api/sessions`
- **认证**: 需要Bearer token
- **功能**: 获取当前用户的所有会话列表
- **响应**: 分页的会话列表

### 2. 创建新会话
- **端点**: `POST /api/sessions`
- **认证**: 需要Bearer token
- **请求体**: `{ title: string }`
- **功能**: 创建新的聊天会话

### 3. 更新会话标题 (新)
- **端点**: `POST /api/sessions/update`
- **认证**: 需要Bearer token
- **请求体**: `{ sessionId: string, title: string }`
- **功能**: 更新指定会话的标题

#### 请求示例
```javascript
POST /api/sessions/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "uuid-here",
  "title": "新的会话标题"
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid", 
    "title": "新的会话标题",
    "created_at": "2025-07-26T...",
    "updated_at": "2025-07-26T..."
  },
  "timestamp": "2025-07-26T..."
}
```

### 4. 删除会话 (新)
- **端点**: `POST /api/sessions/delete`
- **认证**: 需要Bearer token
- **请求体**: `{ sessionId: string }`
- **功能**: 删除指定会话及其所有消息

#### 请求示例
```javascript
POST /api/sessions/delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "uuid-here"
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "data": {
    "message": "会话已成功删除",
    "deleted_session_id": "uuid"
  },
  "timestamp": "2025-07-26T..."
}
```

## 前端集成

### ConversationService更新

前端服务已更新为使用新的API端点：

```typescript
// 删除会话
await httpClient.post('/api/sessions/delete', {
  sessionId: conversationId
});

// 更新会话标题
await httpClient.post('/api/sessions/update', {
  sessionId: conversationId,
  title: newTitle
});
```

### 错误处理

所有端点都返回统一的错误格式：

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "错误描述",
  "status": 400,
  "timestamp": "2025-07-26T..."
}
```

常见错误码：
- `UNAUTHORIZED` (401) - 认证失败
- `ACCESS_DENIED` (403) - 无权访问指定会话
- `INVALID_SESSION_ID` (400) - 会话ID格式无效
- `MISSING_REQUIRED_FIELDS` (400) - 缺少必需字段
- `VALIDATION_ERROR` (400) - 数据验证失败

## 安全特性

1. **认证验证**: 所有API都需要有效的Bearer token
2. **权限检查**: 用户只能操作自己的会话
3. **UUID验证**: 会话ID必须是有效的UUID格式
4. **数据验证**: 严格的输入验证和清理
5. **级联删除**: 删除会话时自动删除相关消息
6. **缓存管理**: 操作后自动清除相关缓存

## 测试

### 测试文件
- `test-new-session-apis.ps1` - PowerShell API测试
- `test-new-frontend-integration.html` - 前端集成测试
- `test-api-direct.html` - 直接API测试

### 测试步骤
1. 确保用户已登录
2. 创建测试会话
3. 测试更新标题功能
4. 测试删除功能
5. 验证操作结果

## 迁移指南

### 从旧API迁移

**旧的更新API**:
```javascript
POST /api/sessions/{id}
{ "title": "新标题" }
```

**新的更新API**:
```javascript
POST /api/sessions/update
{ "sessionId": "uuid", "title": "新标题" }
```

**旧的删除API**:
```javascript
POST /api/sessions/{id}
{ "action": "delete" }
```

**新的删除API**:
```javascript
POST /api/sessions/delete
{ "sessionId": "uuid" }
```

### 优势

1. **更清晰的端点** - 每个操作有专门的端点
2. **更好的RESTful设计** - 符合REST最佳实践
3. **更容易维护** - 代码分离，职责单一
4. **更好的错误处理** - 针对性的错误处理
5. **更容易测试** - 独立的端点便于单元测试

## 向后兼容

旧的`/api/sessions/[id]`端点仍然保留，但建议迁移到新的端点以获得更好的维护性和扩展性。