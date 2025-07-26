/**
 * OpenAI API调用封装
 */

import OpenAI from 'openai';
import { OpenAIMessage, OpenAIConfig } from './types';

export class OpenAIClient {
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      ...config
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
  }

  /**
   * 非流式调用OpenAI API
   */
  async createCompletion(messages: OpenAIMessage[]): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      throw new Error(`OpenAI API调用失败: ${error.message}`);
    }
  }

  /**
   * 流式调用OpenAI API
   */
  async *createStreamCompletion(messages: OpenAIMessage[]): AsyncGenerator<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      throw new Error(`OpenAI API流式调用失败: ${error.message}`);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): OpenAIConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果API密钥或baseUrl发生变化，重新创建客户端
    if (newConfig.apiKey || newConfig.baseUrl) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });
    }
  }
}