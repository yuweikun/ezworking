/**
 * 职业定位工作流实现
 */

import { AgentNode } from '../agent-node';
import { OpenAIConfig, Task, StreamChunk, WorkflowState, OpenAIMessage } from '../types';
import { DEFAULT_SYSTEM_MESSAGES } from '../config';

/**
 * 职业定位工作流主类
 */
export class CareerPositioningWorkflow {
  private agents: {
    infoCollection: AgentNode;
    assessment: AgentNode;
    analysis: AgentNode;
    recommendation: AgentNode;
  };

  constructor(openaiConfig: OpenAIConfig) {
    // 初始化四个专业Agent
    this.agents = {
      infoCollection: new InfoCollectionAgent(openaiConfig),
      assessment: new AssessmentAgent(openaiConfig),
      analysis: new AnalysisAgent(openaiConfig),
      recommendation: new RecommendationAgent(openaiConfig)
    };
  }

  /**
   * 执行工作流
   */
  async *execute(
    query: string,
    history: OpenAIMessage[],
    workflowState?: WorkflowState
  ): AsyncGenerator<StreamChunk> {
    try {
      // 如果没有工作流状态，创建初始状态
      if (!workflowState) {
        workflowState = this.createInitialState();
      }

      // 根据当前阶段执行相应的Agent
      switch (workflowState.phase) {
        case 'start':
        case 'info_collection':
          yield* this.executeInfoCollection(query, history, workflowState);
          break;
        case 'assessment':
          yield* this.executeAssessment(query, history, workflowState);
          break;
        case 'analysis':
          yield* this.executeAnalysis(query, history, workflowState);
          break;
        case 'recommendation':
          yield* this.executeRecommendation(query, history, workflowState);
          break;
        case 'completed':
          yield {
            content: '职业定位工作流已完成。如需重新开始，请告诉我。',
            finished: true,
            workflowState: workflowState
          };
          break;
        default:
          throw new Error(`未知的工作流阶段: ${workflowState.phase}`);
      }
    } catch (error: any) {
      yield {
        content: `工作流执行失败: ${error.message}`,
        finished: true,
        workflowState: null
      };
    }
  }

  /**
   * 创建初始工作流状态
   */
  private createInitialState(): WorkflowState {
    return {
      workflowId: 'career-positioning',
      phase: 'info_collection',
      progress: 0
    };
  }

  /**
   * 执行信息收集阶段
   */
  private async *executeInfoCollection(
    query: string,
    history: OpenAIMessage[],
    workflowState: WorkflowState
  ): AsyncGenerator<StreamChunk> {
    // 如果是刚开始，输出开始信息收集的消息
    if (workflowState.phase === 'start' || workflowState.progress === 0) {
      yield {
        content: '开始信息收集',
        finished: false,
        workflowState: {
          ...workflowState,
          phase: 'info_collection',
          progress: 1
        }
      };
    }

    const task: Task = {
      query,
      history,
      workflowState
    };

    // 执行信息收集Agent
    let collectedContent = '';
    for await (const chunk of this.agents.infoCollection.streamExecute(task)) {
      if (chunk.content) {
        collectedContent += chunk.content;
      }
      
      // 检查是否完成信息收集
      if (chunk.finished) {
        const nextState = this.checkInfoCollectionCompletion(collectedContent, workflowState);
        yield {
          content: chunk.content,
          finished: true,
          workflowState: nextState
        };
      } else {
        yield {
          content: chunk.content,
          finished: false,
          workflowState: workflowState
        };
      }
    }
  }

  /**
   * 执行测评阶段
   */
  private async *executeAssessment(
    query: string,
    history: OpenAIMessage[],
    workflowState: WorkflowState
  ): AsyncGenerator<StreamChunk> {
    // 如果用户输入是有效选择，更新进度
    if (this.isValidChoice(query) && workflowState.progress > 0) {
      // 记录用户的选择
      const newProgress = workflowState.progress + 1;
      
      // 检查是否完成所有15个问题
      if (newProgress >= 15) {
        // 转入分析阶段
        yield {
          content: '测评完成，开始分析...',
          finished: true,
          workflowState: {
            ...workflowState,
            phase: 'analysis',
            progress: 0
          }
        };
        return;
      }

      // 更新状态并继续下一个问题
      workflowState = {
        ...workflowState,
        progress: newProgress
      };
    }

    // 创建任务对象
    const task: Task = {
      query,
      history,
      workflowState
    };

    // 执行测评Agent
    for await (const chunk of this.agents.assessment.streamExecute(task)) {
      // 如果Agent返回了新的工作流状态，使用它
      const finalWorkflowState = chunk.workflowState || workflowState;
      
      yield {
        content: chunk.content,
        finished: chunk.finished,
        workflowState: finalWorkflowState
      };

      // 如果Agent已经转入分析阶段，直接返回
      if (chunk.finished && chunk.workflowState?.phase === 'analysis') {
        return;
      }
    }
  }

