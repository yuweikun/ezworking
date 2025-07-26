export interface ResumeInfo {
  name: string; // 姓名
  gender: string; // 性别
  age: number; // 年龄
  school: string; // 学校
  major: string; // 专业
  education: string; // 学历
  skills: string[]; // 技能列表
  experiences: string[]; // 经历列表
  selfEvaluation: string; // 自我评价
}

export enum WorkflowStage {
  InfoCollection = "info_collection", // 简历信息收集阶段
  EVALUATION = "assessment", // 测评问题阶段
  RECOMMENDATION = "recommendation", // 岗位推荐阶段
  ANALYSIS = "analysis", // 分析阶段
  DEFAULT = "default", // 默认普通消息
}

// 测评问题选项类型
export interface EvaluationOption {
  key: string; // 选项唯一标识，如"A"、"B"等
  text: string; // 选项文本内容
}

// 测评问题类型
export interface EvaluationQuestion {
  id: string; // 问题唯一ID
  content: string; // 问题内容
  options: EvaluationOption[]; // 选项数组
  isMultipleChoice?: boolean; // 是否多选
}

// 测评结果类型
export interface EvaluationAnswer {
  questionId: string; // 对应问题ID
  selectedOptions: string[]; // 用户选择的选项key数组
}

// 更新Message类型
export type Message = {
  id: string; // 消息唯一ID
  role: "user" | "assistant" | "system"; // 消息发送者角色
  content: string; // 基础文本内容
  phase?: WorkflowStage; // 使用枚举类型
  resumeInfo?: ResumeInfo; // 简历信息字段
  formFields?: FormField[]; // 动态表单字段配置
  timestamp: number; // 消息时间戳
  isProcessed?: boolean; // 是否已处理
  evaluation?: {
    currentQuestion?: EvaluationQuestion; // 当前问题(可选)
    questionList?: EvaluationQuestion[]; // 问题列表(可选)
    answers?: EvaluationAnswer[]; // 已回答记录
    progress?: {
      // 进度信息
      current: number; // 当前题号
      total: number; // 总题数
    };
  };
};

export interface FormField {
  name: keyof ResumeInfo; // 关联ResumeInfo的字段名
  label: string; // 显示标签
  type: "text" | "select" | "textarea" | "multi-select"; // 字段类型
  required?: boolean; // 是否必填
  options?: string[]; // 选择类型的选项
}
