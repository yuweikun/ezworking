# 错误处理和响应标准化实现文档

## 概述

本文档描述了为 Supabase Chat API 实现的统一错误处理和响应标准化系统。该实现满足了任务 7 的所有要求，提供了全面的错误处理、详细的验证反馈和标准化的响应格式。

## 实现的功能

### 1. 统一的错误响应格式

#### 错误响应结构
```typescript
interface ApiError {
  error: string;           // 标准化错误代码
  message: string;         // 用户友好的错误消息
  status: number;          // HTTP状态码
  timestamp: string;       // ISO8601格式的时间戳
  details?: any;           // 可选的详细错误信息
}
```

#### 成功响应结构
```typescript
interface ApiResponse<T> {
  success: boolean;        // 始终为true
  data?: T;               // 响应数据
  timestamp: string;       // ISO8601格式的时间戳
  pagination?: {          // 可选的分页信息
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}
```

### 2. 标准化错误代码映射

实现了完整的错误代码映射系统，包含：

#### 客户端错误 (4xx)
- `VALIDATION_ERROR` (400) - 请求参数验证失败
- `INVALID_JSON` (400) - 请求体必须是有效的JSON格式
- `INVALID_PARAMS` (400) - 请求参数无效
- `INVALID_SESSION_ID` (400) - 会话ID格式无效
- `MISSING_REQUIRED_FIELDS` (400) - 缺少必需字段
- `INVALID_REFERENCE` (400) - 引用的资源不存在

#### 认证错误 (401)
- `UNAUTHORIZED` (401) - 未授权访问
- `INVALID_CREDENTIALS` (401) - 登录凭据无效
- `TOKEN_EXPIRED` (401) - 认证令牌已过期
- `TOKEN_INVALID` (401) - 认证令牌无效
- `LOGIN_FAILED` (401) - 登录失败
- `EMAIL_NOT_CONFIRMED` (401) - 邮箱尚未验证

#### 权限错误 (403)
- `ACCESS_DENIED` (403) - 访问被拒绝
- `INSUFFICIENT_PERMISSIONS` (403) - 权限不足
- `ACCOUNT_DISABLED` (403) - 账户已被禁用
- `RESOURCE_FORBIDDEN` (403) - 无权访问此资源

#### 资源不存在 (404)
- `NOT_FOUND` (404) - 资源不存在
- `SESSION_NOT_FOUND` (404) - 会话不存在
- `MESSAGE_NOT_FOUND` (404) - 消息不存在
- `USER_NOT_FOUND` (404) - 用户不存在

#### 其他错误
- `METHOD_NOT_ALLOWED` (405) - 请求方法不被允许
- `DUPLICATE_ENTRY` (409) - 资源已存在
- `TOO_MANY_REQUESTS` (429) - 请求过于频繁
- `INTERNAL_ERROR` (500) - 服务器内部错误
- `DATABASE_ERROR` (500) - 数据库操作失败

### 3. 增强的验证系统

#### 验证结果结构
```typescript
interface ValidationResult {
  isValid: boolean;                    // 整体验证是否通过
  errors: string[];                    // 通用错误消息
  fieldErrors?: Record<string, string[]>; // 字段级错误
  summary?: string;                    // 错误摘要信息
}
```

#### 验证功能特性
- **字段级错误反馈** - 每个字段的具体错误信息
- **详细错误消息** - 包含具体的验证失败原因
- **额外字段检测** - 识别不支持的请求字段
- **类型验证** - 确保字段类型正确
- **长度验证** - 检查字符串长度限制
- **格式验证** - UUID、邮箱等格式检查
- **枚举值验证** - 检查字段值是否在允许范围内

#### 新增验证函数
- `createValidationResult()` - 创建标准化验证结果
- `validatePaginationParams()` - 验证分页参数
- `validateRequestBody()` - 验证请求体JSON格式
- `validateRequiredFields()` - 验证必需字段
- `validateFieldTypes()` - 验证字段类型
- `validateEnumField()` - 验证枚举值
- `validateArrayField()` - 验证数组字段
- `mergeValidationResults()` - 合并多个验证结果

### 4. 增强的错误处理

#### 错误处理功能
- **上下文感知错误处理** - 包含请求上下文信息
- **详细错误日志** - 开发环境的详细错误信息
- **数据库错误映射** - Supabase特定错误的处理
- **认证错误处理** - Supabase Auth错误的统一处理
- **网络错误处理** - 超时和连接错误的处理