  /**
   * 执行分析阶段
   */
  private async *executeAnalysis(
    query: string,
    history: OpenAIMessage[],
    workflowState: WorkflowState
  ): AsyncGenerator<StreamChunk> {
    const task: Task = {
      query,
      history,
      workflowState
    };

    // 执行分析Agent
    for await (const chunk of this.agents.analysis.streamExecute(task)) {
      if (chunk.finished) {
        // 分析完成，自动转入推荐阶段
        yield {
          content: chunk.content,
          finished: true,
          workflowState: {
            ...workflowState,
            phase: 'recommendation',
            progress: 0
          }
        };
      } else {
        yield {
          content: chunk.content,
          finished: false,
          workflowState: workflowState
        };
      }
    }
  }

  /**
   * 执行推荐阶段
   */
  private async *executeRecommendation(
    query: string,
    history: OpenAIMessage[],
    workflowState: WorkflowState
  ): AsyncGenerator<StreamChunk> {
    const task: Task = {
      query,
      history,
      workflowState
    };

    // 执行推荐Agent（Agent内部会处理用户反馈和工作流结束逻辑）
    for await (const chunk of this.agents.recommendation.streamExecute(task)) {
      if (chunk.finished) {
        // 如果工作流已完成，直接返回
        if (chunk.workflowState?.phase === 'completed') {
          yield chunk;
          return;
        }

        // 更新推荐进度
        const newProgress = workflowState.progress + 1;
        yield {
          content: chunk.content,
          finished: true,
          workflowState: {
            ...workflowState,
            progress: newProgress
          }
        };
      } else {
        yield {
          content: chunk.content,
          finished: false,
          workflowState: workflowState
        };
      }
    }
  }

  /**
   * 检查信息收集是否完成
   */
  private checkInfoCollectionCompletion(
    content: string,
    currentState: WorkflowState
  ): WorkflowState {
    // 检查Agent是否输出了"信息收集完成"
    if (content.includes('信息收集完成')) {
      return {
        ...currentState,
        phase: 'assessment',
        progress: 0
      };
    }

    return currentState;
  }

  /**
   * 验证用户选择是否有效（a/b/c/d）
   */
  private isValidChoice(userInput: string): boolean {
    return AssessmentAgent.isValidChoice(userInput);
  }



  /**
   * 获取下一个状态（状态转换逻辑）
   */
  private getNextState(
    currentState: WorkflowState,
    userInput: string
  ): WorkflowState {
    switch (currentState.phase) {
      case 'start':
        return {
          ...currentState,
          phase: 'info_collection',
          progress: 0
        };

      case 'info_collection':
        // 信息收集完成后转入测评
        return {
          ...currentState,
          phase: 'assessment',
          progress: 0
        };

      case 'assessment':
        // 测评完成后转入分析
        if (currentState.progress >= 15) {
          return {
            ...currentState,
            phase: 'analysis',
            progress: 0
          };
        }
        return currentState;

      case 'analysis':
        // 分析完成后转入推荐
        return {
          ...currentState,
          phase: 'recommendation',
          progress: 0
        };

      case 'recommendation':
        // 用户选择喜欢后完成工作流
        if (userInput.toLowerCase().includes('喜欢')) {
          return {
            ...currentState,
            phase: 'completed',
            progress: currentState.progress
          };
        }
        return currentState;

      default:
        return currentState;
    }
  }
}

/**
 * 信息收集Agent
 */
class InfoCollectionAgent extends AgentNode {
  constructor(openaiConfig: OpenAIConfig) {
    super(
      'info-collection',
      '负责收集用户的职业相关信息',
      DEFAULT_SYSTEM_MESSAGES.INFO_COLLECTION,
      openaiConfig
    );
  }
}

/**
 * 测评Agent - 提供15个职业测评问题
 */
