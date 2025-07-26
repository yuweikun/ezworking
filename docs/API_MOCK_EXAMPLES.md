# API接口Mock示例

## 📋 概述

本文档提供了EzWorking后端API接口的Mock示例，展示了前端期望的API行为和数据格式。

## 🔐 认证接口

### 1. 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**成功响应 (200)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "张三",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**失败响应 (401)**
```json
{
  "message": "邮箱或密码错误",
  "code": "INVALID_CREDENTIALS"
}
```

### 2. 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123"
}
```

**成功响应 (201)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_124",
    "email": "newuser@example.com",
    "name": "新用户",
    "created_at": "2025-01-26T10:30:00Z"
  }
}
```

**失败响应 (409)**
```json
{
  "message": "该邮箱已被注册",
  "code": "EMAIL_EXISTS"
}
```

## 💬 会话管理接口

### 1. 获取会话列表
```http
GET /api/sessions?id=user_123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**成功响应 (200)**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_001",
        "user_id": "user_123",
        "title": "求职咨询 - AI产品经理",
        "created_at": "2025-01-26T09:00:00Z",
        "updated_at": "2025-01-26T10:30:00Z"
      },
      {
        "id": "session_002",
        "user_id": "user_123", 
        "title": "面试准备指导",
        "created_at": "2025-01-25T14:20:00Z",
        "updated_at": "2025-01-25T16:45:00Z"
      },
      {
        "id": "session_003",
        "user_id": "user_123",
        "title": "简历优化建议", 
        "created_at": "2025-01-24T11:15:00Z",
        "updated_at": "2025-01-24T12:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": false
    }
  },
  "timestamp": "2025-07-26T03:27:33.527Z"
}
```

**失败响应 (401)**
```json
{
  "message": "未授权访问，请重新登录",
  "code": "UNAUTHORIZED"
}
```

### 2. 创建新会话
```http
POST /api/sessions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "user_id": "user_123",
  "title": "职业规划咨询"
}
```

**成功响应 (201)**
```json
{
  "id": "session_004",
  "title": "职业规划咨询",
  "created_at": "2025-01-26T11:00:00Z",
  "updated_at": "2025-01-26T11:00:00Z"
}
```

**失败响应 (400)**
```json
{
  "message": "会话标题不能为空",
  "code": "VALIDATION_ERROR"
}
```

### 3. 更新会话
```http
POST /api/sessions/session_001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "AI产品经理求职指导"
}
```

**成功响应 (200)**
```json
{
  "id": "session_001",
  "title": "AI产品经理求职指导",
  "created_at": "2025-01-26T09:00:00Z",
  "updated_at": "2025-01-26T11:15:00Z"
}
```

### 4. 删除会话
```http
POST /api/sessions/session_001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "action": "delete"
}
```

**成功响应 (200)**
```json
{
  "message": "会话删除成功"
}
```

**失败响应 (404)**
```json
{
  "message": "会话不存在或已被删除",
  "code": "NOT_FOUND"
}
```

## 📨 消息管理接口

### 1. 获取消息历史
```http
GET /api/messages?user_id=user_123&session_id=session_001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**成功响应 (200)**
```json
{
  "history": [
    {
      "role": "user",
      "content": "我想了解AI产品经理这个岗位需要什么技能？",
      "timestamp": "2025-01-26T09:05:00Z"
    },
    {
      "role": "assistant", 
      "content": "AI产品经理需要具备以下核心技能：\n\n1. **技术理解能力**\n- 了解机器学习基础概念\n- 熟悉AI模型的训练和部署流程\n- 理解数据处理和特征工程\n\n2. **产品设计能力**\n- 用户需求分析和产品规划\n- 原型设计和用户体验优化\n- 数据驱动的产品决策\n\n3. **项目管理能力**\n- 跨团队协作和沟通\n- 敏捷开发流程管理\n- 风险识别和问题解决\n\n您目前在哪些方面有经验，哪些需要加强呢？",
      "workflow_stage": "analysis",
      "timestamp": "2025-01-26T09:06:30Z"
    },
    {
      "role": "user",
      "content": "我有3年的传统产品经理经验，但对AI技术了解不多。",
      "timestamp": "2025-01-26T09:08:00Z"
    },
    {
      "role": "assistant",
      "content": "很好！您已经有了产品经理的基础，这是很大的优势。针对AI技术知识的补充，我建议：\n\n**学习路径：**\n1. **基础概念学习**（2-3周）\n   - 机器学习基本概念\n   - 监督学习vs无监督学习\n   - 常见算法类型和应用场景\n\n2. **实践项目体验**（1-2个月）\n   - 参与开源AI项目\n   - 使用低代码AI平台\n   - 分析竞品AI功能\n\n3. **行业案例研究**（持续）\n   - 研究成功的AI产品案例\n   - 关注AI产品的商业模式\n   - 了解AI产品的评估指标\n\n**推荐资源：**\n- 《AI产品经理手册》\n- Coursera的机器学习课程\n- 各大厂AI产品博客\n\n您希望我帮您制定更详细的学习计划吗？",
      "workflow_stage": "recommendation",
      "timestamp": "2025-01-26T09:10:15Z"
    }
  ]
}
```

### 2. 创建新消息
```http
POST /api/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "session_id": "session_001",
  "role": "user",
  "content": "请帮我制定一个3个月的学习计划",
  "work_stage": "planning"
}
```

**成功响应 (201)**
```json
{
  "message": "消息创建成功",
  "message_id": "msg_001"
}
```

## 🚀 Node.js Express Mock服务器示例

```javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors());
app.use(express.json());

