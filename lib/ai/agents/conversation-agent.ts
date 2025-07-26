/**
 * 对话Agent实现
 */

import { AgentNode } from '../agent-node';
import { OpenAIConfig, Task, StreamChunk } from '../types';
import { DEFAULT_SYSTEM_MESSAGES } from '../config';

export class ConversationAgent extends AgentNode {
  constructor(openaiConfig: OpenAIConfig) {
    super(
      'conversation',
      '用于一般对话、咨询、问答等日常交流',
      DEFAULT_SYSTEM_MESSAGES.CONVERSATION,
      openaiConfig
    );
  }

  /**
   * 流式执行对话任务
   * 重写父类方法以提供更好的对话体验
   */
  async *streamExecute(task: Task): AsyncGenerator<StreamChunk> {
    try {
      const messages = this.buildMessages(task);
      
      // 第一个chunk包含workflow_state信息
      yield {
        content: '',
        finished: false,
        workflowState: task.workflowState || null
      };
      
      // 流式生成内容
      for await (const chunk of this.openaiClient.createStreamCompletion(messages)) {
        yield {
          content: chunk,
          finished: false,
          workflowState: task.workflowState || null
        };
      }

      // 发送结束标识
      yield {
        content: '',
        finished: true,
        workflowState: task.workflowState || null
      };
    } catch (error: any) {
      // 发送错误信息
      yield {
        content: `对话处理失败: ${error.message}`,
        finished: true,
        workflowState: null
      };
    }
  }
}