class AssessmentAgent extends AgentNode {
  private assessmentQuestions: Array<{
    question: string;
    A: string;
    B: string;
    C: string;
    D: string;
  }> = [
    {
      question: "在工作中，你更倾向于哪种工作方式？",
      A: "独立完成任务，自主决策",
      B: "与团队密切合作，共同完成",
      C: "领导团队，指导他人工作",
      D: "按照明确指示执行任务"
    },
    {
      question: "面对新的挑战时，你的第一反应是什么？",
      A: "兴奋地接受挑战，寻找创新解决方案",
      B: "仔细分析风险，制定详细计划",
      C: "寻求他人建议和支持",
      D: "希望有明确的指导和标准流程"
    },
    {
      question: "你最看重工作中的哪个方面？",
      A: "工作内容的创新性和挑战性",
      B: "工作环境的稳定性和安全感",
      C: "薪资待遇和福利保障",
      D: "个人成长和职业发展机会"
    },
    {
      question: "在团队中，你通常扮演什么角色？",
      A: "创意提供者，提出新想法",
      B: "执行者，确保任务按时完成",
      C: "协调者，促进团队沟通",
      D: "分析者，提供数据和逻辑支持"
    },
    {
      question: "你更喜欢哪种工作环境？",
      A: "开放式办公室，充满活力",
      B: "安静的独立办公空间",
      C: "经常出差，接触不同环境",
      D: "在家办公，灵活自由"
    },
    {
      question: "处理工作压力时，你的方式是？",
      A: "将压力转化为动力，提高效率",
      B: "寻求同事或上级的帮助",
      C: "制定详细计划，逐步解决",
      D: "暂时放松，调整心态后再处理"
    },
    {
      question: "你认为理想的工作时间安排是？",
      A: "固定的朝九晚五",
      B: "弹性工作时间",
      C: "项目制，根据任务调整",
      D: "轮班制，有规律的变化"
    },
    {
      question: "在职业发展中，你最重视什么？",
      A: "专业技能的深度发展",
      B: "管理能力的提升",
      C: "人际关系网络的建立",
      D: "跨领域知识的积累"
    },
    {
      question: "你更倾向于哪种学习方式？",
      A: "通过实践和试错学习",
      B: "系统性的理论学习",
      C: "向他人请教和交流",
      D: "自主研究和探索"
    },
    {
      question: "面对工作中的冲突，你会？",
      A: "直接沟通，寻求解决方案",
      B: "避免冲突，寻求妥协",
      C: "寻求第三方调解",
      D: "坚持自己的立场和原则"
    },
    {
      question: "你最享受工作中的哪个环节？",
      A: "创意构思和方案设计",
      B: "具体执行和操作",
      C: "结果展示和成果分享",
      D: "问题分析和解决"
    },
    {
      question: "对于工作反馈，你更希望？",
      A: "及时的正面鼓励",
      B: "详细的改进建议",
      C: "定期的正式评估",
      D: "同事间的相互反馈"
    },
    {
      question: "你认为最重要的工作技能是？",
      A: "沟通协调能力",
      B: "专业技术能力",
      C: "创新思维能力",
      D: "执行落地能力"
    },
    {
      question: "在选择工作时，你最关注？",
      A: "公司的发展前景",
      B: "岗位的匹配度",
      C: "团队的工作氛围",
      D: "薪资福利待遇"
    },
    {
      question: "你希望在工作中获得什么样的成就感？",
      A: "解决复杂问题的满足感",
      B: "帮助他人成长的成就感",
      C: "创造新价值的自豪感",
      D: "完成目标的胜利感"
    }
  ];

  constructor(openaiConfig: OpenAIConfig) {
    super(
      'assessment',
      '负责进行职业测评',
      DEFAULT_SYSTEM_MESSAGES.ASSESSMENT,
      openaiConfig
    );
  }

