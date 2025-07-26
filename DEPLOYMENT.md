# 部署指南

## 🚀 部署选项

### 1. Vercel 部署（推荐）

Vercel是Next.js的官方部署平台，提供最佳的性能和开发体验。

#### 步骤：
1. 访问 [Vercel](https://vercel.com)
2. 使用GitHub账号登录
3. 导入此仓库：`https://github.com/yuweikun/ezworking`
4. 配置环境变量（见下方）
5. 点击部署

#### 环境变量配置：
```env
NEXT_PUBLIC_API_URL=your_api_url
NEXT_PUBLIC_AUTH_TIMEOUT=10000
NEXT_PUBLIC_AI_API_KEY=your_ai_api_key
NEXT_PUBLIC_AI_MODEL=deepseek-ai/DeepSeek-R1
```

### 2. Netlify 部署

#### 步骤：
1. 访问 [Netlify](https://netlify.com)
2. 连接GitHub仓库
3. 设置构建命令：`npm run build`
4. 设置发布目录：`.next`
5. 配置环境变量
6. 部署

### 3. Docker 部署

#### 创建 Dockerfile：
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### 构建和运行：
```bash
docker build -t ezworking .
docker run -p 3000:3000 ezworking
```

### 4. 传统服务器部署

#### 要求：
- Node.js 18+
- PM2（进程管理器）

#### 步骤：
```bash
# 克隆仓库
git clone https://github.com/yuweikun/ezworking.git
cd ezworking

# 安装依赖
npm install

# 构建项目
npm run build

# 使用PM2启动
pm2 start npm --name "ezworking" -- start
```

## 🔧 环境变量说明

| 变量名 | 描述 | 必需 | 默认值 |
|--------|------|------|--------|
| `NEXT_PUBLIC_API_URL` | 后端API地址 | 是 | - |
| `NEXT_PUBLIC_AUTH_TIMEOUT` | 认证超时时间(ms) | 否 | 10000 |
| `NEXT_PUBLIC_AI_API_KEY` | AI模型API密钥 | 是 | - |
| `NEXT_PUBLIC_AI_MODEL` | AI模型名称 | 否 | deepseek-ai/DeepSeek-R1 |

## 📊 性能优化

### 1. 构建优化
- 启用Next.js的自动优化
- 使用静态生成（SSG）
- 图片优化

### 2. 缓存策略
- 浏览器缓存
- CDN缓存
- API响应缓存

### 3. 监控和分析
- 使用Vercel Analytics
- 配置错误监控
- 性能指标追踪

## 🔒 安全配置

### 1. 环境变量安全
- 不要在代码中硬编码敏感信息
- 使用平台提供的环境变量管理
- 定期轮换API密钥

### 2. HTTPS配置
- 确保使用HTTPS
- 配置安全头部
- 启用HSTS

### 3. API安全
- 实施速率限制
- 验证输入数据
- 使用CORS策略

## 🐛 故障排除

### 常见问题：

1. **构建失败**
   - 检查Node.js版本
   - 清除缓存：`npm run clean`
   - 重新安装依赖：`rm -rf node_modules && npm install`

2. **环境变量未生效**
   - 确保变量名以`NEXT_PUBLIC_`开头（客户端变量）
   - 重启开发服务器
   - 检查变量值是否正确

3. **API连接失败**
   - 检查API地址是否正确
   - 验证网络连接
   - 查看浏览器控制台错误

## 📞 支持

如果在部署过程中遇到问题，请：

1. 查看项目的GitHub Issues
2. 检查部署平台的日志
3. 参考Next.js官方文档

---

祝您部署顺利！🎉