#### 新增响应函数
- `createValidationErrorResponse()` - 创建验证错误响应
- `createPaginatedResponse()` - 创建分页响应
- `createOperationResponse()` - 创建操作成功响应
- `withErrorHandling()` - 错误处理包装器
- `logError()` - 错误日志记录

### 5. API端点更新

所有API端点都已更新以使用新的错误处理系统：

#### 认证端点
- `/api/auth/login` - 用户登录
- `/api/auth/register` - 用户注册

#### 会话管理端点
- `/api/sessions` - 获取/创建会话
- `/api/sessions/[id]` - 更新/删除会话

#### 消息管理端点
- `/api/messages` - 获取/创建消息

### 6. 错误日志和监控

#### 日志功能
- **分级日志** - ERROR、WARN、INFO级别
- **结构化日志** - JSON格式的日志条目
- **上下文信息** - 包含请求路径和操作类型
- **开发环境输出** - 控制台详细错误信息
- **生产环境准备** - 支持外部日志服务集成

#### 日志结构
```typescript
{
  timestamp: string;     // ISO8601时间戳
  level: string;         // 日志级别
  errorCode: string;     // 错误代码
  message: string;       // 错误消息
  status: number;        // HTTP状态码
  details?: any;         // 详细信息
}
```

## 满足的需求

该实现满足了以下具体需求：

### 需求 1.3, 1.4 - 消息API错误处理
- ✅ 用户无权访问会话时返回403 Forbidden
- ✅ 会话不存在时返回404 Not Found
- ✅ 详细的错误消息和验证反馈

### 需求 2.4 - 会话列表错误处理
- ✅ 无效user_id时的适当错误响应
- ✅ 统一的错误格式

### 需求 3.3, 3.4 - 注册错误处理
- ✅ 邮箱已存在时返回409 Conflict
- ✅ 无效参数时返回400 Bad Request
- ✅ 详细的验证错误反馈

### 需求 4.3, 4.4 - 登录错误处理
- ✅ 无效凭据时返回401 Unauthorized
- ✅ 账户被锁定时返回403 Forbidden
- ✅ 统一的认证错误处理

### 需求 5.3, 5.4 - 会话创建错误处理
- ✅ 缺少必需参数时返回400 Bad Request
- ✅ 用户未认证时返回401 Unauthorized
- ✅ 详细的参数验证

### 需求 6.3, 6.4 - 消息创建错误处理
- ✅ 会话不存在或权限不足时返回403 Forbidden
- ✅ 缺少必需字段时返回400 Bad Request
- ✅ 字段级验证错误反馈

### 需求 7.3, 7.4 - 会话删除错误处理
- ✅ 会话不存在或权限不足时返回403 Forbidden
- ✅ 无效session_id时返回400 Bad Request
- ✅ 操作权限验证

### 需求 8.3, 8.4 - 会话更新错误处理
- ✅ 会话不存在或权限不足时返回403 Forbidden
- ✅ 无效更新参数时返回400 Bad Request
- ✅ 字段验证和权限检查

## 使用示例

### 创建错误响应
```typescript
// 使用标准错误代码
return createErrorResponse('VALIDATION_ERROR');

// 使用自定义消息
return createErrorResponse('VALIDATION_ERROR', '自定义错误消息');

// 包含详细信息
return createErrorResponse('VALIDATION_ERROR', '验证失败', 400, {
  fieldErrors: { email: ['邮箱格式无效'] }
});
```

### 创建验证错误响应
```typescript
const validation = validateLoginRequest(data);
if (!validation.isValid) {
  return createValidationErrorResponse(validation);
}
```

### 处理API错误
```typescript
try {
  // API操作
} catch (error) {
  return handleApiError(error, 'POST /api/auth/login');
}
```

## 测试

实现包含了全面的测试：

1. **错误响应格式测试** - 验证错误响应结构
2. **验证功能测试** - 测试字段级验证
3. **HTTP状态码测试** - 确保正确的状态码
4. **错误代码映射测试** - 验证错误代码正确性
5. **成功响应格式测试** - 验证成功响应结构

## 总结

该实现提供了：

- ✅ **统一的错误响应格式** - 所有API端点使用相同的错误结构
- ✅ **各种HTTP状态码的错误处理** - 完整的4xx和5xx错误支持
- ✅ **详细的错误消息和验证反馈** - 字段级错误和用户友好消息
- ✅ **标准化的响应格式** - 成功和错误响应的一致性
- ✅ **增强的日志和监控** - 结构化日志和错误追踪
- ✅ **全面的验证系统** - 详细的输入验证和错误反馈

这个实现确保了API的健壮性、一致性和用户友好性，满足了现代Web API的最佳实践要求。