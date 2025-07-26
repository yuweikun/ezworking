// 模拟后端API服务
// 这个文件提供了一个简单的模拟后端，用于演示前端如何与真实API交互

export interface ConversationItem {
  key: string;
  label: string;
  group: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  conversationId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

// 模拟数据存储
class MockDatabase {
  private conversations: ConversationItem[] = [
    {
      key: 'conv-1',
      label: 'What is Ant Design X?',
      group: 'Today',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      key: 'conv-2',
      label: 'How to integrate with backend?',
      group: 'Today',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      key: 'conv-3',
      label: 'API Design Best Practices',
      group: 'Yesterday',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  private messages: MessageItem[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'What is Ant Design X?',
      timestamp: new Date().toISOString(),
      conversationId: 'conv-1',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Ant Design X is a comprehensive AI-oriented UI component library built on top of Ant Design. It provides specialized components for building AI applications, including chat interfaces, conversation management, and intelligent interactions.',
      timestamp: new Date().toISOString(),
      conversationId: 'conv-1',
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'How can I integrate it with my backend API?',
      timestamp: new Date().toISOString(),
      conversationId: 'conv-2',
    },
    {
      id: 'msg-4',
      role: 'assistant',
      content: 'To integrate Ant Design X with your backend API, you can use axios or fetch to handle HTTP requests. The key is to properly manage conversation state, message history, and real-time updates. You should implement endpoints for creating conversations, sending messages, and retrieving chat history.',
      timestamp: new Date().toISOString(),
      conversationId: 'conv-2',
    },
  ];

  private hotTopics = [
    {
      key: '1-1',
      description: 'What has Ant Design X upgraded?',
      icon: '1',
      popularity: 95,
    },
    {
      key: '1-2',
      description: 'Backend Integration Guide',
      icon: '2',
      popularity: 88,
    },
    {
      key: '1-3',
      description: 'Real-time Chat Implementation',
      icon: '3',
      popularity: 82,
    },
    {
      key: '1-4',
      description: 'API Security Best Practices',
      icon: '4',
      popularity: 76,
    },
    {
      key: '1-5',
      description: 'File Upload and Management',
      icon: '5',
      popularity: 71,
    },
  ];

  // 获取所有会话
  getConversations(): ConversationItem[] {
    return [...this.conversations].sort((a, b) => 
      new Date(b.updatedAt || b.createdAt || '').getTime() - 
      new Date(a.updatedAt || a.createdAt || '').getTime()
    );
  }

  // 创建新会话
  createConversation(title: string): ConversationItem {
    const newConversation: ConversationItem = {
      key: `conv-${Date.now()}`,
      label: title,
      group: 'Today',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.conversations.unshift(newConversation);
    return newConversation;
  }

  // 删除会话
  deleteConversation(conversationId: string): boolean {
    const index = this.conversations.findIndex(conv => conv.key === conversationId);
    if (index > -1) {
      this.conversations.splice(index, 1);
      // 同时删除相关消息
      this.messages = this.messages.filter(msg => msg.conversationId !== conversationId);
      return true;
    }
    return false;
  }

  // 获取会话消息
  getMessages(conversationId: string): MessageItem[] {
    return this.messages
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // 添加消息
  addMessage(conversationId: string, role: 'user' | 'assistant', content: string): MessageItem {
    const newMessage: MessageItem = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      conversationId,
    };
    
    this.messages.push(newMessage);
    
    // 更新会话的最后更新时间
    const conversation = this.conversations.find(conv => conv.key === conversationId);
    if (conversation) {
      conversation.updatedAt = new Date().toISOString();
    }
    
    return newMessage;
  }

  // 获取热门话题
  getHotTopics() {
    return [...this.hotTopics].sort((a, b) => b.popularity - a.popularity);
  }

  // 模拟AI回复生成
  generateAIResponse(userMessage: string, conversationId: string): MessageItem {
    // 简单的关键词匹配回复
    let response = '';
    
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = 'Hello! How can I help you today?';
    } else if (lowerMessage.includes('ant design x')) {
      response = 'Ant Design X is a powerful UI library for building AI applications. It provides components like chat interfaces, conversation management, and intelligent interactions.';
    } else if (lowerMessage.includes('backend') || lowerMessage.includes('api')) {
      response = 'For backend integration, you can use axios to make HTTP requests. Make sure to handle authentication, error states, and loading indicators properly.';
    } else if (lowerMessage.includes('upload') || lowerMessage.includes('file')) {
      response = 'File upload can be handled using FormData and multipart/form-data content type. Remember to validate file types and sizes on both client and server sides.';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      response = 'I\'m here to help! You can ask me about Ant Design X components, backend integration, API design, or any other development questions.';
    } else {
      response = `I understand you're asking about "${userMessage}". This is a simulated AI response. In a real implementation, this would be processed by your AI service or language model.`;
    }
    
    // 模拟处理延迟
    return this.addMessage(conversationId, 'assistant', response);
  }
}

// 创建全局数据库实例
const mockDB = new MockDatabase();

// 模拟API延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟API服务
export const mockApiService = {
  // 获取会话列表
  async getConversations(): Promise<ApiResponse<ConversationItem[]>> {
    await delay(300); // 模拟网络延迟
    
    return {
      success: true,
      data: mockDB.getConversations(),
      timestamp: new Date().toISOString(),
    };
  },

  // 创建新会话
  async createConversation(title: string): Promise<ApiResponse<ConversationItem>> {
    await delay(500);
    
    const newConversation = mockDB.createConversation(title);
    
    return {
      success: true,
      data: newConversation,
      message: 'Conversation created successfully',
      timestamp: new Date().toISOString(),
    };
  },

  // 删除会话
  async deleteConversation(conversationId: string): Promise<ApiResponse<boolean>> {
    await delay(300);
    
    const success = mockDB.deleteConversation(conversationId);
    
    return {
      success,
      data: success,
      message: success ? 'Conversation deleted successfully' : 'Conversation not found',
      timestamp: new Date().toISOString(),
    };
  },

  // 获取会话消息
  async getMessages(conversationId: string): Promise<ApiResponse<MessageItem[]>> {
    await delay(400);
    
    const messages = mockDB.getMessages(conversationId);
    
    return {
      success: true,
      data: messages,
      timestamp: new Date().toISOString(),
    };
  },

  // 发送消息
  async sendMessage(conversationId: string, content: string): Promise<ApiResponse<MessageItem>> {
    await delay(200);
    
    const message = mockDB.addMessage(conversationId, 'user', content);
    
    return {
      success: true,
      data: message,
      message: 'Message sent successfully',
      timestamp: new Date().toISOString(),
    };
  },

  // 获取AI回复
  async getAIResponse(conversationId: string, userMessage: string): Promise<ApiResponse<MessageItem>> {
    await delay(1000); // 模拟AI处理时间
    
    const aiResponse = mockDB.generateAIResponse(userMessage, conversationId);
    
    return {
      success: true,
      data: aiResponse,
      message: 'AI response generated successfully',
      timestamp: new Date().toISOString(),
    };
  },

  // 获取热门话题
  async getHotTopics(): Promise<ApiResponse<any[]>> {
    await delay(300);
    
    const topics = mockDB.getHotTopics();
    
    return {
      success: true,
      data: topics,
      timestamp: new Date().toISOString(),
    };
  },

  // 模拟文件上传
  async uploadFile(file: File): Promise<ApiResponse<{ url: string; filename: string }>> {
    await delay(1500); // 模拟上传时间
    
    // 模拟文件URL
    const mockUrl = `https://example.com/uploads/${Date.now()}-${file.name}`;
    
    return {
      success: true,
      data: {
        url: mockUrl,
        filename: file.name,
      },
      message: 'File uploaded successfully',
      timestamp: new Date().toISOString(),
    };
  },
};

// 导出类型和服务
export default mockApiService;