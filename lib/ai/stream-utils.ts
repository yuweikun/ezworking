/**
 * 流式响应处理工具
 */

import { StreamChunk } from './types';

/**
 * 创建流式响应包装器
 * 确保第一个chunk包含workflowState，最后一个chunk包含finished
 */
export async function* createStreamWrapper(
  responseStream: AsyncGenerator<StreamChunk>,
  initialWorkflowState?: any
): AsyncGenerator<StreamChunk> {
  let isFirstChunk = true;
  let chunks: StreamChunk[] = [];
  
  try {
    for await (const chunk of responseStream) {
      chunks.push(chunk);
    }
    
    if (chunks.length === 0) {
      yield {
        content: '',
        workflowState: initialWorkflowState || null,
        finished: true
      };
      return;
    }
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLastChunk = i === chunks.length - 1;
      
      yield {
        content: chunk.content || '',
        workflowState: isFirstChunk ? (chunk.workflowState !== undefined ? chunk.workflowState : (initialWorkflowState || null)) : undefined,
        finished: isLastChunk ? true : undefined
      };
      
      isFirstChunk = false;
    }
  } catch (error: any) {
    yield {
      content: `处理失败: ${error.message}`,
      workflowState: initialWorkflowState || null,
      finished: true
    };
  }
}

/**
 * 创建ReadableStream用于HTTP响应
 */
export function createStreamResponse(
  responseStream: AsyncGenerator<StreamChunk>,
  onComplete?: (fullContent: string, finalWorkflowState: any) => Promise<void>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      let fullContent = '';
      let finalWorkflowState: any = null;
      
      try {
        const wrappedStream = createStreamWrapper(responseStream);
        
        for await (const chunk of wrappedStream) {
          // 收集内容
          if (chunk.content) {
            fullContent += chunk.content;
          }
          
          // 保存最终状态
          if (chunk.finished && chunk.workflowState !== undefined) {
            finalWorkflowState = chunk.workflowState;
          }
          
          const data = JSON.stringify(chunk);
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        }
        
        // 调用完成回调
        if (onComplete) {
          await onComplete(fullContent, finalWorkflowState);
        }
        
        controller.close();
      } catch (error: any) {
        const errorChunk: StreamChunk = {
          content: `流式响应失败: ${error.message}`,
          workflowState: null,
          finished: true
        };
        
        const data = JSON.stringify(errorChunk);
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        controller.close();
      }
    }
  });
}

/**
 * 收集流式响应的完整内容
 */
export async function collectStreamContent(
  responseStream: AsyncGenerator<StreamChunk>
): Promise<{ content: string; workflowState: any }> {
  let fullContent = '';
  let finalWorkflowState = null;

  for await (const chunk of responseStream) {
    if (chunk.content) {
      fullContent += chunk.content;
    }
    
    if (chunk.finished && chunk.workflowState !== undefined) {
      finalWorkflowState = chunk.workflowState;
    }
  }

  return {
    content: fullContent,
    workflowState: finalWorkflowState
  };
}/**

 * 验证流式响应块的格式
 */
export function validateStreamChunk(chunk: any): chunk is StreamChunk {
  return (
    typeof chunk === 'object' &&
    chunk !== null &&
    (chunk.content === undefined || typeof chunk.content === 'string') &&
    (chunk.finished === undefined || typeof chunk.finished === 'boolean') &&
    (chunk.workflowState === undefined || chunk.workflowState === null || typeof chunk.workflowState === 'object')
  );
}

/**
 * 创建Server-Sent Events格式的流式响应
 */
export async function* createSSEStream(
  responseStream: AsyncGenerator<StreamChunk>,
  initialWorkflowState?: any
): AsyncGenerator<string> {
  let isFirstChunk = true;
  
  try {
    for await (const chunk of responseStream) {
      if (isFirstChunk) {
        const firstChunk: StreamChunk = {
          content: chunk.content || '',
          finished: chunk.finished || false,
          workflowState: chunk.workflowState !== undefined ? chunk.workflowState : (initialWorkflowState || null)
        };
        
        yield `data: ${JSON.stringify(firstChunk)}\n\n`;
        isFirstChunk = false;
      } else {
        yield `data: ${JSON.stringify(chunk)}\n\n`;
      }
    }
  } catch (error: any) {
    const errorChunk: StreamChunk = {
      content: `处理失败: ${error.message}`,
      finished: true,
      workflowState: isFirstChunk ? (initialWorkflowState || null) : null
    };
    yield `data: ${JSON.stringify(errorChunk)}\n\n`;
  }
}