  /**
   * 重写streamExecute方法以实现特定的测评逻辑
   */
  async *streamExecute(task: Task): AsyncGenerator<StreamChunk> {
    try {
      const { workflowState } = task;
      
      if (!workflowState || workflowState.phase !== 'assessment') {
        throw new Error('Invalid workflow state for assessment');
      }

      // 获取当前问题索引（progress表示已完成的问题数量）
      const currentQuestionIndex = workflowState.progress;
      
      // 检查是否已完成所有15个问题
      if (currentQuestionIndex >= 15) {
        yield {
          content: '测评完成，开始分析...',
          finished: true,
          workflowState: {
            ...workflowState,
            phase: 'analysis',
            progress: 0
          }
        };
        return;
      }

      // 获取当前问题
      const currentQuestion = this.assessmentQuestions[currentQuestionIndex];
      
      if (!currentQuestion) {
        throw new Error(`Question not found for index: ${currentQuestionIndex}`);
      }

      // 生成问题进度提示
      const progressText = `测评问题 ${currentQuestionIndex + 1}/15\n\n`;
      
      // 生成JSON格式的问题
      const questionJson = JSON.stringify(currentQuestion, null, 0);
      
      // 输出问题
      yield {
        content: progressText + questionJson,
        finished: true,
        workflowState: workflowState
      };

    } catch (error: any) {
      yield {
        content: `测评阶段执行失败: ${error.message}`,
        finished: true,
        workflowState: null
      };
    }
  }

  /**
   * 验证用户选择是否有效
   */
  static isValidChoice(userInput: string): boolean {
    const choice = userInput.toLowerCase().trim();
    return ['a', 'b', 'c', 'd'].includes(choice);
  }

  /**
   * 获取问题总数
   */
  static getTotalQuestions(): number {
    return 15;
  }
}

/**
 * 分析Agent
 */
class AnalysisAgent extends AgentNode {
  constructor(openaiConfig: OpenAIConfig) {
    super(
      'analysis',
      '负责分析用户的职业倾向',
      DEFAULT_SYSTEM_MESSAGES.ANALYSIS,
      openaiConfig
    );
  }

  /**
   * 重写streamExecute方法以实现特定的分析逻辑
   */
  async *streamExecute(task: Task): AsyncGenerator<StreamChunk> {
    try {
      const { query, history, workflowState } = task;
      
      if (!workflowState || workflowState.phase !== 'analysis') {
        throw new Error('Invalid workflow state for analysis');
      }

      // 分析阶段是自动执行的，不需要用户输入
      // 基于历史对话中的信息收集和测评结果进行综合分析
      
      // 构建分析消息，包含所有历史信息
      const analysisMessages = this.buildAnalysisMessages(history);
      
      // 调用OpenAI进行流式分析
      let analysisContent = '';
      for await (const chunk of this.openaiClient.createStreamCompletion(analysisMessages)) {
        analysisContent += chunk;
        yield {
          content: chunk,
          finished: false,
          workflowState: workflowState
        };
      }

      // 分析完成，自动转入推荐阶段
      yield {
        content: '',
        finished: true,
        workflowState: {
          ...workflowState,
          phase: 'recommendation',
          progress: 0
        }
      };

    } catch (error: any) {
      yield {
        content: `分析阶段执行失败: ${error.message}`,
        finished: true,
        workflowState: null
      };
    }
  }

  /**
   * 构建分析消息，包含系统消息和历史对话
   */
  private buildAnalysisMessages(history: OpenAIMessage[]): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: this.systemMessage
      }
    ];

    // 添加历史对话，但只包含相关的信息收集和测评内容
    const relevantHistory = this.extractRelevantHistory(history);
    messages.push(...relevantHistory);

    // 添加分析指令
    messages.push({
      role: 'user',
      content: '请基于以上信息收集和测评结果，进行综合分析。分析用户的职业倾向、优势特长、适合的职业方向，并为后续的职业推荐提供依据。'
    });

    return messages;
  }

  /**
   * 提取相关的历史对话内容（信息收集和测评阶段的内容）
   */
  private extractRelevantHistory(history: OpenAIMessage[]): OpenAIMessage[] {
    const relevantHistory: OpenAIMessage[] = [];
    
    // 查找信息收集和测评相关的对话
    for (let i = 0; i < history.length; i++) {
      const message = history[i];
      
      // 包含信息收集相关内容
      if (message.content.includes('信息收集') || 
          message.content.includes('教育背景') ||
          message.content.includes('工作经验') ||
          message.content.includes('技能') ||
          message.content.includes('兴趣') ||
          message.content.includes('期望')) {
        relevantHistory.push(message);
      }
      
      // 包含测评相关内容
      if (message.content.includes('测评问题') ||
          message.content.includes('"question"') ||
          (message.role === 'user' && ['a', 'b', 'c', 'd'].includes(message.content.toLowerCase().trim()))) {
        relevantHistory.push(message);
      }
    }

    // 如果没有找到相关历史，至少包含最近的几条消息作为上下文
    if (relevantHistory.length === 0 && history.length > 0) {
      const recentMessages = history.slice(-5); // 取最近5条消息
      relevantHistory.push(...recentMessages);
    }

    return relevantHistory;
  }
}

