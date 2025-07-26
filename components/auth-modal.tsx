'use client';

import React, { useState } from 'react';
import { createStyles } from 'antd-style';
import { useAuth } from '../contexts/auth-context';

// 认证模式类型
type AuthMode = 'login' | 'register';

// 组件Props类型
interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

// 样式定义
const useStyles = createStyles(({ token, css }) => ({
  overlay: css`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `,
  modal: css`
    background: ${token.colorBgElevated};
    border-radius: ${token.borderRadius}px;
    box-shadow: ${token.boxShadowSecondary};
    width: 400px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    position: relative;
    margin: 16px;

    /* 响应式设计 */
    @media (max-width: 768px) {
      width: 100%;
      max-width: calc(100vw - 32px);
      margin: 16px;
    }

    @media (max-width: 480px) {
      width: 100%;
      max-width: calc(100vw - 24px);
      margin: 12px;
      border-radius: ${Math.max(token.borderRadius - 2, 4)}px;
    }

    @media (max-height: 600px) {
      max-height: calc(100vh - 32px);
    }

    /* 入场动画 */
    animation: modalSlideIn 0.3s ease-out;

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `,
  header: css`
    padding: 24px 24px 0 24px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    margin-bottom: 24px;

    /* 响应式设计 */
    @media (max-width: 480px) {
      padding: 20px 20px 0 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 360px) {
      padding: 16px 16px 0 16px;
      margin-bottom: 16px;
    }
  `,
  title: css`
    font-size: 20px;
    font-weight: 600;
    color: ${token.colorText};
    margin: 0 0 16px 0;
    text-align: center;

    /* 响应式设计 */
    @media (max-width: 480px) {
      font-size: 18px;
      margin: 0 0 14px 0;
    }

    @media (max-width: 360px) {
      font-size: 16px;
      margin: 0 0 12px 0;
    }
  `,
  modeSwitch: css`
    display: flex;
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadius}px;
    padding: 4px;
    margin-bottom: 16px;
  `,
  modeButton: css`
    flex: 1;
    padding: 8px 16px;
    border: none;
    background: transparent;
    border-radius: ${token.borderRadius - 2}px;
    cursor: pointer;
    font-size: 14px;
    color: ${token.colorTextSecondary};
    transition: all 0.2s;

    &:hover {
      color: ${token.colorText};
    }

    &.active {
      background: ${token.colorBgElevated};
      color: ${token.colorPrimary};
      box-shadow: ${token.boxShadowTertiary};
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,
  content: css`
    padding: 0 24px 24px 24px;

    /* 响应式设计 */
    @media (max-width: 480px) {
      padding: 0 20px 20px 20px;
    }

    @media (max-width: 360px) {
      padding: 0 16px 16px 16px;
    }
  `,
  closeButton: css`
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextSecondary};
    font-size: 16px;
    transition: all 0.2s;

    &:hover {
      background: ${token.colorFillSecondary};
      color: ${token.colorText};
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,
  form: css`
    display: flex;
    flex-direction: column;
    gap: 16px;

    /* 响应式设计 */
    @media (max-width: 480px) {
      gap: 14px;
    }

    @media (max-width: 360px) {
      gap: 12px;
    }
  `,
  formGroup: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  label: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  input: css`
    padding: 12px 16px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
    font-size: 14px;
    color: ${token.colorText};
    background: ${token.colorBgContainer};
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: ${token.colorPrimary};
      box-shadow: 0 0 0 2px ${token.colorPrimary}20;
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }

    &::placeholder {
      color: ${token.colorTextPlaceholder};
    }

    &.error {
      border-color: ${token.colorError};
    }

    /* 响应式设计 */
    @media (max-width: 480px) {
      padding: 10px 14px;
      font-size: 16px; /* 防止iOS缩放 */
    }

    @media (max-width: 360px) {
      padding: 8px 12px;
    }
  `,
  errorMessage: css`
    font-size: 12px;
    color: ${token.colorError};
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    animation: slideIn 0.2s ease-out;
    line-height: 1.4;

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    &::before {
      content: '⚠';
      font-size: 10px;
      flex-shrink: 0;
    }

    /* 响应式设计 */
    @media (max-width: 480px) {
      font-size: 11px;
    }
  `,
  submitButton: css`
    padding: 12px 24px;
    border: none;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 8px;
    width: 100%;
    min-height: 44px; /* 确保触摸友好 */

    &:hover {
      background: ${token.colorPrimaryHover};
    }

    &:disabled {
      background: ${token.colorBgTextActive};
      cursor: not-allowed;
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }

    /* 响应式设计 */
    @media (max-width: 480px) {
      padding: 14px 24px;
      font-size: 16px;
      min-height: 48px; /* 移动端更大的触摸区域 */
    }

    @media (max-width: 360px) {
      padding: 12px 20px;
      min-height: 44px;
    }
  `,
  loadingSpinner: css`
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 8px;

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `,
  successMessage: css`
    font-size: 12px;
    color: ${token.colorSuccess};
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    animation: slideIn 0.2s ease-out;
    line-height: 1.4;

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    &::before {
      content: '✓';
      font-size: 10px;
      flex-shrink: 0;
    }

    /* 响应式设计 */
    @media (max-width: 480px) {
      font-size: 11px;
    }
  `,
  submitErrorMessage: css`
    font-size: 13px;
    color: ${token.colorError};
    text-align: center;
    margin-top: 8px;
    padding: 8px 12px;
    background: ${token.colorErrorBg};
    border: 1px solid ${token.colorErrorBorder};
    border-radius: ${token.borderRadius}px;
    animation: slideIn 0.2s ease-out;
    line-height: 1.4;

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* 响应式设计 */
    @media (max-width: 480px) {
      font-size: 12px;
      padding: 6px 10px;
    }
  `,
}));

