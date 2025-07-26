/**
 * Agent节点基础类
 */

import { OpenAIClient } from './openai-client';
import { IAgentNode, Task, StreamChunk, OpenAIMessage, OpenAIConfig } from './types';

export abstract class AgentNode implements IAgentNode {
  public readonly nodeId: string;
  public readonly description: string;
  protected readonly systemMessage: string;
  protected openaiClient: OpenAIClient;

  constructor(
    nodeId: string,
    description: string,
    systemMessage: string,
    openaiConfig: OpenAIConfig
  ) {
    this.nodeId = nodeId;
    this.description = description;
    this.systemMessage = systemMessage;
    this.openaiClient = new OpenAIClient(openaiConfig);
  }

  /**
   * 非流式执行任务
   */
  async execute(task: Task): Promise<string> {
    try {
      const messages = this.buildMessages(task);
      const response = await this.openaiClient.createCompletion(messages);
      return response;
    } catch (error: any) {
      throw new Error(`Agent ${this.nodeId} 执行失败: ${error.message}`);
    }
  }

  /**
   * 流式执行任务
   */
  async *streamExecute(task: Task): AsyncGenerator<StreamChunk> {
    try {
      const messages = this.buildMessages(task);
      
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
        content: `Agent ${this.nodeId} 执行失败: ${error.message}`,
        finished: true,
        workflowState: null
      };
    }
  }

  /**
   * 构建OpenAI消息格式
   * 子类可以重写此方法来自定义消息构建逻辑
   */
  protected buildMessages(task: Task): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // 添加系统消息
    messages.push({
      role: 'system',
      content: this.systemMessage
    });

    // 添加历史消息
    if (task.history && task.history.length > 0) {
      messages.push(...task.history);
    }

    // 添加当前用户查询
    messages.push({
      role: 'user',
      content: task.query
    });

    return messages;
  }

  /**
   * 更新OpenAI配置
   */
  updateOpenAIConfig(config: Partial<OpenAIConfig>): void {
    this.openaiClient.updateConfig(config);
  }

  /**
   * 获取当前OpenAI配置
   */
  getOpenAIConfig(): OpenAIConfig {
    return this.openaiClient.getConfig();
  }
}