/**
 * 推荐Agent
 */
class RecommendationAgent extends AgentNode {
  constructor(openaiConfig: OpenAIConfig) {
    super(
      'recommendation',
      '负责推荐合适的职位',
      DEFAULT_SYSTEM_MESSAGES.RECOMMENDATION,
      openaiConfig
    );
  }

  /**
   * 重写streamExecute方法以实现特定的推荐逻辑
   */
  async *streamExecute(task: Task): AsyncGenerator<StreamChunk> {
    try {
      const { query, history, workflowState } = task;
      
      if (!workflowState || workflowState.phase !== 'recommendation') {
        throw new Error('Invalid workflow state for recommendation');
      }

      // 检查用户反馈
      const feedback = this.processUserFeedback(query, workflowState.progress);
      
      if (feedback.shouldEnd) {
        yield {
          content: feedback.message,
          finished: true,
          workflowState: {
            ...workflowState,
            phase: 'completed',
            progress: workflowState.progress
          }
        };
        return;
      }

      // 如果有反馈消息，先输出
      if (feedback.message) {
        yield {
          content: feedback.message + '\n\n',
          finished: false,
          workflowState: workflowState
        };
      }

      // 构建推荐消息，包含历史信息和当前进度
      const recommendationMessages = this.buildRecommendationMessages(history, workflowState.progress);
      
      // 调用OpenAI生成推荐
      let recommendationContent = '';
      for await (const chunk of this.openaiClient.createStreamCompletion(recommendationMessages)) {
        recommendationContent += chunk;
        yield {
          content: chunk,
          finished: false,
          workflowState: workflowState
        };
      }

      // 验证输出是否为有效的JSON格式
      const isValidJson = this.validateRecommendationJson(recommendationContent);
      
      if (!isValidJson) {
        // 如果不是有效JSON，尝试修复或重新生成
        const fallbackRecommendation = this.generateFallbackRecommendation(workflowState.progress);
        yield {
          content: '\n\n' + JSON.stringify(fallbackRecommendation, null, 0),
          finished: true,
          workflowState: workflowState
        };
      } else {
        // 推荐完成
        yield {
          content: '',
          finished: true,
          workflowState: workflowState
        };
      }

    } catch (error: any) {
      yield {
        content: `推荐阶段执行失败: ${error.message}`,
        finished: true,
        workflowState: null
      };
    }
  }

  /**
   * 处理用户反馈（喜欢/不喜欢）
   */
  private processUserFeedback(
    userInput: string,
    progress: number
  ): { shouldEnd: boolean; message: string } {
    const input = userInput.toLowerCase().trim();
    
    // 检查用户是否选择"不喜欢"（必须在"喜欢"之前检查，因为"不喜欢"包含"喜欢"）
    if (input.includes('不喜欢') || input.includes('dislike') || input === '不喜欢') {
      if (progress < 5) {
        return {
          shouldEnd: false,
          message: '了解，让我为您推荐其他职位。'
        };
      } else {
        // 已经推荐了5个以上，继续推荐
        return {
          shouldEnd: false,
          message: '让我继续为您推荐其他合适的职位。'
        };
      }
    }

    // 检查用户是否选择"喜欢"
    if (input.includes('喜欢') || input.includes('like') || input === '喜欢') {
      return {
        shouldEnd: true,
        message: '很高兴您喜欢这个推荐！职业定位工作流已完成。祝您求职顺利！'
      };
    }

    // 如果是第一次进入推荐阶段（progress = 0），不需要反馈消息
    if (progress === 0) {
      return {
        shouldEnd: false,
        message: ''
      };
    }

    // 默认情况，继续推荐
    return {
      shouldEnd: false,
      message: '请告诉我您是否喜欢这个推荐（回复"喜欢"或"不喜欢"）。'
    };
  }

