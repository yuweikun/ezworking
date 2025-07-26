# 🧪 流式响应测试指南

恭喜！流式响应系统已经实现完成。现在你可以测试真实的AI模型响应效果了。

## 🚀 快速开始

### 1. 设置API密钥

在项目根目录创建 `.env.local` 文件：

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. 快速演示 (推荐首次使用)

```bash
npm run demo:quick
```

这会运行一个简单的演示，展示基本的流式响应功能。

## 📋 测试选项

### 选项1: Agent直接测试 (开发调试)

```bash
# 查看所有可用的测试场景
npm run test:stream:list

# 运行所有测试场景
npm run test:stream

# 运行特定场景
npx tsx lib/ai/examples/real-stream-test.ts "基础对话"
```

**测试场景包括：**
- 基础对话 - 测试基础对话功能和流式响应
- 职业评估开始 - 测试职业定位工作流的启动
- 职业评估进行中 - 测试工作流状态传递和继续评估
- 技术问题咨询 - 测试带历史记录的技术咨询
- 复杂查询 - 测试复杂查询的处理和详细响应

### 选项2: HTTP API测试 (集成测试)

首先启动开发服务器：
```bash
npm run dev
```

然后在另一个终端运行：
```bash
# 查看所有API测试场景
npm run test:api:list

# 运行所有API测试
npm run test:api

# 运行特定API测试
npx tsx lib/ai/examples/api-stream-test.ts "基础对话测试"
```

### 选项3: curl快速验证

```bash
# 确保开发服务器运行中，然后：
curl -X POST http://localhost:3000/api/ai/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "query": "你好，请介绍一下你自己",
    "sessionId": "test-session"
  }'
```

## 🔍 测试输出说明

每个测试会显示：

1. **任务分配**: CoordinatorAgent选择的处理节点
2. **流式响应**: 实时AI回复内容
3. **第一个chunk验证**: 检查workflow_state是否正确包含
4. **完成统计**: chunk数量、字符数、响应时间
5. **SSE格式验证**: Server-Sent Events格式检查

### 验证要点 ✅

- **Requirement 4.1**: Server-Sent Events格式输出
- **Requirement 4.2**: 每个响应块包含content字段
- **Requirement 4.3**: 最后响应块包含finished=true
- **Requirement 4.4**: 第一条响应包含workflow_state字段
- **Requirement 4.5**: 错误处理正常工作

## 🎯 测试示例

### 基础对话测试
```bash
npm run demo:quick
```

预期输出：
```
🚀 流式响应快速演示

1️⃣ 检查OpenAI配置...
✅ 配置验证通过

2️⃣ 创建对话Agent...
✅ Agent创建成功

3️⃣ 发送查询: "你好，请简单介绍一下你自己"
📡 开始接收流式响应...

🔍 第一个chunk信息:
   - 包含workflow_state: ✅
   - workflow_state值: null
   - 是否完成: ❌

📝 响应内容:
你好！我是一个AI助手，专门帮助用户解决各种问题...

✅ 响应完成!
📊 统计:
   - 总chunk数: 15
   - 总字符数: 234
   - 最终状态: 已完成
```

### 职业评估测试
```bash
npx ts-node lib/ai/examples/real-stream-test.ts "职业评估开始"
```

预期会看到CoordinatorAgent将任务分配给career-positioning工作流。

### API端点测试
```bash
# 启动服务器
npm run dev

# 在另一个终端
npm run test:api
```

预期会看到完整的HTTP请求/响应流程。

## 🐛 故障排除

### 常见问题

1. **API密钥错误**
   ```
   ❌ OpenAI配置错误: Invalid API key
   ```
   **解决**: 检查 `.env.local` 中的 `OPENAI_API_KEY`

2. **服务器未启动**
   ```
   ❌ 无法连接到服务器
   ```
   **解决**: 运行 `npm run dev`

3. **依赖缺失**
   ```
   ❌ Cannot find module 'ts-node'
   ```
   **解决**: 运行 `npm install`

4. **网络问题**
   ```
   ❌ Request timeout
   ```
   **解决**: 检查网络连接和OpenAI服务状态

## 📊 性能测试

### 测量响应时间
```bash
time npm run demo:quick
```

### 并发测试 (小心API限制)
```bash
for i in {1..3}; do
  npm run demo:quick &
done
wait
```

## 🎉 下一步

测试成功后，你可以：

1. **集成到前端**: 使用fetch API调用 `/api/ai/stream`
2. **添加更多场景**: 编辑测试文件添加自定义场景
3. **优化性能**: 调整模型参数和响应策略
4. **实现UI**: 创建聊天界面展示流式响应

## 📚 相关文件

- `lib/ai/examples/TESTING_GUIDE.md` - 详细测试指南
- `lib/ai/examples/real-stream-test.ts` - Agent直接测试
- `lib/ai/examples/api-stream-test.ts` - HTTP API测试
- `lib/ai/examples/quick-demo.ts` - 快速演示
- `app/api/ai/stream/route.ts` - API端点实现
- `lib/ai/stream-utils.ts` - 流式响应工具

开始测试吧！🚀