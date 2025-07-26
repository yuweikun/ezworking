# EzWorking - 智能求职助手

基于Multi-Agent的求职助手应用，帮助用户找到合适的工作机会并提供面试准备指导。

## 🚀 项目特性

### 核心功能
- **智能会话管理** - 创建、删除、更新和管理求职相关的对话
- **用户认证系统** - 安全的登录注册功能
- **实时交互** - 基于AI的智能对话体验
- **多智能体协作** - 通过多个AI代理协同工作提供最佳建议

### 技术亮点
- **全面错误处理** - 完善的错误恢复机制和用户友好的反馈
- **离线支持** - 网络断开时的优雅降级处理
- **乐观更新** - 即时UI响应，失败时自动回滚
- **缓存机制** - 智能缓存提升用户体验
- **响应式设计** - 适配各种设备尺寸

## 🛠️ 技术栈

### 前端框架
- **Next.js 15** - React全栈框架
- **React 19** - 用户界面库
- **TypeScript** - 类型安全的JavaScript

### UI组件库
- **Ant Design X** - 专为AI应用设计的组件库
- **Ant Design** - 企业级UI设计语言
- **antd-style** - 样式解决方案

### 状态管理
- **React Context** - 全局状态管理
- **Custom Hooks** - 业务逻辑封装

### 网络请求
- **Axios** - HTTP客户端
- **自定义HTTP客户端** - 统一的API调用封装

### 开发工具
- **ESLint** - 代码质量检查
- **Tailwind CSS** - 实用优先的CSS框架

## 📁 项目结构

```
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局组件
│   └── page.tsx           # 主页面组件
├── components/            # 可复用组件
│   ├── auth-button.tsx    # 认证按钮组件
│   ├── auth-modal.tsx     # 认证模态框组件
│   └── error-boundary.tsx # 错误边界组件
├── contexts/              # React Context
│   ├── auth-context.tsx   # 认证上下文
│   └── conversation-context.tsx # 会话上下文
├── hooks/                 # 自定义Hooks
│   └── use-conversation-realtime.ts # 实时会话Hook
├── lib/                   # 工具库
│   ├── error-handler.ts   # 错误处理工具
│   ├── http-client.ts     # HTTP客户端
│   ├── storage-utils.ts   # 存储工具
│   └── token-manager.ts   # Token管理
├── services/              # 业务服务层
│   ├── auth-service.ts    # 认证服务
│   ├── conversation-service.ts # 会话服务
│   ├── error-mapper.ts    # 错误映射
│   └── message-service.ts # 消息服务
├── types/                 # TypeScript类型定义
│   ├── auth.ts           # 认证相关类型
│   ├── conversation.ts   # 会话相关类型
│   ├── conversation-utils.ts # 会话工具函数
│   └── constants.ts      # 常量定义
└── .kiro/                # Kiro IDE配置
    └── specs/            # 功能规格文档
        ├── conversation-management/ # 会话管理规格
        └── user-auth/    # 用户认证规格
```

## 🎯 主要功能模块

### 1. 用户认证系统
- 用户注册和登录
- JWT Token管理
- 自动登录状态维护
- 安全的密码处理

### 2. 会话管理系统
- 创建新的求职对话
- 会话列表管理和排序
- 会话删除和更新
- 实时会话状态同步

### 3. 错误处理系统
- 多层级错误边界
- 自动重试机制
- 网络状态检测
- 用户友好的错误提示

### 4. AI对话功能
- 基于DeepSeek-R1模型的智能对话
- 流式响应处理
- 思考过程可视化
- 多轮对话上下文维护

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 环境配置
创建 `.env.local` 文件并配置以下环境变量：
```env
# API配置
NEXT_PUBLIC_API_URL=your_api_url
NEXT_PUBLIC_AUTH_TIMEOUT=10000

# AI模型配置
NEXT_PUBLIC_AI_API_KEY=your_ai_api_key
NEXT_PUBLIC_AI_MODEL=deepseek-ai/DeepSeek-R1
```

### 启动开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本
```bash
npm run build
npm start
```

## 🎨 设计理念

### 用户体验优先
- 直观的界面设计
- 流畅的交互体验
- 快速的响应时间
- 清晰的错误提示

### 技术架构
- 模块化的代码组织
- 类型安全的开发体验
- 可扩展的组件设计
- 完善的错误处理

### AI集成
- 智能的对话体验
- 多智能体协作
- 个性化的求职建议
- 实时的反馈机制

## 📋 开发规范

### 代码风格
- 使用TypeScript进行类型检查
- 遵循ESLint规则
- 组件采用函数式编程
- 使用自定义Hooks封装业务逻辑

### 错误处理
- 统一的错误处理机制
- 用户友好的错误提示
- 自动重试和恢复
- 完善的日志记录

### 性能优化
- 组件懒加载
- 智能缓存策略
- 网络请求优化
- 内存泄漏防护

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Ant Design X](https://x.ant.design/) - 提供优秀的AI组件库
- [Next.js](https://nextjs.org/) - 强大的React框架
- [DeepSeek](https://www.deepseek.com/) - 提供AI模型支持

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues: [https://github.com/yuweikun/ezworking/issues](https://github.com/yuweikun/ezworking/issues)
- 项目地址: [https://github.com/yuweikun/ezworking](https://github.com/yuweikun/ezworking)

---

**EzWorking** - 让求职变得更简单 🚀