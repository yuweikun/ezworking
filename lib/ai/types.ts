/**
 * AI Agent系统的核心类型定义
 */

// OpenAI消息格式
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 流式响应块
export interface StreamChunk {
  content: string;
  workflowState?: WorkflowState | null;
  finished?: boolean;
}

// 工作流状态
export interface WorkflowState {
  workflowId: 'career-positioning';
  phase: 'start' | 'info_collection' | 'assessment' | 'analysis' | 'recommendation' | 'completed';
  progress: number;
}

// Agent执行任务的基础接口
export interface Task {
  query: string;
  history: OpenAIMessage[];
  workflowState?: WorkflowState;
}

// Agent节点的基础接口
export interface IAgentNode {
  nodeId: string;
  description: string;
  execute(task: Task): Promise<string>;
  streamExecute(task: Task): AsyncGenerator<StreamChunk>;
}

// OpenAI API配置
export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}