// 表单验证函数
const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return '请输入邮箱地址';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '请输入有效的邮箱地址';
  }
  
  return null;
};

const validatePassword = (password: string, isRegister: boolean = false): string | null => {
  if (!password) {
    return '请输入密码';
  }
  
  if (isRegister && password.length < 6) {
    return '密码至少需要6位字符';
  }
  
  return null;
};

// 表单组件Props类型
interface AuthFormProps {
  mode: AuthMode;
  onClose: () => void;
}

// AuthForm组件
function AuthForm({ mode, onClose }: AuthFormProps) {
  const { styles } = useStyles();
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 重置表单状态
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setEmailError(null);
    setPasswordError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  };

  // 当模式切换时重置表单
  React.useEffect(() => {
    resetForm();
  }, [mode]);

  // 验证单个字段
  const validateField = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      const error = validateEmail(value);
      setEmailError(error);
      return !error;
    } else {
      const error = validatePassword(value, mode === 'register');
      setPasswordError(error);
      return !error;
    }
  };

  // 处理输入变化
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // 清除错误状态
    if (emailError) {
      setEmailError(null);
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    
    // 清除错误状态
    if (passwordError) {
      setPasswordError(null);
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证所有字段
    const isEmailValid = validateField('email', email);
    const isPasswordValid = validateField('password', password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (mode === 'login') {
        await login(email, password);
        // 登录成功后关闭弹窗
        onClose();
        resetForm();
      } else {
        await register(email, password);
        // 注册成功后关闭弹窗
        onClose();
        resetForm();
      }
    } catch (error: any) {
      console.error(`${mode} error:`, error);
      
      // 特殊处理邮箱确认的情况
      if (error.requiresEmailConfirmation) {
        setSubmitError(error.message);
        // 邮箱确认情况下不关闭弹窗，让用户看到提示信息
      } else {
        setSubmitError(error.message || `${mode === 'login' ? '登录' : '注册'}失败，请重试`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理Enter键提交
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* 邮箱输入 */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="email">
          邮箱地址
        </label>
        <input
          id="email"
          type="email"
          className={`${styles.input} ${emailError ? 'error' : ''}`}
          placeholder="请输入邮箱地址"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => validateField('email', email)}
          onKeyPress={handleKeyPress}
          disabled={isSubmitting}
          autoComplete="email"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'email-error' : undefined}
          required
        />
        {emailError && (
          <div className={styles.errorMessage} id="email-error" role="alert">
            {emailError}
          </div>
        )}
      </div>

      {/* 密码输入 */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="password">
          密码
        </label>
        <input
          id="password"
          type="password"
          className={`${styles.input} ${passwordError ? 'error' : ''}`}
          placeholder={mode === 'register' ? '请输入密码（至少6位）' : '请输入密码'}
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => validateField('password', password)}
          onKeyPress={handleKeyPress}
          disabled={isSubmitting}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? 'password-error' : undefined}
          required
        />
        {passwordError && (
          <div className={styles.errorMessage} id="password-error" role="alert">
            {passwordError}
          </div>
        )}
      </div>

      {/* 提交错误信息 */}
      {submitError && (
        <div className={styles.submitErrorMessage} role="alert" aria-live="polite">
          {submitError}
        </div>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting || !email || !password}
      >
        {isSubmitting && <span className={styles.loadingSpinner} />}
        {isSubmitting 
          ? (mode === 'login' ? '登录中...' : '注册中...') 
          : (mode === 'login' ? '登录' : '注册')
        }
      </button>
    </form>
  );
}

// AuthModal组件
export function AuthModal({ open, onClose }: AuthModalProps) {
  const { styles } = useStyles();
  const [mode, setMode] = useState<AuthMode>('login');
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  // 处理遮罩层点击
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 焦点管理和键盘事件处理
  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (open) {
      // 保存当前焦点元素
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // 添加事件监听器
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('keydown', handleTabKey);
      
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
      
      // 延迟聚焦到第一个输入框
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector('input') as HTMLInputElement;
        firstInput?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'unset';
      
      // 恢复之前的焦点
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [open, onClose]);

  // 如果弹窗未打开，不渲染
  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* 关闭按钮 */}
        <button 
          className={styles.closeButton} 
          onClick={onClose}
          aria-label="关闭弹窗"
          type="button"
        >
          ×
        </button>

        {/* 头部 */}
        <div className={styles.header}>
          <h2 className={styles.title} id="modal-title">
            {mode === 'login' ? '登录账户' : '注册账户'}
          </h2>
          
          {/* 模式切换 */}
          <div className={styles.modeSwitch}>
            <button
              className={`${styles.modeButton} ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              登录
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >
              注册
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className={styles.content}>
          <AuthForm mode={mode} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}