// Mock数据
const users = [
  {
    id: 'user_123',
    email: 'user@example.com',
    password: 'password123', // 实际应用中应该加密
    name: '张三'
  }
];

const sessions = [
  {
    id: 'session_001',
    user_id: 'user_123',
    title: '求职咨询 - AI产品经理',
    created_at: '2025-01-26T09:00:00Z',
    updated_at: '2025-01-26T10:30:00Z'
  }
];

const messages = [
  {
    id: 'msg_001',
    session_id: 'session_001',
    role: 'user',
    content: '我想了解AI产品经理这个岗位需要什么技能？',
    timestamp: '2025-01-26T09:05:00Z'
  }
];

// JWT密钥
const JWT_SECRET = 'your-secret-key';

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: '未授权访问，请重新登录',
      code: 'UNAUTHORIZED'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({
        message: '未授权访问，请重新登录',
        code: 'UNAUTHORIZED'
      });
    }
    req.user = user;
    next();
  });
};

// 认证接口
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({
      message: '邮箱或密码错误',
      code: 'INVALID_CREDENTIALS'
    });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: '2025-01-01T00:00:00Z'
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(409).json({
      message: '该邮箱已被注册',
      code: 'EMAIL_EXISTS'
    });
  }

  const newUser = {
    id: `user_${Date.now()}`,
    email,
    password,
    name: '新用户'
  };
  
  users.push(newUser);
  
  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '24h' });
  
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      created_at: new Date().toISOString()
    }
  });
});

// 会话管理接口
app.get('/api/sessions', authenticateToken, (req, res) => {
  const { user_id } = req.query;
  
  const userSessions = sessions
    .filter(s => s.user_id === user_id)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  
  res.json(userSessions);
});

app.post('/api/sessions', authenticateToken, (req, res) => {
  const { user_id, title } = req.body;
  
  if (!title || title.trim() === '') {
    return res.status(400).json({
      message: '会话标题不能为空',
      code: 'VALIDATION_ERROR'
    });
  }

  const newSession = {
    id: `session_${Date.now()}`,
    user_id,
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  sessions.push(newSession);
  
  res.status(201).json(newSession);
});

app.post('/api/sessions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const sessionIndex = sessions.findIndex(s => s.id === id);
  
  if (sessionIndex === -1) {
    return res.status(404).json({
      message: '会话不存在或已被删除',
      code: 'NOT_FOUND'
    });
  }

  if (req.body.action === 'delete') {
    sessions.splice(sessionIndex, 1);
    res.json({ message: '会话删除成功' });
  } else if (req.body.title) {
    sessions[sessionIndex].title = req.body.title;
    sessions[sessionIndex].updated_at = new Date().toISOString();
    res.json(sessions[sessionIndex]);
  } else {
    res.status(400).json({
      message: '无效的请求参数',
      code: 'VALIDATION_ERROR'
    });
  }
});

// 消息管理接口
app.get('/api/messages', authenticateToken, (req, res) => {
  const { user_id, session_id } = req.query;
  
  const sessionMessages = messages
    .filter(m => m.session_id === session_id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  res.json({
    history: sessionMessages
  });
});

app.post('/api/messages', authenticateToken, (req, res) => {
  const { session_id, role, content, work_stage } = req.body;
  
  if (!session_id || !role || !content) {
    return res.status(400).json({
      message: '缺少必需的字段',
      code: 'VALIDATION_ERROR'
    });
  }

  const newMessage = {
    id: `msg_${Date.now()}`,
    session_id,
    role,
    content,
    work_stage,
    timestamp: new Date().toISOString()
  };
  
  messages.push(newMessage);
  
  res.status(201).json({
    message: '消息创建成功',
    message_id: newMessage.id
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
});

module.exports = app;
```

## 🐳 Docker部署Mock服务器

**Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

**package.json**
```json
{
  "name": "ezworking-mock-api",
  "version": "1.0.0",
  "description": "Mock API server for EzWorking",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## 🧪 API测试用例

### Postman集合示例

```json
{
  "info": {
    "name": "EzWorking API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["api", "auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "Sessions",
      "item": [
        {
          "name": "Get Sessions",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/sessions?user_id={{userId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "sessions"],
              "query": [
                {
                  "key": "user_id",
                  "value": "{{userId}}"
                }
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001"
    }
  ]
}
```

这个完整的API Mock示例提供了：
- 📋 **完整的接口规范**
- 🔐 **JWT认证机制**
- 💾 **内存数据存储**
- 🧪 **可测试的API端点**
- 🐳 **Docker部署支持**
- 📊 **Postman测试集合**

通过这个Mock服务器，前端开发者可以在后端API开发完成之前进行完整的功能测试和开发。