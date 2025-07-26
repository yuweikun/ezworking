import { FormField, Message, WorkflowStage } from "@/types/message";
import { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";
import { MessageInfo } from "@ant-design/x/es/use-x-chat";
import { Form, Input, Select, Button, Card, Typography } from "antd";
import { title } from "process";
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 测评假数据
const generateMockData = (): Message => {
  return {
    id: "mock-1",
    role: "assistant",
    content: "这是测评问题",
    phase: WorkflowStage.EVALUATION,
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
export const CustomMessageRenderer = ({ message }: { Message }) => {
  console.log("Rendering message:", message);
  if (message.role === "user") {
    return (
      <div
      // style={{
      //   maxWidth: "80%",
      //   padding: "12px 16px",
      //   background: "#f0f4f8",
      //   borderRadius: "12px",
      //   marginLeft: "auto",
      //   boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
      // }}
      >
        {message.content}
      </div>
    );
  }

  if (message.phase === WorkflowStage.InfoCollection) {
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
        name: "mbti",
        label: "MBTI性格类型",
        type: "select",
        options: [
          "ISTJ",
          "ISFJ",
          "INFJ",
          "INTJ",
          "ISTP",
          "ISFP",
          "INFP",
          "INTP",
          "ESTP",
          "ESFP",
          "ENFP",
          "ENTP",
          "ESTJ",
          "ESFJ",
          "ENFJ",
          "ENTJ",
        ],
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

    const handleFormSubmit = (values: any) => {
      console.log("表单提交:", values);
      // 整理表单值为字符串格式，使用label作为键名
      const formattedValues = formFields
        .map((field) => {
          const value = values[field.name];
          if (value === undefined || value === null || value === "") {
            return `${field.label}: 未填写`;
          }
          if (Array.isArray(value)) {
            return `${field.label}: ${value.join(", ")}`;
          }
          return `${field.label}: ${value}`;
        })
        .join("\n");

      // 触发下一次对话
      if (message.onSubmit) {
        message.onSubmit(formattedValues);
      }
    };

    return (
      <Card
        style={{
          width: "100%",
          border: "none",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Title level={4} style={{ marginBottom: 24, color: "#1a73e8" }}>
          {message.content}
        </Title>
        <Form layout="vertical" onFinish={handleFormSubmit}>
          {formFields.map((field) => (
            <Form.Item
              key={field.name}
              label={<span style={{ fontWeight: 500 }}>{field.label}</span>}
              required={field.required}
              name={field.name}
            >
              {renderFormField(field)}
            </Form.Item>
          ))}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              style={{ width: "120px", height: "40px" }}
            >
              提交
            </Button>
          </Form.Item>
        </Form>
      </Card>
    );
  }

  if (message.phase === WorkflowStage.EVALUATION) {
    const title = message.content.split("\n")[0];
    const jsonStr = message.content.split("\n")[2];
    const qaData = JSON.parse(jsonStr);

    const handleOptionSelect = (selectedKey: string) => {
      console.log(`用户选择了选项 ${selectedKey}`);
      if (message.onSubmit) {
        console.log("调用 message.onSubmit");
        message.onSubmit(qaData[selectedKey]);
      }
    };

    return (
      <Card
        style={{
          width: "100%",
          border: "none",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          background: "#f8fafc",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: "14px" }}>
            {title}
          </Text>
        </div>
        <Title level={4} style={{ marginBottom: 24, color: "#1a73e8" }}>
          {qaData.question || "测评问题"}
        </Title>
        <div style={{ display: "grid", gap: 12 }}>
          {Object.entries(qaData)
            .filter(([key]) => key !== "question")
            .map(([key, value]) => (
              <Button
                key={key}
                block
                onClick={() => handleOptionSelect(key)}
                style={{
                  textAlign: "left",
                  padding: "16px 20px",
                  height: "auto",
                  whiteSpace: "normal",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  background: "white",
                  transition: "all 0.2s",
                  ":hover": {
                    borderColor: "#1a73e8",
                    boxShadow: "0 2px 8px rgba(26, 115, 232, 0.2)",
                  },
                }}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    color: "#1a73e8",
                    marginRight: "8px",
                  }}
                >
                  {key}.
                </span>
                {value}
              </Button>
            ))}
        </div>
      </Card>
    );
  }

  if (message.phase === WorkflowStage.RECOMMENDATION) {
    const jobData = JSON.parse(message.content);
    const { job_title, job_description } = jobData;

    return (
      <Card
        style={{
          width: "100%",
          border: "none",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          background: "linear-gradient(to right, #f8fafc, #f0f7ff)",
        }}
      >
        <Title
          level={4}
          style={{
            marginBottom: 12,
            color: "#1a73e8",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🏢</span>
          {job_title || "职位推荐"}
        </Title>
        <Text
          style={{
            marginBottom: 24,
            color: "#555",
            fontSize: "15px",
            lineHeight: 1.6,
          }}
        >
          {job_description || "职位描述"}
        </Text>
        <div style={{ display: "flex", gap: 12 }}>
          <Button
            type="primary"
            ghost
            style={{
              flex: 1,
              height: "40px",
              borderRadius: "8px",
              fontWeight: 500,
            }}
          >
            喜欢
          </Button>
          <Button
            danger
            style={{
              flex: 1,
              height: "40px",
              borderRadius: "8px",
              fontWeight: 500,
            }}
          >
            不喜欢
          </Button>
        </div>
      </Card>
    );
  }

  // 默认渲染为普通文本
  return (
    <div
    // style={{
    //   maxWidth: "80%",
    //   padding: "12px 16px",
    //   background: "#f0f4f8",
    //   borderRadius: "12px",
    //   boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    // }}
    >
      {message.content}
    </div>
  );
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
