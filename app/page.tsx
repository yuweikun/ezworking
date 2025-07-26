"use client";
// 导入 Ant Design 图标组件
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
import { AuthButton } from "../components/auth-button";
// 导入 Ant Design X 的 AI 聊天相关组件
import {
  Attachments, // 附件组件
  Bubble, // 聊天气泡组件
  Conversations, // 会话列表组件
  Prompts, // 提示词组件
  Sender, // 消息发送组件
  Welcome, // 欢迎页组件
  useXAgent, // AI 代理 Hook
  useXChat, // 聊天功能 Hook
} from "@ant-design/x";
// 导入 Ant Design 基础组件
import { Button, Flex, type GetProp, Space, Spin, message, Modal } from "antd";
import { createStyles } from "antd-style"; // 样式创建工具
// import dayjs from 'dayjs';  // 日期处理库 - 暂时未使用
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "../contexts/conversation-context";
import { useAuth } from "../contexts/auth-context";
import { generateDefaultTitle } from "../types/conversation-utils";
import { useConversationRealtime } from "../hooks/use-conversation-realtime";
import { ErrorHandler } from "../lib/error-handler";
import { ErrorBoundary } from "../components/error-boundary";
import { CustomMessageRenderer } from "./chat/messageRenderer";

// 定义聊天气泡数据类型
type BubbleDataType = {
  role: string; // 角色：user 或 assistant
  content: string; // 消息内容
};

// 设计指南配置 - 用于欢迎页面的设计理念展示
const DESIGN_GUIDE = {
  key: "2",
  label: "提示词指南", // 设计指南标题
  children: [
    {
      key: "2-1",
      icon: <HeartOutlined />,
      label: "我适合什么工作", // 意图
      description:
        "通过多智能体的协作，来帮助你确认可能适合的工作                 ", // AI 理解用户需求并提供解决方案
    },
    {
      key: "2-2",
      icon: <SmileOutlined />,
      label: "帮助我找到岗位信息", // 角色
      description:
        "通过工具在各个软件官网上搜索，找到符合你要求的工作信息         ", // AI 的公众形象和个性
    },
    {
      key: "2-3",
      icon: <CommentOutlined />,
      label: "我怎么准备AI产品经理面试", // 对话
      description:
        "在小红书等信息平台上搜索相关岗位面经，生成合理的面试准备指南", // AI 如何以用户理解的方式表达自己
    },
    {
      key: "2-4",
      icon: <PaperClipOutlined />,
      label: "帮我投递符合我要求的岗位", // 界面
      description: "通过自动化工具，完成网申等流程", // AI 平衡"聊天"和"执行"行为
    },
  ],
};

