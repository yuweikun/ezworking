/**
 * 协调Agent实现 - 负责任务分配
 */

import { AgentNode } from '../agent-node';
import { OpenAIConfig, Task, WorkflowState } from '../types';
import { DEFAULT_SYSTEM_MESSAGES } from '../config';

export interface TaskAssignmentResult {
  nodeId: 'conversation' | 'career-positioning';
  reasoning: string;
}

export class CoordinatorAgent extends AgentNode {
  private readonly maxRetries = 3;

  constructor(openaiConfig: OpenAIConfig) {
    super(
      'coordinator',
      '负责分析用户查询并分配给合适的专业服务',
      DEFAULT_SYSTEM_MESSAGES.COORDINATOR,
      openaiConfig
    );
  }



  /**
   * 分配任务到合适的节点
   */
  async assignTask(
    query: string,
    workflowState?: WorkflowState
  ): Promise<TaskAssignmentResult> {
    try {
      // 如果已经在工作流中，直接返回career-positioning
      if (this.isInWorkflow(workflowState)) {
        return {
          nodeId: 'career-positioning',
          reasoning: `用户正在进行${workflowState!.workflowId}工作流，当前阶段：${workflowState!.phase}`
        };
      }

      // 进行节点选择
      const task: Task = {
        query,
        history: [],
        workflowState
      };

      const response = await this.executeWithRetry(task);
      return this.parseTaskAssignmentResponse(response);
    } catch (error: any) {
      // 如果解析失败，默认使用conversation
      console.warn('Task assignment failed, defaulting to conversation:', error.message);
      return {
        nodeId: 'conversation',
        reasoning: '任务分配失败，使用默认对话服务'
      };
    }
  }

  /**
   * 带重试机制的任务执行
   */
  private async executeWithRetry(task: Task): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.execute(task);
      } catch (error: any) {
        lastError = error;
        console.warn(`Task execution attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError || new Error('Task execution failed after all retries');
  }

  /**
   * 检查是否在工作流中
   */
  private isInWorkflow(workflowState?: WorkflowState): boolean {
    return workflowState !== undefined && 
           workflowState !== null && 
           workflowState.workflowId === 'career-positioning' &&
           workflowState.phase !== 'completed';
  }



  /**
   * 解析任务分配响应
   */
  private parseTaskAssignmentResponse(response: string): TaskAssignmentResult {
    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(response.trim());
      
      if (parsed.nodeId && ['conversation', 'career-positioning'].includes(parsed.nodeId)) {
        return {
          nodeId: parsed.nodeId,
          reasoning: parsed.reasoning || '未提供理由'
        };
      }
    } catch (error) {
      // JSON解析失败，尝试从文本中提取
      console.warn('Failed to parse JSON response, trying text extraction:', error);
    }

    // 如果JSON解析失败，使用关键词匹配作为后备方案
    return this.fallbackNodeSelection(response);
  }

  /**
   * 后备节点选择逻辑
   */
  private fallbackNodeSelection(response: string): TaskAssignmentResult {
    const lowerResponse = response.toLowerCase();
    const careerKeywords = [
      '职业', '工作', '求职', '职场', '岗位', '职位', '就业', 
      '职业规划', '职业发展', '职业咨询', '职业指导', '职业测评',
      'career', 'job', 'work', 'employment', 'position'
    ];
    
    const hasCareerKeywords = careerKeywords.some(keyword => 
      lowerResponse.includes(keyword)
    );

    if (hasCareerKeywords) {
      return {
        nodeId: 'career-positioning',
        reasoning: '通过关键词匹配检测到职业相关内容'
      };
    }

    return {
      nodeId: 'conversation',
      reasoning: '未检测到特定领域关键词，使用默认对话服务'
    };
  }

  /**
   * 构建协调器的消息格式
   * 包含可用节点信息
   */
  protected buildMessages(task: Task) {
    const messages = super.buildMessages(task);
    
    // 在用户消息前添加可用节点信息
    const availableNodes = `
可用的服务节点：
1. conversation - 用于一般对话、咨询、问答等日常交流
2. career-positioning - 用于职业定位、职业规划、求职指导等专业服务

用户查询: ${task.query}`;

    // 替换最后一条用户消息
    messages[messages.length - 1] = {
      role: 'user',
      content: availableNodes
    };

    return messages;
  }
}