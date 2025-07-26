import { FormField, Message, WorkflowStage } from "@/types/message";
import { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";
import { MessageInfo } from "@ant-design/x/es/use-x-chat";
import { Form, Input, Select, Button, Card, Typography } from "antd";
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 测评假数据
const generateMockData = (): Message => {
  return {
    id: "mock-1",
    role: "assistant",
    content: "这是测评问题",
    workflow_stage: WorkflowStage.EVALUATION,
    evaluation: {
      currentQuestion: {
        id: "q1",
        content: "你更喜欢哪种工作方式？",
        options: [
          { key: "A", text: "独立完成，自由安排时间" },
          { key: "B", text: "团队协作，定期沟通" },
          { key: "C", text: "混合模式，视项目而定" },
          { key: "D", text: "远程工作，灵活安排" },
        ],
        isMultipleChoice: false,
      },
      progress: {
        current: 1,
        total: 5,
      },
    },
    timestamp: Date.now(),
  };
};

// 自定义消息渲染组件
export const CustomMessageRenderer = (message: Message) => {
  console.log("Rendering message:", message);
  // 使用枚举代替字符串字面量
  if (message.workflow_stage === WorkflowStage.START) {
    const defaultFields: FormField[] = [
      { name: "name", label: "姓名", type: "text", required: true },
      { name: "gender", label: "性别", type: "select", options: ["男", "女"] },
      { name: "age", label: "年龄", type: "text" },
      { name: "school", label: "学校", type: "text", required: true },
      { name: "major", label: "专业", type: "text", required: true },
      {
        name: "education",
        label: "学历",
        type: "select",
        options: ["大专", "本科", "硕士", "博士"],
      },
      {
        name: "skills",
        label: "技能",
        type: "multi-select",
        options: ["JavaScript", "Python", "Java", "UI设计"],
      },
      { name: "selfEvaluation", label: "自我评价", type: "textarea" },
    ];

    const formFields = message.formFields || defaultFields;

    return (
      <Card style={{ width: "100%" }}>
        <Title level={4} style={{ marginBottom: 24 }}>
          请填写简历信息
        </Title>
        <Form layout="vertical">
          {formFields.map((field) => (
            <Form.Item
              key={field.name}
              label={field.label}
              required={field.required}
            >
              {renderFormField(field)}
            </Form.Item>
          ))}
          <Form.Item>
            <Button type="primary" htmlType="submit">
              提交
            </Button>
          </Form.Item>
        </Form>
      </Card>
    );
  }

  // 修改测评阶段的渲染部分
  if (message.workflow_stage === WorkflowStage.EVALUATION) {
    const mockData = generateMockData(); // 使用假数据
    const { currentQuestion, progress } = mockData.evaluation || {};
    const { content, options = [], isMultipleChoice } = currentQuestion || {};

    const handleOptionSelect = (selectedKey: string) => {
      console.log(`用户选择了选项 ${selectedKey}`);
      // 这里可以添加提交答案的逻辑
    };

    return (
      <Card style={{ width: "100%" }}>
        {progress && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              第 {progress.current} 题 / 共 {progress.total} 题
            </Text>
          </div>
        )}
        <Title level={4} style={{ marginBottom: 16 }}>
          {content || "测评问题"}
        </Title>
        <div style={{ display: "grid", gap: 8 }}>
          {options.map((option) => (
            <Button
              key={option.key}
              block
              onClick={() => handleOptionSelect(option.key)}
              style={{
                textAlign: "left",
                padding: "12px 16px",
                height: "auto",
                whiteSpace: "normal",
              }}
            >
              <span style={{ fontWeight: "bold" }}>{option.key}.</span>{" "}
              {option.text}
            </Button>
          ))}
        </div>
        {isMultipleChoice && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Text type="secondary">(多选题，可多选)</Text>
          </div>
        )}
      </Card>
    );
  }

  // 推荐阶段使用Ant Design组件
  if (message.workflow_stage === WorkflowStage.RECOMMENDATION) {
    const { content: position, description } = message;
    return (
      <Card style={{ width: "100%" }}>
        <Title level={4} style={{ marginBottom: 8 }}>
          {position}
        </Title>
        <Text style={{ marginBottom: 16, color: "#666" }}>{description}</Text>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="primary" ghost>
            喜欢
          </Button>
          <Button danger>不喜欢</Button>
        </div>
      </Card>
    );
  }

  // console.log("Unknown workflow stage: go default");
  // 默认渲染为普通文本
  return <div>{message.content}</div>;
};

// 更新表单字段渲染函数
function renderFormField(field: FormField) {
  switch (field.type) {
    case "text":
      return <Input name={field.name} />;
    case "textarea":
      return <TextArea rows={4} name={field.name} />;
    case "select":
      return (
        <Select name={field.name}>
          {field.options?.map((opt) => (
            <Option key={opt} value={opt}>
              {opt}
            </Option>
          ))}
        </Select>
      );
    case "multi-select":
      return (
        <Select name={field.name} mode="multiple">
          {field.options?.map((opt) => (
            <Option key={opt} value={opt}>
              {opt}
            </Option>
          ))}
        </Select>
      );
    default:
      return <Input name={field.name} />;
  }
}
