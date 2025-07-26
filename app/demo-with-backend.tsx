"use client";
import {
  AppstoreAddOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  CopyOutlined,
  DeleteOutlined,
  DislikeOutlined,
  EditOutlined,
  EllipsisOutlined,
  FileSearchOutlined,
  HeartOutlined,
  LikeOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ProductOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  ShareAltOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import {
  Attachments,
  Bubble,
  Conversations,
  Prompts,
  Sender,
  Welcome,
  useXAgent,
  useXChat,
} from "@ant-design/x";
import { Avatar, Button, Flex, type GetProp, Space, Spin, message } from "antd";
import { createStyles } from "antd-style";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { mockApiService } from "../lib/api-mock";

// 定义数据类型
type BubbleDataType = {
  role: string;
  content: string;
};

type ConversationItem = {
  key: string;
  label: string;
  group: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

// API 配置
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false"; // 默认使用模拟API

// 创建axios实例（用于真实API）
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      message.error("认证失败，请重新登录");
      localStorage.removeItem("auth_token");
    } else if (error.response?.status >= 500) {
      message.error("服务器错误，请稍后重试");
    }
    return Promise.reject(error);
  }
);

// 真实API服务函数
const realApiService = {
  // 获取会话列表
  getConversations: async (): Promise<ConversationItem[]> => {
    try {
      const response = await apiClient.get<ApiResponse<ConversationItem[]>>(
        "/conversations"
      );
      return response.data.data || [];
    } catch (error) {
      console.error("获取会话列表失败:", error);
      return [];
    }
  },

  // 创建新会话
  createConversation: async (
    title: string
  ): Promise<ConversationItem | null> => {
    try {
      const response = await apiClient.post<ApiResponse<ConversationItem>>(
        "/conversations",
        {
          title,
          group: "Today",
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("创建会话失败:", error);
      message.error("创建会话失败");
      return null;
    }
  },

  // 删除会话
  deleteConversation: async (conversationId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/conversations/${conversationId}`);
      return true;
    } catch (error) {
      console.error("删除会话失败:", error);
      message.error("删除会话失败");
      return false;
    }
  },

  // 获取会话消息
  getMessages: async (conversationId: string): Promise<BubbleDataType[]> => {
    try {
      const response = await apiClient.get<ApiResponse<BubbleDataType[]>>(
        `/conversations/${conversationId}/messages`
      );
      return response.data.data || [];
    } catch (error) {
      console.error("获取消息失败:", error);
      return [];
    }
  },

  // 发送消息
  sendMessage: async (
    conversationId: string,
    content: string
  ): Promise<BubbleDataType | null> => {
    try {
      const response = await apiClient.post<ApiResponse<BubbleDataType>>(
        `/conversations/${conversationId}/messages`,
        {
          content,
          role: "user",
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("发送消息失败:", error);
      message.error("发送消息失败");
      return null;
    }
  },

  // 获取AI回复
  getAIResponse: async (
    conversationId: string,
    userMessage: string
  ): Promise<BubbleDataType | null> => {
    try {
      const response = await apiClient.post<ApiResponse<BubbleDataType>>(
        `/conversations/${conversationId}/ai-response`,
        {
          message: userMessage,
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("获取AI回复失败:", error);
      message.error("获取AI回复失败");
      return null;
    }
  },

  // 获取热门话题
  getHotTopics: async () => {
    try {
      const response = await apiClient.get<ApiResponse<any>>("/hot-topics");
      return response.data.data || [];
    } catch (error) {
      console.error("获取热门话题失败:", error);
      return [];
    }
  },

  // 上传文件
  uploadFile: async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post<ApiResponse<{ url: string }>>(
        "/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.data?.url || null;
    } catch (error) {
      console.error("文件上传失败:", error);
      message.error("文件上传失败");
      return null;
    }
  },
};

// 适配器：将模拟API转换为与真实API相同的接口
const mockApiAdapter = {
  getConversations: async (): Promise<ConversationItem[]> => {
    const response = await mockApiService.getConversations();
    return response.data;
  },

  createConversation: async (
    title: string
  ): Promise<ConversationItem | null> => {
    const response = await mockApiService.createConversation(title);
    return response.success ? response.data : null;
  },

  deleteConversation: async (conversationId: string): Promise<boolean> => {
    const response = await mockApiService.deleteConversation(conversationId);
    return response.data;
  },

  getMessages: async (conversationId: string): Promise<BubbleDataType[]> => {
    const response = await mockApiService.getMessages(conversationId);
    return response.data.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  },

  sendMessage: async (
    conversationId: string,
    content: string
  ): Promise<BubbleDataType | null> => {
    const response = await mockApiService.sendMessage(conversationId, content);
    return response.success
      ? { role: response.data.role, content: response.data.content }
      : null;
  },

  getAIResponse: async (
    conversationId: string,
    userMessage: string
  ): Promise<BubbleDataType | null> => {
    const response = await mockApiService.getAIResponse(
      conversationId,
      userMessage
    );
    return response.success
      ? { role: response.data.role, content: response.data.content }
      : null;
  },

  getHotTopics: async () => {
    const response = await mockApiService.getHotTopics();
    return response.data;
  },

  uploadFile: async (file: File): Promise<string | null> => {
    const response = await mockApiService.uploadFile(file);
    return response.success ? response.data.url : null;
  },
};

// 根据配置选择使用真实API还是模拟API
const apiService = USE_MOCK_API ? mockApiAdapter : realApiService;

// 默认数据（作为后备）
const DEFAULT_CONVERSATIONS_ITEMS = [
  {
    key: "default-0",
    label: "What is Ant Design X?",
    group: "Today",
  },
  {
    key: "default-1",
    label: "How to quickly install and import components?",
    group: "Today",
  },
  {
    key: "default-2",
    label: "New AGI Hybrid Interface",
    group: "Yesterday",
  },
];

const HOT_TOPICS = {
  key: "1",
  label: "Hot Topics",
  children: [
    {
      key: "1-1",
      description: "What has Ant Design X upgraded?",
      icon: <span style={{ color: "#f93a4a", fontWeight: 700 }}>1</span>,
    },
    {
      key: "1-2",
      description: "New AGI Hybrid Interface",
      icon: <span style={{ color: "#ff6565", fontWeight: 700 }}>2</span>,
    },
    {
      key: "1-3",
      description: "What components are in Ant Design X?",
      icon: <span style={{ color: "#ff8f1f", fontWeight: 700 }}>3</span>,
    },
    {
      key: "1-4",
      description: "Come and discover the new design paradigm of the AI era.",
      icon: <span style={{ color: "#00000040", fontWeight: 700 }}>4</span>,
    },
    {
      key: "1-5",
      description: "How to quickly install and import components?",
      icon: <span style={{ color: "#00000040", fontWeight: 700 }}>5</span>,
    },
  ],
};

const DESIGN_GUIDE = {
  key: "2",
  label: "Design Guide",
  children: [
    {
      key: "2-1",
      icon: <HeartOutlined />,
      label: "Intention",
      description: "AI understands user needs and provides solutions.",
    },
    {
      key: "2-2",
      icon: <SmileOutlined />,
      label: "Role",
      description: "AI's public persona and image",
    },
    {
      key: "2-3",
      icon: <CommentOutlined />,
      label: "Chat",
      description: "How AI Can Express Itself in a Way Users Understand",
    },
    {
      key: "2-4",
      icon: <PaperClipOutlined />,
      label: "Interface",
      description: 'AI balances "chat" & "do" behaviors.',
    },
  ],
};

const SENDER_PROMPTS: GetProp<typeof Prompts, "items"> = [
  {
    key: "1",
    description: "Upgrades",
    icon: <ScheduleOutlined />,
  },
  {
    key: "2",
    description: "Components",
    icon: <ProductOutlined />,
  },
  {
    key: "3",
    description: "RICH Guide",
    icon: <FileSearchOutlined />,
  },
  {
    key: "4",
    description: "Installation Introduction",
    icon: <AppstoreAddOutlined />,
  },
];

const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      min-width: 1000px;
      height: 100vh;
      display: flex;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;
    `,
    sider: css`
      background: ${token.colorBgLayout}80;
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 12px;
      box-sizing: border-box;
    `,
    logo: css`
      display: flex;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;
      gap: 8px;
      margin: 24px 0;

      span {
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    addBtn: css`
      background: #1677ff0f;
      border: 1px solid #1677ff34;
      height: 40px;
    `,
    conversations: css`
      flex: 1;
      overflow-y: auto;
      margin-top: 12px;
      padding: 0;

      .ant-conversations-list {
        padding-inline-start: 0;
      }
    `,
    siderFooter: css`
      border-top: 1px solid ${token.colorBorderSecondary};
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `,
    chat: css`
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding-block: ${token.paddingLG}px;
      gap: 16px;
    `,
    chatPrompt: css`
      .ant-prompts-label {
        color: #000000e0 !important;
      }
      .ant-prompts-desc {
        color: #000000a6 !important;
        width: 100%;
      }
      .ant-prompts-icon {
        color: #000000a6 !important;
      }
    `,
    chatList: css`
      flex: 1;
      overflow: auto;
    `,
    loadingMessage: css`
      background-image: linear-gradient(
        90deg,
        #ff6b23 0%,
        #af3cb8 31%,
        #53b6ff 89%
      );
      background-size: 100% 2px;
      background-repeat: no-repeat;
      background-position: bottom;
    `,
    placeholder: css`
      padding-top: 32px;
    `,
    sender: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    `,
    speechButton: css`
      font-size: 18px;
      color: ${token.colorText} !important;
    `,
    senderPrompt: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      color: ${token.colorText};
    `,
  };
});

const DemoWithBackend: React.FC = () => {
  const { styles } = useStyle();
  const abortController = useRef<AbortController>(null);

  // ==================== State ====================
  const [messageHistory, setMessageHistory] = useState<Record<string, any>>({});
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [curConversation, setCurConversation] = useState<string>("");
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<
    GetProp<typeof Attachments, "items">
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [hotTopics, setHotTopics] = useState(HOT_TOPICS);

  // ==================== API Integration ====================

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 获取会话列表
        const conversationList = await apiService.getConversations();
        if (conversationList.length > 0) {
          setConversations(conversationList);
          setCurConversation(conversationList[0].key);

          // 获取第一个会话的消息
          const messages = await apiService.getMessages(
            conversationList[0].key
          );
          setMessageHistory({ [conversationList[0].key]: messages });
        } else {
          // 如果没有会话，使用默认数据
          setConversations(DEFAULT_CONVERSATIONS_ITEMS);
          setCurConversation(DEFAULT_CONVERSATIONS_ITEMS[0].key);
        }

        // 获取热门话题
        const topics = await apiService.getHotTopics();
        if (topics.length > 0) {
          setHotTopics({ ...HOT_TOPICS, children: topics });
        }
      } catch (error) {
        console.error("初始化数据失败:", error);
        // 使用默认数据作为后备
        setConversations(DEFAULT_CONVERSATIONS_ITEMS);
        setCurConversation(DEFAULT_CONVERSATIONS_ITEMS[0].key);
      }
    };

    initializeData();
  }, []);

  // 创建新会话
  const handleCreateConversation = async () => {
    const title = `New Conversation ${conversations.length + 1}`;
    const newConversation = await apiService.createConversation(title);

    if (newConversation) {
      setConversations([newConversation, ...conversations]);
      setCurConversation(newConversation.key);
      setMessageHistory((prev) => ({ ...prev, [newConversation.key]: [] }));
    } else {
      // 后备方案：本地创建
      const now = dayjs().valueOf().toString();
      const localConversation = {
        key: now,
        label: title,
        group: "Today",
      };
      setConversations([localConversation, ...conversations]);
      setCurConversation(now);
      setMessageHistory((prev) => ({ ...prev, [now]: [] }));
    }
  };

  // 删除会话
  const handleDeleteConversation = async (conversationKey: string) => {
    const success = await apiService.deleteConversation(conversationKey);

    if (success || true) {
      // 即使API失败也执行本地删除
      const newList = conversations.filter(
        (item) => item.key !== conversationKey
      );
      const newKey = newList?.[0]?.key;
      setConversations(newList);

      setTimeout(() => {
        if (conversationKey === curConversation) {
          setCurConversation(newKey);
          setMessageHistory((prev) => {
            const newHistory = { ...prev };
            delete newHistory[conversationKey];
            return newHistory;
          });
        }
      }, 200);
    }
  };

  // 切换会话
  const handleConversationChange = async (conversationKey: string) => {
    abortController.current?.abort();

    setTimeout(async () => {
      setCurConversation(conversationKey);

      // 如果本地没有消息历史，从API获取
      if (!messageHistory[conversationKey]) {
        const messages = await apiService.getMessages(conversationKey);
        setMessageHistory((prev) => ({ ...prev, [conversationKey]: messages }));
      }
    }, 100);
  };

  // 发送消息
  const handleSubmit = async (val: string) => {
    if (!val || loading) return;

    setLoading(true);

    try {
      // 添加用户消息到本地状态
      const userMessage: BubbleDataType = { role: "user", content: val };
      const currentMessages = messageHistory[curConversation] || [];
      const newMessages = [...currentMessages, userMessage];

      setMessageHistory((prev) => ({
        ...prev,
        [curConversation]: newMessages,
      }));

      // 发送消息到后端
      await apiService.sendMessage(curConversation, val);

      // 获取AI回复
      const aiResponse = await apiService.getAIResponse(curConversation, val);

      if (aiResponse) {
        setMessageHistory((prev) => ({
          ...prev,
          [curConversation]: [...newMessages, aiResponse],
        }));
      } else {
        // 后备方案：模拟AI回复
        const mockAiResponse: BubbleDataType = {
          role: "assistant",
          content: `这是对"${val}"的模拟回复。由于后端连接问题，这是一个本地生成的回复。`,
        };

        setTimeout(() => {
          setMessageHistory((prev) => ({
            ...prev,
            [curConversation]: [...newMessages, mockAiResponse],
          }));
        }, 1000);
      }
    } catch (error) {
      console.error("发送消息失败:", error);
      message.error("发送消息失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 文件上传处理
  const handleFileUpload = async (file: File) => {
    const uploadedUrl = await apiService.uploadFile(file);
    if (uploadedUrl) {
      message.success("文件上传成功");
      return uploadedUrl;
    }
    return null;
  };

  // ==================== 获取当前消息 ====================
  const currentMessages = messageHistory[curConversation] || [];

  // ==================== Render Components ====================
  const chatSider = (
    <div className={styles.sider}>
      <div className={styles.logo}>
        <img
          src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*eco6RrQhxbMAAAAAAAAAAAAADgCCAQ/original"
          draggable={false}
          alt="logo"
          width={24}
          height={24}
        />
        <span>Ant Design X (Backend Demo)</span>
      </div>

      <Button
        onClick={handleCreateConversation}
        type="link"
        className={styles.addBtn}
        icon={<PlusOutlined />}
      >
        New Conversation
      </Button>

      <Conversations
        items={conversations}
        className={styles.conversations}
        activeKey={curConversation}
        onActiveChange={handleConversationChange}
        groupable
        styles={{ item: { padding: "0 8px" } }}
        menu={(conversation) => ({
          items: [
            {
              label: "Rename",
              key: "rename",
              icon: <EditOutlined />,
            },
            {
              label: "Delete",
              key: "delete",
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => handleDeleteConversation(conversation.key),
            },
          ],
        })}
      />

      <div className={styles.siderFooter}>
        <Avatar size={24} />
        <Button type="text" icon={<QuestionCircleOutlined />} />
      </div>
    </div>
  );

  const chatList = (
    <div className={styles.chatList}>
      {currentMessages?.length ? (
        <Bubble.List
          items={currentMessages?.map((message: any) => ({
            ...message,
            classNames: {
              content: loading ? styles.loadingMessage : "",
            },
            typing: loading
              ? { step: 5, interval: 20, suffix: <>💗</> }
              : false,
          }))}
          style={{
            height: "100%",
            paddingInline: "calc(calc(100% - 700px) /2)",
          }}
          roles={{
            assistant: {
              placement: "start",
              footer: (
                <div style={{ display: "flex" }}>
                  <Button type="text" size="small" icon={<ReloadOutlined />} />
                  <Button type="text" size="small" icon={<CopyOutlined />} />
                  <Button type="text" size="small" icon={<LikeOutlined />} />
                  <Button type="text" size="small" icon={<DislikeOutlined />} />
                </div>
              ),
              loadingRender: () => <Spin size="small" />,
            },
            user: { placement: "end" },
          }}
        />
      ) : (
        <Space
          direction="vertical"
          size={16}
          style={{ paddingInline: "calc(calc(100% - 700px) /2)" }}
          className={styles.placeholder}
        >
          <Welcome
            variant="borderless"
            icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            title="Hello, I'm Ant Design X (Backend Demo)"
            description="这是一个集成了后端API的演示版本，支持数据持久化和实时同步~"
            extra={
              <Space>
                <Button icon={<ShareAltOutlined />} />
                <Button icon={<EllipsisOutlined />} />
              </Space>
            }
          />
          <Flex gap={16}>
            <Prompts
              items={[hotTopics]}
              styles={{
                list: { height: "100%" },
                item: {
                  flex: 1,
                  backgroundImage:
                    "linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)",
                  borderRadius: 12,
                  border: "none",
                },
                subItem: { padding: 0, background: "transparent" },
              }}
              onItemClick={(info) => {
                handleSubmit(info.data.description as string);
              }}
              className={styles.chatPrompt}
            />

            <Prompts
              items={[DESIGN_GUIDE]}
              styles={{
                item: {
                  flex: 1,
                  backgroundImage:
                    "linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)",
                  borderRadius: 12,
                  border: "none",
                },
                subItem: { background: "#ffffffa6" },
              }}
              onItemClick={(info) => {
                handleSubmit(info.data.description as string);
              }}
              className={styles.chatPrompt}
            />
          </Flex>
        </Space>
      )}
    </div>
  );

  const senderHeader = (
    <Sender.Header
      title="Upload File"
      open={attachmentsOpen}
      onOpenChange={setAttachmentsOpen}
      styles={{ content: { padding: 0 } }}
    >
      <Attachments
        beforeUpload={(file) => {
          handleFileUpload(file);
          return false;
        }}
        items={attachedFiles}
        onChange={(info) => setAttachedFiles(info.fileList)}
        placeholder={(type) =>
          type === "drop"
            ? { title: "Drop file here" }
            : {
                icon: <CloudUploadOutlined />,
                title: "Upload files",
                description: "Click or drag files to this area to upload",
              }
        }
      />
    </Sender.Header>
  );

  const chatSender = (
    <>
      <Prompts
        items={SENDER_PROMPTS}
        onItemClick={(info) => {
          handleSubmit(info.data.description as string);
        }}
        styles={{
          item: { padding: "6px 12px" },
        }}
        className={styles.senderPrompt}
      />

      <Sender
        value={inputValue}
        header={senderHeader}
        onSubmit={() => {
          handleSubmit(inputValue);
          setInputValue("");
        }}
        onChange={setInputValue}
        onCancel={() => {
          abortController.current?.abort();
          setLoading(false);
        }}
        prefix={
          <Button
            type="text"
            icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
            onClick={() => setAttachmentsOpen(!attachmentsOpen)}
          />
        }
        loading={loading}
        className={styles.sender}
        allowSpeech
        actions={(_, info) => {
          const { SendButton, LoadingButton, SpeechButton } = info.components;
          return (
            <Flex gap={4}>
              <SpeechButton className={styles.speechButton} />
              {loading ? (
                <LoadingButton type="default" />
              ) : (
                <SendButton type="primary" />
              )}
            </Flex>
          );
        }}
        placeholder="Ask or input / use skills (Backend integrated)"
      />
    </>
  );

  return (
    <div className={styles.layout}>
      {chatSider}
      <div className={styles.chat}>
        {chatList}
        {chatSender}
      </div>
    </div>
  );
};

export default DemoWithBackend;
