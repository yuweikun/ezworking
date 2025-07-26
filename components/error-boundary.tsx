'use client';

import React, { Component, ReactNode } from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { ErrorHandler } from '../lib/error-handler';

// 错误边界状态类型
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
}

// 错误边界属性类型
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  showErrorDetails?: boolean;
  level?: 'page' | 'component' | 'feature';
}

// 样式定义
const useStyles = createStyles(({ token, css }) => ({
  errorContainer: css`
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background: ${token.colorBgContainer};
  `,
  errorDetails: css`
    margin-top: 16px;
    padding: 16px;
    background: ${token.colorFillAlter};
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorder};
    max-height: 200px;
    overflow-y: auto;
    font-family: ${token.fontFamilyCode};
    font-size: 12px;
    color: ${token.colorTextSecondary};
    white-space: pre-wrap;
    word-break: break-all;
  `,
  actionButtons: css`
    display: flex;
    gap: 12px;
    margin-top: 24px;
    justify-content: center;
    flex-wrap: wrap;
  `,
  compactError: css`
    padding: 20px;
    text-align: center;
    background: ${token.colorErrorBg};
    border: 1px solid ${token.colorErrorBorder};
    border-radius: ${token.borderRadius}px;
    margin: 16px 0;
  `,
  compactErrorTitle: css`
    color: ${token.colorError};
    font-weight: 500;
    margin-bottom: 8px;
  `,
  compactErrorMessage: css`
    color: ${token.colorTextSecondary};
    font-size: 14px;
    margin-bottom: 12px;
  `
}));

/**
 * 错误边界组件
 * 捕获子组件中的JavaScript错误，显示友好的错误界面
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新状态以显示错误界面
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // 更新错误信息
    this.setState({
      errorInfo
    });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 使用统一的错误处理器
    ErrorHandler.handleComponentError(error, errorInfo);

    // 记录错误到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  // 重试处理
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  // 刷新页面
  handleRefresh = () => {
    window.location.reload();
  };

  // 返回首页
  handleGoHome = () => {
    window.location.href = '/';
  };

  // 渲染错误界面
  renderError() {
    const { level = 'component', showErrorDetails = false } = this.props;
    const { error, errorInfo, errorId } = this.state;

    // 根据错误级别选择不同的显示方式
    if (level === 'component') {
      return <CompactErrorDisplay 
        error={error} 
        onRetry={this.handleRetry}
        errorId={errorId}
      />;
    }

    return (
      <FullErrorDisplay
        error={error}
        errorInfo={errorInfo}
        errorId={errorId}
        showErrorDetails={showErrorDetails}
        onRetry={this.handleRetry}
        onRefresh={this.handleRefresh}
        onGoHome={this.handleGoHome}
        level={level}
      />
    );
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 否则显示默认错误界面
      return this.renderError();
    }

    return this.props.children;
  }
}

/**
 * 紧凑型错误显示组件（用于组件级错误）
 */
function CompactErrorDisplay({ 
  error, 
  onRetry, 
  errorId 
}: { 
  error: Error | null; 
  onRetry: () => void;
  errorId: string;
}) {
  const { styles } = useStyles();

  return (
    <div className={styles.compactError}>
      <div className={styles.compactErrorTitle}>
        ⚠️ 组件加载失败
      </div>
      <div className={styles.compactErrorMessage}>
        {error?.message || '组件遇到了一些问题'}
      </div>
      <Button 
        size="small" 
        type="primary" 
        icon={<ReloadOutlined />}
        onClick={onRetry}
      >
        重试
      </Button>
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#999' }}>
          错误ID: {errorId}
        </div>
      )}
    </div>
  );
}

/**
 * 完整错误显示组件（用于页面级错误）
 */
function FullErrorDisplay({
  error,
  errorInfo,
  errorId,
  showErrorDetails,
  onRetry,
  onRefresh,
  onGoHome,
  level
}: {
  error: Error | null;
  errorInfo: any;
  errorId: string;
  showErrorDetails: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  onGoHome: () => void;
  level: string;
}) {
  const { styles } = useStyles();

  const getTitle = () => {
    switch (level) {
      case 'page':
        return '页面加载失败';
      case 'feature':
        return '功能暂时不可用';
      default:
        return '出现了一些问题';
    }
  };

  const getSubTitle = () => {
    if (error?.message) {
      return error.message;
    }
    
    switch (level) {
      case 'page':
        return '页面遇到了技术问题，请尝试刷新页面或稍后再试';
      case 'feature':
        return '该功能暂时不可用，请尝试其他操作或稍后再试';
      default:
        return '应用遇到了一些问题，请尝试重新加载';
    }
  };

  return (
    <div className={styles.errorContainer}>
      <Result
        status="error"
        title={getTitle()}
        subTitle={getSubTitle()}
        extra={
          <div>
            <div className={styles.actionButtons}>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={level === 'page' ? onRefresh : onRetry}
              >
                {level === 'page' ? '刷新页面' : '重试'}
              </Button>
              
              {level === 'page' && (
                <Button 
                  icon={<HomeOutlined />}
                  onClick={onGoHome}
                >
                  返回首页
                </Button>
              )}
            </div>

            {/* 开发环境显示错误详情 */}
            {(showErrorDetails || process.env.NODE_ENV === 'development') && error && (
              <details style={{ marginTop: '24px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '12px' }}>
                  🔍 错误详情 (错误ID: {errorId})
                </summary>
                <div className={styles.errorDetails}>
                  <div><strong>错误消息:</strong></div>
                  <div>{error.message}</div>
                  
                  <div style={{ marginTop: '12px' }}><strong>错误堆栈:</strong></div>
                  <div>{error.stack}</div>
                  
                  {errorInfo?.componentStack && (
                    <>
                      <div style={{ marginTop: '12px' }}><strong>组件堆栈:</strong></div>
                      <div>{errorInfo.componentStack}</div>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        }
      />
    </div>
  );
}

/**
 * 高阶组件：为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook：在函数组件中使用错误边界
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    ErrorHandler.handleComponentError(error, { componentStack: 'Function Component' });
  }, []);

  // 如果有错误，抛出它以便错误边界捕获
  if (error) {
    throw error;
  }

  return { handleError, resetError };
}