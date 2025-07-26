// 类型验证测试文件 - 用于验证类型定义的正确性
import { 
  Conversation, 
  ConversationGroup, 
  ConversationContextType,
  SessionResponse,
  ConversationErrorType,
  transformSessionToConversation,
  sortConversationsByTime,
  CONVERSATION_CONSTANTS
} from './index';

// 测试 Conversation 接口
const testConversation: Conversation = {
  key: 'test-1',
  label: 'Test Conversation',
  timestamp: Date.now(),
  group: CONVERSATION_CONSTANTS.GROUPS.TODAY,
  userId: 'user-123',
  disabled: false
};

// 测试 SessionResponse 接口
const testSessionResponse: SessionResponse = {
  id: 'session-1',
  user_id: 'user-123',
  title: 'Test Session',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// 测试数据转换函数
const convertedConversation = transformSessionToConversation(testSessionResponse, 'user-123');

// 测试排序函数
const conversations: Conversation[] = [testConversation];
const sortedConversations = sortConversationsByTime(conversations);

// 测试错误类型
const errorType: ConversationErrorType = ConversationErrorType.FETCH_FAILED;

// 验证类型兼容性
console.log('Types validation passed!');

export { testConversation, convertedConversation, sortedConversations, errorType };