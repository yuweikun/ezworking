'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthContextType, UserInfo } from '../types/auth';
import { TokenManager } from '../lib/token-manager';
import { AuthService } from '../services/auth-service';
import { ErrorMapper } from '../services/error-mapper';

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider组件的Props类型
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider组件
export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  // 初始化认证状态
  useEffect(() => {
    setMounted(true);
    initializeAuth();
  }, []);

  // 初始化认证状态函数
  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // 确保只在客户端执行
      if (typeof window === 'undefined') {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // 使用TokenManager的isAuthenticated方法进行完整验证
      if (TokenManager.isAuthenticated()) {
        const validToken = TokenManager.getToken();
        const validUser = TokenManager.getUser();
        
        if (validToken && validUser) {
          setIsAuthenticated(true);
          setUser(validUser);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('初始化认证状态失败:', error);
      // 清除可能损坏的数据
      if (typeof window !== 'undefined') {
        TokenManager.clearAuth();
      }
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 登录函数
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);

      // 客户端验证
      const validationError = AuthService.validateLoginForm(email, password);
      if (validationError) {
        throw new Error(validationError);
      }

      // 调用登录API
      const response = await AuthService.login(email, password);

      // 验证响应数据完整性
      if (!response.token || !response.user || !response.user.id || !response.user.email) {
        throw new Error('服务器返回数据不完整');
      }

      // 保存认证信息
      TokenManager.setToken(response.token);
      TokenManager.setUser(response.user);

      // 更新状态
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error: any) {
      // 确保在错误情况下清除可能的部分数据
      TokenManager.clearAuth();
      setIsAuthenticated(false);
      setUser(null);
      
      // 处理错误
      const errorMessage = error.message || ErrorMapper.getLoginErrorMessage(error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 注册函数
  const register = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);

      // 客户端验证
      const validationError = AuthService.validateRegisterForm(email, password);
      if (validationError) {
        throw new Error(validationError);
      }

      // 调用注册API
      const response = await AuthService.register(email, password);

      // 验证响应数据完整性
      if (!response.token || !response.user || !response.user.id || !response.user.email) {
        throw new Error('服务器返回数据不完整');
      }

      // 保存认证信息
      TokenManager.setToken(response.token);
      TokenManager.setUser(response.user);

      // 更新状态
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error: any) {
      // 检查是否是邮箱确认错误
      if (error.requiresEmailConfirmation) {
        // 邮箱确认错误不清除状态，只是抛出错误让UI处理
        throw error;
      }
      
      // 其他错误情况下清除可能的部分数据
      TokenManager.clearAuth();
      setIsAuthenticated(false);
      setUser(null);
      
      // 处理错误
      const errorMessage = error.message || ErrorMapper.getRegisterErrorMessage(error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 退出登录函数
  const logout = (): void => {
    try {
      setLoading(true);
      
      // 清除本地存储
      TokenManager.clearAuth();

      // 更新状态
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('退出登录失败:', error);
      // 即使出错也要确保状态被重置
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 检查认证状态函数（用于手动刷新状态）
  const checkAuthStatus = (): void => {
    initializeAuth();
  };

  // 上下文值
  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    loading: loading || !mounted, // 在组件挂载前保持loading状态
    login,
    register,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证上下文的Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  
  return context;
}