/**
 * AI Agent系统主入口
 */

// 类型定义
export type {
  OpenAIMessage,
  StreamChunk,
  WorkflowState,
  Task,
  IAgentNode,
  OpenAIConfig
} from './types';

// 核心类
export { OpenAIClient } from './openai-client';
export { AgentNode } from './agent-node';

// 配置和工具
export {
  getOpenAIConfig,
  validateOpenAIConfig,
  DEFAULT_SYSTEM_MESSAGES
} from './config';

// 流式响应工具
export {
  createSSEStream,
  collectStreamContent,
  createErrorStream,
  validateStreamChunk
} from './stream-utils';

// Agent实现
export { ConversationAgent } from './agents/conversation-agent';
export { 
  CoordinatorAgent, 
  type TaskAssignmentResult,
  type TaskDecompositionResult,
  type SubTask
} from './agents/coordinator-agent';

// 工作流实现
export { CareerPositioningWorkflow } from './workflows';