  /**
   * 构建推荐消息，包含历史信息和推荐要求
   */
  private buildRecommendationMessages(history: OpenAIMessage[], progress: number): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: this.systemMessage
      }
    ];

    // 添加相关的历史对话（信息收集、测评、分析结果）
    const relevantHistory = this.extractRelevantHistory(history);
    messages.push(...relevantHistory);

    // 添加推荐指令
    const recommendationInstruction = this.buildRecommendationInstruction(progress);
    messages.push({
      role: 'user',
      content: recommendationInstruction
    });

    return messages;
  }

  /**
   * 构建推荐指令
   */
  private buildRecommendationInstruction(progress: number): string {
    let instruction = '请基于以上信息收集、测评和分析结果，为用户推荐一个合适的职位。\n\n';
    
    if (progress > 0) {
      instruction += `这是第${progress + 1}个推荐，请推荐与之前不同的职位。\n\n`;
    }
    
    instruction += '请严格按照以下JSON格式输出，不要包含其他内容：\n';
    instruction += '{"job_title": "具体岗位名称", "job_description": "1-2句话的岗位简介"}\n\n';
    instruction += '要求：\n';
    instruction += '1. job_title必须是具体明确的岗位名称\n';
    instruction += '2. job_description必须是1-2句话的简洁介绍\n';
    instruction += '3. 推荐要基于用户的实际情况和能力\n';
    instruction += '4. 只输出JSON格式，不要添加其他解释文字';

    return instruction;
  }

  /**
   * 提取相关的历史对话内容
   */
  private extractRelevantHistory(history: OpenAIMessage[]): OpenAIMessage[] {
    const relevantHistory: OpenAIMessage[] = [];
    
    // 查找信息收集、测评和分析相关的对话
    for (let i = 0; i < history.length; i++) {
      const message = history[i];
      
      // 包含信息收集相关内容
      if (message.content.includes('信息收集') || 
          message.content.includes('教育背景') ||
          message.content.includes('工作经验') ||
          message.content.includes('技能') ||
          message.content.includes('兴趣') ||
          message.content.includes('期望')) {
        relevantHistory.push(message);
      }
      
      // 包含测评相关内容
      if (message.content.includes('测评问题') ||
          message.content.includes('"question"') ||
          (message.role === 'user' && ['a', 'b', 'c', 'd'].includes(message.content.toLowerCase().trim()))) {
        relevantHistory.push(message);
      }

      // 包含分析结果
      if (message.content.includes('分析') ||
          message.content.includes('职业倾向') ||
          message.content.includes('优势') ||
          message.content.includes('特长') ||
          message.content.includes('适合')) {
        relevantHistory.push(message);
      }
    }

    // 如果没有找到相关历史，至少包含最近的几条消息作为上下文
    if (relevantHistory.length === 0 && history.length > 0) {
      const recentMessages = history.slice(-10); // 取最近10条消息
      relevantHistory.push(...recentMessages);
    }

    return relevantHistory;
  }

  /**
   * 验证推荐输出是否为有效的JSON格式
   */
  private validateRecommendationJson(content: string): boolean {
    try {
      // 尝试从内容中提取JSON
      const jsonMatch = content.match(/\{[^}]*"job_title"[^}]*"job_description"[^}]*\}/);
      if (!jsonMatch) {
        return false;
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      // 验证必需字段
      return (
        typeof parsed.job_title === 'string' && 
        parsed.job_title.trim().length > 0 &&
        typeof parsed.job_description === 'string' && 
        parsed.job_description.trim().length > 0
      );
    } catch {
      return false;
    }
  }

  /**
   * 生成备用推荐（当AI输出格式不正确时）
   */
  private generateFallbackRecommendation(progress: number): { job_title: string; job_description: string } {
    const fallbackRecommendations = [
      {
        job_title: "产品经理",
        job_description: "负责产品规划和需求分析，协调各部门推进产品开发。"
      },
      {
        job_title: "数据分析师",
        job_description: "分析业务数据，提供数据洞察和决策支持。"
      },
      {
        job_title: "市场营销专员",
        job_description: "制定营销策略，执行推广活动，提升品牌知名度。"
      },
      {
        job_title: "人力资源专员",
        job_description: "负责招聘、培训和员工关系管理工作。"
      },
      {
        job_title: "项目经理",
        job_description: "管理项目进度，协调资源，确保项目按时交付。"
      },
      {
        job_title: "客户服务专员",
        job_description: "处理客户咨询和投诉，维护客户关系。"
      },
      {
        job_title: "财务分析师",
        job_description: "进行财务分析和预算管理，支持业务决策。"
      },
      {
        job_title: "运营专员",
        job_description: "优化业务流程，提升运营效率和用户体验。"
      }
    ];

    // 根据进度选择不同的备用推荐
    const index = progress % fallbackRecommendations.length;
    return fallbackRecommendations[index];
  }
}