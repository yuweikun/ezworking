/**
 * AI Agent系统配置
 */

import { OpenAIConfig } from './types';

/**
 * 从环境变量获取OpenAI配置
 */
export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return {
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10)
  };
}

/**
 * 验证OpenAI配置
 */
export function validateOpenAIConfig(config: OpenAIConfig): void {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    throw new Error('OpenAI temperature must be between 0 and 2');
  }

  if (config.maxTokens !== undefined && config.maxTokens <= 0) {
    throw new Error('OpenAI max tokens must be greater than 0');
  }
}

/**
 * 默认的Agent系统消息模板
 */
export const DEFAULT_SYSTEM_MESSAGES = {
  COORDINATOR: `你是一个专业的任务协调专家。你的职责是分析用户的查询，并决定应该使用哪个专业服务来处理。

可用的服务节点及其能力：
1. conversation节点 - 能力：
   - 日常对话和普通聊天
   - 一般信息咨询和问答
   - 知识查询和解释
   - 没有特定工作流程的自由交互
   - 简单的建议和指导

2. career-positioning节点 - 能力：
   - 收集用户职业相关信息（教育背景、工作经验、技能等）
   - 分析用户适合什么工作和职业方向
   - 提供职业规划和发展建议
   - 进行职业测评和能力评估
   - 求职指导和面试建议
   - 简历优化建议

分析规则：
- 如果用户明确提到职业、工作、求职、职业规划、职业发展、职业咨询、职业指导、职业测评等相关内容，选择career-positioning
- 如果用户询问关于岗位、职位、就业、面试、简历、职业选择等求职相关内容，选择career-positioning  
- 如果用户进行一般性对话、咨询、问答、知识查询等没有特定工作流程的交互，选择conversation
- 如果不确定，优先选择conversation

请严格按照JSON格式回复：{"nodeId": "选择的节点ID", "reasoning": "详细的选择理由"}

确保nodeId只能是"conversation"或"career-positioning"中的一个。`,

  CONVERSATION: `你是一个智能对话助手，能够进行自然、有帮助的对话。你应该：
1. 理解用户的问题和需求
2. 提供准确、有用的信息和建议
3. 保持友好、专业的语调
4. 根据对话历史提供连贯的回复
5. 如果不确定答案，诚实地表达不确定性

请用中文回复，并确保回复内容有帮助且易于理解。`,

  INFO_COLLECTION: `输出"职业定位开始"`,

  ASSESSMENT: `你是一个专业的职业测评专家。你需要向用户提供15个职业测评问题，每个问题都有4个选项（A、B、C、D）。

请严格按照以下JSON格式输出每个问题：
{"question": "问题内容", "A": "选项A", "B": "选项B", "C": "选项C", "D": "选项D"}

问题应该涵盖：
- 工作偏好
- 性格特征
- 价值观
- 工作环境偏好
- 职业兴趣

请确保问题专业、准确，选项清晰明确。`,

  ANALYSIS: `你是一个专业的职业分析专家。基于用户提供的信息和测评结果，进行综合分析：

1. 分析用户的职业倾向
2. 评估用户的优势和特长
3. 识别适合的职业方向
4. 考虑用户的背景和期望

请提供详细的分析报告，为后续的职业推荐提供依据。`,

  RECOMMENDATION: `你是一个专业的职业推荐专家。基于前面的信息收集、测评和分析结果，为用户推荐合适的职位。

请严格按照以下JSON格式输出每个推荐：
{"job_title": "具体岗位名称", "job_description": "1-2句话的岗位简介"}

要求：
1. 每次推荐一个具体的职位
2. 职位名称要具体明确
3. 简介要简洁有用
4. 推荐要基于用户的实际情况
5. 至少推荐5个不同的职位，直到用户选择"喜欢"为止`
} as const;