// 发送器提示词配置 - 显示在输入框上方的快捷提示
const SENDER_PROMPTS: GetProp<typeof Prompts, "items"> = [
  {
    key: "1",
    description: "Upgrades", // 升级相关
    icon: <ScheduleOutlined />,
  },
  {
    key: "2",
    description: "Components", // 组件相关
    icon: <ProductOutlined />,
  },
  {
    key: "3",
    description: "RICH Guide", // 富文本指南
    icon: <FileSearchOutlined />,
  },
  {
    key: "4",
    description: "Installation Introduction", // 安装介绍
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
    // sider 样式
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
      gap: 8px;
    `,
    // chat list 样式
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
      width: 100%; // 让 Prompts 组件占据全宽

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
    // sender 样式
    sender: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    `,

    senderPrompt: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      color: ${token.colorText};
    `,

    // 添加加载动画
    "@keyframes loading-shimmer": {
      "0%": {
        transform: "translateX(-100%)",
      },
      "100%": {
        transform: "translateX(400%)",
      },
    },
  };
});

const Independent: React.FC = () => {
  const { styles } = useStyle(); // 获取样式
  const abortController = useRef<AbortController>(null); // 用于取消请求的控制器

  // ==================== 上下文集成 ====================
  const { isAuthenticated, user } = useAuth();
  // ==================== 会话管理集成 ====================
  const {
    conversations,
    activeConversationId,
    loading: conversationLoading,
    error: conversationError,
    createConversation,
    deleteConversation,
    updateConversation,
    setActiveConversation,
    clearError,
    fetchConversations,
    refreshConversations,
  } = useConversation();

  // ==================== 实时更新集成 ====================
  const {
    onMessageAdded,
    onUserTyping,
    syncConversationState,
    handleMultipleActivities,
    hasPendingUpdates,
    cleanup: cleanupRealtime,
  } = useConversationRealtime();

  // ==================== 状态管理 ====================
  const [messageHistory, setMessageHistory] = useState<Record<string, any>>({}); // 消息历史记录

  const [attachmentsOpen, setAttachmentsOpen] = useState(false); // 附件面板是否打开
  const [attachedFiles, setAttachedFiles] = useState<
    GetProp<typeof Attachments, "items">
  >([]); // 已附加的文件列表

  const [inputValue, setInputValue] = useState(""); // 输入框的值

  // 操作加载状态
  const [operationLoading, setOperationLoading] = useState<{
    creating: boolean;
    deleting: string | null; // 存储正在删除的会话ID
    switching: boolean;
  }>({
    creating: false,
    deleting: null,
    switching: false,
  });

  // 消息存储状态
  const [isStoringMessages, setIsStoringMessages] = useState(false);

  // 网络状态
  const [isOnline, setIsOnline] = useState(true);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // 网络恢复时自动重新获取会话列表
      if (isAuthenticated && user?.id && conversationError) {
        clearError();
        fetchConversations();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 初始化网络状态
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [
    isAuthenticated,
    user?.id,
    conversationError,
    clearError,
    fetchConversations,
  ]);

  // 组件卸载时清理实时更新资源
  useEffect(() => {
    return () => {
      cleanupRealtime();
    };
  }, [cleanupRealtime]);

  // 定期同步会话状态（确保数据一致性）
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    // 每30秒进行一次智能同步（仅在有活动时）
    const syncInterval = setInterval(() => {
      if (isOnline && !hasPendingUpdates()) {
        // 只有在网络在线且没有待处理更新时才进行同步
        syncConversationState(activeConversationId || "").catch((error) => {
          console.warn("定期同步失败:", error);
        });
      }
    }, 30000); // 30秒

    return () => {
      clearInterval(syncInterval);
    };
  }, [
    isAuthenticated,
    user?.id,
    isOnline,
    activeConversationId,
    hasPendingUpdates,
    syncConversationState,
  ]);

  // loadSessionMessages和相关useEffect将在useXChat之后定义

  // 单条消息存储到数据库的辅助函数
  const storeMessage = async (
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    workflowStage?: any
  ) => {
    if (!isAuthenticated || !user?.id) {
      console.warn("用户未认证，跳过消息存储");
      return false;
    }

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.warn("认证token不存在，跳过消息存储");
        return false;
      }

      const response = await fetch("/api/messages/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          role: role,
          content: content.trim(),
          workflow_stage: workflowStage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`消息存储成功: ${role} - ${data.data.id}`);
          return true;
        } else {
          console.warn("消息存储失败:", data.message);
        }
      } else {
        console.warn("消息存储请求失败:", response.status, response.statusText);
      }
    } catch (error) {
      console.warn("消息存储错误:", error);
    }

    return false;
  };

  const requestHandler = async (
    { message }: { message: { content: string; role: string } },
    {
      onUpdate,
      onSuccess,
      onError,
      onStream,
    }: {
      onUpdate: (chunk: { content: string; role: string }) => void;
      onSuccess: (chunks: { content: string; role: string }[]) => void;
      onError: (error: Error) => void;
      onStream?: (abortController: AbortController) => void;
    }
  ) => {
    // 直接使用当前活跃会话ID
    const currentSessionId = activeConversationId;
    
    try {
      // 检查是否有活跃会话
      if (!currentSessionId) {
        onError(new Error("请先创建或选择一个会话"));
        return;
      }

      // 检查用户是否已登录
      if (!isAuthenticated || !user?.id) {
        onError(new Error("请先登录"));
        return;
      }

      // 步骤1: 用户消息气泡已在onSubmit中立即渲染
      
      // 步骤2: 严格等待用户消息上传到数据库完成
      setIsStoringMessages(true);
      onUpdate({ content: "💾 正在保存您的消息...", role: "assistant" });
      
      console.log("开始上传用户消息到数据库...");
      const userStorageSuccess = await storeMessage(
        currentSessionId,
        "user",
        message.content,
        { stage: "user_input", timestamp: Date.now() }
      );

      if (!userStorageSuccess) {
        setIsStoringMessages(false);
        onError(new Error("用户消息保存失败，请重试"));
        return;
      }
      
      console.log("用户消息上传完成，开始AI响应...");

      // 步骤3: 用户消息保存成功后，AI才开始响应
      onUpdate({ content: "正在思考中...", role: "assistant" });

      const abortController = new AbortController();
      if (onStream) {
        onStream(abortController);
      }

      // 获取认证token
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIsStoringMessages(false);
        onError(new Error("认证token不存在，请重新登录"));
        return;
      }

      // 步骤4: 调用AI流式API
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          query: message.content,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        setIsStoringMessages(false);
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // 如果不是JSON，使用默认错误消息
        }

        onError(new Error(errorMessage));
        return;
      }

      // 步骤5: 处理AI流式响应（立即渲染AI气泡）
      const reader = response.body?.getReader();
      if (!reader) {
        setIsStoringMessages(false);
        onError(new Error("无法读取响应流"));
        return;
      }

      const decoder = new TextDecoder();
      let fullContent = "";
      let finalWorkflowState = null;
      const chunks: { content: string; role: string }[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonData = line.substring(6).trim();

              if (jsonData) {
                try {
                  const data = JSON.parse(jsonData);
                  console.log("Received SSE data:", data);

                  if (data.content) {
                    fullContent += data.content;
                    const chunkData = {
                      content: fullContent,
                      role: "assistant" as const,
                    };
                    chunks.push(chunkData);
                    // 立即渲染AI响应内容
                    onUpdate(chunkData);
                  }

                  if (data.workflowState) {
                    finalWorkflowState = data.workflowState;
                  }

                  if (data.finished) {
                    console.log("AI响应完成，开始上传AI消息到数据库...");
                    
                    // 步骤6: AI响应完成后，严格等待AI消息上传到数据库
                    onUpdate({ 
                      content: fullContent + "\n\n💾 正在保存AI回复...", 
                      role: "assistant" 
                    });

                    const aiStorageSuccess = await storeMessage(
                      currentSessionId,
                      "assistant",
                      fullContent,
                      finalWorkflowState || { stage: "ai_response", timestamp: Date.now() }
                    );

                    if (aiStorageSuccess) {
                      console.log("AI消息上传完成，用户现在可以继续聊天");
                      // 步骤7: AI消息保存成功，移除存储提示
                      onUpdate({ 
                        content: fullContent, 
                        role: "assistant" 
                      });
                    } else {
                      console.warn("AI消息保存失败");
                      // AI消息保存失败，但不阻止用户继续聊天
                      onUpdate({ 
                        content: fullContent + "\n\n⚠️ AI回复保存失败", 
                        role: "assistant" 
                      });
                    }

                    // 步骤8: 严格等待所有存储操作完成后，才重置状态允许用户继续聊天
                    setIsStoringMessages(false);
                    
                    // 给用户一点时间看到最终状态，然后完成对话
                    setTimeout(() => {
                      onSuccess(chunks);
                    }, 300);
                    
                    return;
                  }

                  if (data.error) {
                    setIsStoringMessages(false);
                    onError(new Error("流式响应中出现错误"));
                    return;
                  }
                } catch (parseError) {
                  console.warn(
                    "Failed to parse SSE data:",
                    jsonData,
                    parseError
                  );
                  // 继续处理其他数据块，不中断整个流程
                }
              }
            }
          }
        }

        // 如果流结束但没有收到finished标志，仍然严格执行存储流程
        if (fullContent.trim() && chunks.length > 0) {
          console.log("流结束但未收到finished标志，执行存储流程...");
          
          onUpdate({ 
            content: fullContent + "\n\n💾 正在保存AI回复...", 
            role: "assistant" 
          });

          const aiStorageSuccess = await storeMessage(
            currentSessionId,
            "assistant",
            fullContent,
            finalWorkflowState || { stage: "ai_response", timestamp: Date.now() }
          );

          if (aiStorageSuccess) {
            console.log("AI消息存储完成");
            onUpdate({ 
              content: fullContent, 
              role: "assistant" 
            });
          } else {
            console.warn("AI消息存储失败");
            onUpdate({ 
              content: fullContent + "\n\n⚠️ AI回复保存失败", 
              role: "assistant" 
            });
          }

          // 严格等待存储完成后才允许用户继续
          setIsStoringMessages(false);
          
          setTimeout(() => {
            onSuccess(chunks);
          }, 300);
        } else {
          setIsStoringMessages(false);
          onError(new Error("未收到任何响应内容"));
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      setIsStoringMessages(false);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      // 检查是否是用户主动取消的请求
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was aborted by user");
        return; // 不显示错误，因为这是用户主动取消
      }

      onError(new Error(errorMessage));
    }
  };

  /**
   * 🔔 请将 BASE_URL、PATH、MODEL、API_KEY 替换为你自己的值
   */

  // ==================== AI 代理配置 ====================
  // const [agent] = useXAgent<BubbleDataType>({
  //   baseURL: "https://api.x.ant.design/api/llm_siliconflow_deepseekr1", // API 基础地址
  //   model: "deepseek-ai/DeepSeek-R1", // 使用的 AI 模型
  //   dangerouslyApiKey: "Bearer sk-xxxxxxxxxxxxxxxxxxxx", // API 密钥（需要替换为真实的）
  // });
  const [agent] = useXAgent({
    request: requestHandler, // 自定义请求处理函数
  });

  const loading = agent.isRequesting(); // 获取请求状态

  // 聊天功能配置
  const { onRequest, messages, setMessages } = useXChat({
    agent, // 传入 AI 代理
    // 请求失败时的回退处理
    // requestFallback: (_, { error }) => {
    //   if (error.name === "AbortError") {
    //     return {
    //       content: "Request is aborted", // 请求被取消
    //       role: "assistant",
    //     };
    //   }
    //   return {
    //     content: "Request failed, please try again!", // 请求失败，请重试
    //     role: "assistant",
    //   };
    // },
    // // 消息转换处理 - 用于处理流式响应
    // transformMessage: (info) => {
    //   const { originMessage, chunk } = info || {};
    //   let currentContent = ""; // 当前内容
    //   let currentThink = ""; // 当前思考内容
    //   try {
    //     // 解析流式数据
    //     if (chunk?.data && !chunk?.data.includes("DONE")) {
    //       const message = JSON.parse(chunk?.data);
    //       currentThink = message?.choices?.[0]?.delta?.reasoning_content || ""; // 推理内容
    //       currentContent = message?.choices?.[0]?.delta?.content || ""; // 回复内容
    //     }
    //   } catch (error) {
    //     console.error(error);
    //   }

    //   let content = "";

    //   // 处理思考过程的显示逻辑
    //   if (!originMessage?.content && currentThink) {
    //     content = `<think>${currentThink}`;
    //   } else if (
    //     originMessage?.content?.includes("<think>") &&
    //     !originMessage?.content.includes("</think>") &&
    //     currentContent
    //   ) {
    //     content = `${originMessage?.content}</think>${currentContent}`;
    //   } else {
    //     content = `${
    //       originMessage?.content || ""
    //     }${currentThink}${currentContent}`;
    //   }
    //   return {
    //     content: content,
    //     role: "assistant",
    //   };
    // },
    // // 设置取消控制器
    // resolveAbortController: (controller) => {
    //   abortController.current = controller;
    // },
  });

  // 从数据库加载会话消息历史
  const loadSessionMessages = useCallback(
    async (sessionId: string) => {
      if (!isAuthenticated || !user?.id) return;

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const response = await fetch(`/api/messages?session_id=${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.history) {
            // 将数据库消息转换为前端消息格式
            const formattedMessages = data.data.history.map((msg: any) => ({
              message: {
                role: msg.role,
                content: msg.content,
              },
              status: "success",
            }));

            // 更新消息历史
            setMessageHistory((prev) => ({
              ...prev,
              [sessionId]: formattedMessages,
            }));

            // 如果这是当前活跃会话，更新显示的消息
            if (sessionId === activeConversationId) {
              setMessages(formattedMessages);
            }
          }
        }
      } catch (error) {
        console.warn("加载会话消息失败:", error);
      }
    },
    [isAuthenticated, user?.id, activeConversationId, setMessages]
  );

  // 当切换会话时，加载消息历史并同步状态
  useEffect(() => {
    if (!activeConversationId || !isOnline || !isAuthenticated || !user?.id) {
      return;
    }

    // 检查是否有缓存的消息历史
    if (messageHistory[activeConversationId]) {
      // 如果有缓存，直接使用
      setMessages(messageHistory[activeConversationId]);
    } else {
      // 如果没有缓存，从数据库加载
      loadSessionMessages(activeConversationId);
    }

    // 延迟同步，避免频繁切换时的性能问题
    const syncTimeout = setTimeout(() => {
      syncConversationState(activeConversationId).catch((error) => {
        console.warn("切换会话时同步失败:", error);
      });
    }, 1000); // 1秒延迟

    return () => {
      clearTimeout(syncTimeout);
    };
  }, [activeConversationId, isOnline, isAuthenticated, user?.id]); // 只依赖基本状态，避免循环

  // ==================== 事件处理 ====================
  // 提交消息的处理函数
  const onSubmit = (val: string) => {
    if (!val) return; // 如果输入为空则返回

    // 如果正在请求中，显示错误提示
    if (loading) {
      message.error("正在处理中，请等待当前请求完成");
      return;
    }

    // 如果正在存储消息，禁止新的输入
    if (isStoringMessages) {
      message.error("正在保存对话，请稍候...");
      return;
    }

    // 检查是否有活跃会话
    if (!activeConversationId) {
      message.error("请先创建或选择一个会话");
      return;
    }

    // 检查用户是否已登录
    if (!isAuthenticated || !user?.id) {
      message.error("请先登录");
      return;
    }

    // 发送请求 - requestHandler会处理聊天和批量存储
    onRequest({
      stream: true, // 启用流式响应
      message: { role: "user", content: val }, // 用户消息（不包含sessionId避免DOM警告）
    });
  };

  // ==================== 组件节点 ====================
  // 左侧边栏组件
  const chatSider = (
    <div className={styles.sider}>
      {/* 🌟 Logo 区域 */}
      <div className={styles.logo}>
        <img
          src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*eco6RrQhxbMAAAAAAAAAAAAADgCCAQ/original"
          draggable={false}
          alt="logo"
          width={24}
          height={24}
        />
        <span>EzWorking</span>
      </div>

      {/* 🌟 新建会话按钮 */}
      <Button
        onClick={async () => {
          if (!isAuthenticated || !user?.id) {
            ErrorHandler.showError(new Error("请先登录"), {
              showMessage: true,
            });
            return;
          }

          setOperationLoading((prev) => ({ ...prev, creating: true }));

          try {
            const title = generateDefaultTitle(conversations.length);
            const newConversation = await createConversation(title, {
              showSuccess: true,
              showError: true,
              autoSelect: true,
            });

            // 清空消息列表和消息历史缓存
            setMessages([]);
            if (newConversation) {
              setMessageHistory((prev) => ({
                ...prev,
                [activeConversationId || ""]: [],
              }));
            }

            clearError(); // 清除任何现有错误
          } catch (error: any) {
            console.error("创建会话失败:", error);
            // 错误已在context中处理，这里不需要重复显示
          } finally {
            setOperationLoading((prev) => ({ ...prev, creating: false }));
          }
        }}
        type="link"
        className={styles.addBtn}
        icon={<PlusOutlined />}
        loading={operationLoading.creating || conversationLoading}
        disabled={!isAuthenticated || operationLoading.creating}
      >
        {operationLoading.creating ? "创建中..." : "新建会话"}
      </Button>

      {/* 🌟 会话列表管理 */}
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 刷新按钮 */}
        {isAuthenticated && conversations.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "8px 8px 0 8px",
              borderBottom: conversationLoading ? "1px solid #f0f0f0" : "none",
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={async () => {
                try {
                  clearError();
                  await refreshConversations({
                    showSuccess: true,
                    force: true,
                  });
                } catch (error: any) {
                  console.error("刷新会话列表失败:", error);
                  // 错误已在refreshConversations中处理
                }
              }}
              loading={conversationLoading}
              disabled={
                operationLoading.creating ||
                operationLoading.switching ||
                operationLoading.deleting !== null
              }
              title="刷新会话列表"
            />
          </div>
        )}

        {/* 加载指示器 */}
        {conversationLoading && conversations.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: isAuthenticated && conversations.length > 0 ? "40px" : "0",
              left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, #1677ff 0%, #69c0ff 100%)",
              zIndex: 10,
              opacity: 0.8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: "30%",
                background:
                  "linear-gradient(90deg, transparent 0%, #ffffff 50%, transparent 100%)",
                animation: "loading-shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {!isAuthenticated ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
            请登录查看会话列表
          </div>
        ) : conversationError ? (
          <div style={{ padding: "20px", textAlign: "center" }}>
            {/* 网络状态指示器 */}
            {!isOnline && (
              <div
                style={{
                  background: "#fff2e8",
                  border: "1px solid #ffbb96",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "#d46b08",
                }}
              >
                🌐 网络连接已断开，请检查网络后重试
              </div>
            )}

            <div
              style={{
                fontSize: "32px",
                color: "#ff4d4f",
                marginBottom: "12px",
                lineHeight: 1,
              }}
            >
              ⚠️
            </div>
            <div
              style={{
                color: "#ff4d4f",
                marginBottom: "12px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {conversationError.message}
            </div>
            <div style={{ marginBottom: "16px" }}>
              <Button
                size="small"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={async () => {
                  try {
                    clearError();
                    await fetchConversations();
                    message.success("重新加载成功");
                  } catch (error: any) {
                    console.error("重试获取会话列表失败:", error);
                  }
                }}
                loading={conversationLoading}
                disabled={!isOnline}
              >
                {isOnline ? "重试" : "网络断开"}
              </Button>
            </div>
            <div style={{ color: "#999", fontSize: "12px", lineHeight: 1.4 }}>
              {isOnline
                ? "如果问题持续存在，请稍后再试或联系技术支持"
                : "请检查网络连接后重试"}
            </div>
          </div>
        ) : conversationLoading && conversations.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 20px",
            }}
          >
            <Spin size="default" />
            <div style={{ marginTop: "16px", color: "#999", fontSize: "14px" }}>
              加载会话列表中...
            </div>
            <div style={{ marginTop: "4px", color: "#bbb", fontSize: "12px" }}>
              首次加载可能需要几秒钟
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div
              style={{
                fontSize: "48px",
                color: "#f0f0f0",
                marginBottom: "16px",
                lineHeight: 1,
              }}
            >
              💬
            </div>
            <div
              style={{ color: "#999", marginBottom: "8px", fontSize: "14px" }}
            >
              暂无会话
            </div>
            <div style={{ color: "#bbb", fontSize: "12px", lineHeight: 1.4 }}>
              点击上方"新建会话"按钮
              <br />
              开始您的第一次对话
            </div>
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              opacity: operationLoading.switching ? 0.6 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            {operationLoading.switching && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 100,
                  background: "rgba(255, 255, 255, 0.9)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                <Spin size="small" />
                切换中...
              </div>
            )}

            <Conversations
              items={conversations.map((conv) => ({
                ...conv,
                disabled:
                  conv.disabled ||
                  operationLoading.deleting === conv.key ||
                  operationLoading.switching,
                label:
                  operationLoading.deleting === conv.key ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Spin size="small" />
                      <span style={{ opacity: 0.6 }}>{conv.label}</span>
                    </div>
                  ) : (
                    conv.label
                  ),
              }))} // 会话列表数据
              className={styles.conversations}
              activeKey={activeConversationId || undefined} // 当前激活的会话
              onActiveChange={async (val) => {
                if (operationLoading.switching || operationLoading.deleting) {
                  return; // 如果正在进行其他操作，阻止切换
                }

                setOperationLoading((prev) => ({ ...prev, switching: true }));

                try {
                  abortController.current?.abort(); // 取消当前请求

                  // 切换会话
                  setActiveConversation(val);

                  // 检查是否有缓存的消息历史
                  if (messageHistory[val]) {
                    setMessages(messageHistory[val]);
                  } else {
                    // 如果没有缓存，清空消息并从数据库加载
                    setMessages([]);
                    // 加载消息历史
                    await loadSessionMessages(val);
                  }

                  setOperationLoading((prev) => ({
                    ...prev,
                    switching: false,
                  }));
                } catch (error) {
                  console.error("切换会话失败:", error);
                  setOperationLoading((prev) => ({
                    ...prev,
                    switching: false,
                  }));
                }
              }}
              groupable // 启用分组功能
              styles={{ item: { padding: "0 8px" } }}
              // 会话右键菜单配置
              menu={(conversation) => ({
                items: [
                  {
                    label: "Rename", // 重命名
                    key: "rename",
                    icon: <EditOutlined />,
                  },
                  {
                    label: "Delete", // 删除
                    key: "delete",
                    icon: <DeleteOutlined />,
                    danger: true, // 危险操作样式
                    onClick: () => {
                      // 显示删除确认对话框
                      Modal.confirm({
                        title: "确认删除会话",
                        content: `确定要删除会话"${
                          typeof conversation.label === "string"
                            ? conversation.label
                            : "未命名会话"
                        }"吗？此操作无法撤销。`,
                        okText: "删除",
                        okType: "danger",
                        cancelText: "取消",
                        icon: <DeleteOutlined />,
                        onOk: async () => {
                          setOperationLoading((prev) => ({
                            ...prev,
                            deleting: conversation.key,
                          }));

                          try {
                            await deleteConversation(conversation.key, {
                              showSuccess: true,
                              showError: true,
                              optimistic: true,
                            });
                            // 如果删除的是当前活跃会话，清空消息历史
                            if (conversation.key === activeConversationId) {
                              setMessages([]);
                            }
                            clearError(); // 清除任何现有错误
                          } catch (error: any) {
                            console.error("删除会话失败:", error);
                            // 错误已在context中处理，这里不需要重复显示
                            throw error; // 重新抛出错误以阻止对话框关闭
                          } finally {
                            setOperationLoading((prev) => ({
                              ...prev,
                              deleting: null,
                            }));
                          }
                        },
                      });
                    },
                  },
                ],
              })}
            />
          </div>
        )}
      </div>

      {/* 侧边栏底部 */}
      <div className={styles.siderFooter}>
        <AuthButton />
        <Button type="text" icon={<QuestionCircleOutlined />} />{" "}
        {/* 帮助按钮 */}
      </div>
    </div>
  );

  // 聊天消息列表组件
  const chatList = (
    <div className={styles.chatList}>
      {messages?.length ? (
        /* 🌟 聊天气泡列表 */
        <Bubble.List
          items={messages?.map((i) => {
            // Handle different message formats
            let messageData: any = {};
            let role: "assistant" | "user" | "system" = "user";
            let content = "";

            if (i.message && typeof i.message === "object") {
              messageData = i.message;
              role = (i.message as any).role || "user";
              content = (i.message as any).content || "";
            } else if (typeof i.message === "string") {
              content = i.message;
              role = "user"; // Default role for string messages
            }

            return {
              ...messageData,
              role,
              content,
              messageRender: () =>
                CustomMessageRenderer({
                  id: `msg-${Date.now()}-${Math.random()}`, // 生成唯一ID
                  role,
                  content,
                  timestamp: Date.now(), // 或者从消息中获取实际时间戳
                }), // 传递符合 Message 类型的对象
              classNames: {
                // 加载中的消息添加特殊样式
                content: i.status === "loading" ? styles.loadingMessage : "",
              },
              // 加载中显示打字效果
              typing:
                i.status === "loading"
                  ? { step: 5, interval: 20, suffix: <>💗</> }
                  : false,
            };
          })}
          style={{
            height: "100%",
            paddingInline: "calc(calc(100% - 700px) /2)",
          }} // 居中显示
          roles={{
            // AI 助手角色配置
            assistant: {
              placement: "start", // 显示在左侧
              footer: (
                // 消息底部操作按钮
                <div style={{ display: "flex" }}>
                  <Button type="text" size="small" icon={<ReloadOutlined />} />{" "}
                  {/* 重新生成 */}
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                  />{" "}
                  {/* 复制 */}
                  <Button
                    type="text"
                    size="small"
                    icon={<LikeOutlined />}
                  />{" "}
                  {/* 点赞 */}
                  <Button
                    type="text"
                    size="small"
                    icon={<DislikeOutlined />}
                  />{" "}
                  {/* 点踩 */}
                </div>
              ),
              loadingRender: () => <Spin size="small" />, // 加载中显示
            },
            // 用户角色配置
            user: { placement: "end" }, // 显示在右侧
          }}
        />
      ) : (
        // 无消息时显示欢迎页面
        <Space
          direction="vertical"
          size={16}
          style={{ paddingInline: "calc(calc(100% - 700px) /2)" }} // 恢复原来的居中显示
          className={styles.placeholder}
        >
          {/* 🌟 欢迎组件 */}
          <Welcome
            variant="borderless" // 无边框样式
            icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            title="Hello,欢迎来到EzWorking" // 欢迎标题
            description="我是一个基于Multi-Agent的求职助手~" // 描述
            extra={
              // 额外操作按钮
              <Space>
                <Button icon={<ShareAltOutlined />} /> {/* 分享 */}
                <Button icon={<EllipsisOutlined />} /> {/* 更多 */}
              </Space>
            }
          />
          {/* 设计指南提示词 */}
          <Prompts
            items={[DESIGN_GUIDE]}
            styles={{
              item: {
                backgroundImage:
                  "linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)", // 渐变背景
                borderRadius: 12,
                border: "none",
              },
              subItem: { background: "#ffffffa6" }, // 子项背景
            }}
            onItemClick={(info) => {
              onSubmit(info.data.description as string); // 点击提示词时发送消息
            }}
            className={styles.chatPrompt}
          />
        </Space>
      )}
    </div>
  );
  // 发送器头部 - 文件上传区域
  const senderHeader = (
    <Sender.Header
      title="Upload File" // 上传文件标题
      open={attachmentsOpen} // 是否打开
      onOpenChange={setAttachmentsOpen} // 打开状态变化回调
      styles={{ content: { padding: 0 } }}
    >
      {/* 附件上传组件 */}
      <Attachments
        beforeUpload={() => false} // 阻止自动上传
        items={attachedFiles} // 已附加的文件列表
        onChange={(info) => setAttachedFiles(info.fileList)} // 文件列表变化回调
        placeholder={(type) =>
          type === "drop"
            ? { title: "Drop file here" } // 拖拽时的提示
            : {
                icon: <CloudUploadOutlined />,
                title: "Upload files", // 上传文件标题
                description: "Click or drag files to this area to upload", // 上传描述
              }
        }
      />
    </Sender.Header>
  );
  // 聊天发送器组件
  const chatSender = (
    <>
      {/* 🌟 快捷提示词 */}
      <Prompts
        items={SENDER_PROMPTS} // 提示词数据
        onItemClick={(info) => {
          onSubmit(info.data.description as string); // 点击提示词时发送
        }}
        styles={{
          item: { padding: "6px 12px" }, // 提示词项样式
        }}
        className={styles.senderPrompt}
      />
      {/* 🌟 消息输入框 */}
      <Sender
        value={inputValue} // 输入框值
        header={senderHeader} // 头部组件（文件上传）
        onSubmit={() => {
          onSubmit(inputValue); // 提交消息
          setInputValue(""); // 清空输入框
        }}
        onChange={(value) => {
          setInputValue(value); // 输入值变化

          // 当用户输入时，更新会话活动状态（防抖处理在hook内部）
          if (activeConversationId && value.trim()) {
            onUserTyping(activeConversationId);
          }
        }}
        onCancel={() => {
          abortController.current?.abort(); // 取消请求
        }}
        prefix={
          // 输入框前缀 - 附件按钮
          <Button
            type="text"
            icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
            onClick={() => setAttachmentsOpen(!attachmentsOpen)} // 切换附件面板
            disabled={isStoringMessages} // 存储期间禁用附件按钮
          />
        }
        loading={loading || isStoringMessages} // 加载状态（包含存储状态）
        disabled={isStoringMessages} // 存储期间禁用输入
        className={styles.sender}
        allowSpeech={false} // 禁用语音输入以避免水合错误
        actions={(_, info) => {
          // 自定义操作按钮
          const { SendButton, LoadingButton } = info.components;
          return (
            <Flex gap={4}>
              {loading || isStoringMessages ? (
                <LoadingButton type="default" />
              ) : (
                <SendButton type="primary" />
              )}{" "}
              {/* 发送/加载按钮 */}
            </Flex>
          );
        }}
        placeholder={isStoringMessages ? "正在保存对话..." : " "} // 动态占位符
      />
    </>
  );

  // 监听消息变化，保存到历史记录
  useEffect(() => {
    // 消息历史记录模拟
    if (messages?.length && activeConversationId) {
      setMessageHistory((prev) => ({
        ...prev,
        [activeConversationId]: messages, // 将当前会话的消息保存到历史记录
      }));

      // 检查是否有新的助手消息完成
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.status !== "loading") {
        // 提取消息内容和角色
        let content = "";
        let role = "user";

        if (lastMessage.message && typeof lastMessage.message === "object") {
          content = (lastMessage.message as any).content || "";
          role = (lastMessage.message as any).role || "user";
        } else if (typeof lastMessage.message === "string") {
          content = lastMessage.message;
          role = "user"; // Default role for string messages
        }

        // 当AI消息完成时，记录日志但不重新加载（避免重复请求）
        if (role === "assistant" && content.trim()) {
          console.log("AI消息完成，已自动保存到数据库");
          // 注释掉重新加载，因为消息已经在前端显示，不需要重复从数据库加载
          // setTimeout(() => {
          //   loadSessionMessages(activeConversationId);
          // }, 500);
        }
      }
    }
  }, [messages, activeConversationId, loadSessionMessages]);

  // 显示会话错误信息（仅在操作失败时显示toast，列表错误在UI中显示）
  useEffect(() => {
    if (
      conversationError &&
      (operationLoading.creating ||
        operationLoading.deleting ||
        operationLoading.switching)
    ) {
      // 只在执行操作时显示错误toast，避免重复显示
      message.error(conversationError.message);
    }
  }, [conversationError, operationLoading]);

  // ==================== 渲染组件 =================
  return (
    <ErrorBoundary
      level="page"
      showErrorDetails={process.env.NODE_ENV === "development"}
    >
      <div className={styles.layout}>
        {chatSider} {/* 左侧边栏 */}
        <div className={styles.chat}>
          <ErrorBoundary level="feature">
            {chatList} {/* 聊天消息列表 */}
          </ErrorBoundary>
          <ErrorBoundary level="component">
            {chatSender} {/* 消息发送器 */}
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Independent;
