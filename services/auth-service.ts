import { httpClient } from "../lib";
import { API_ENDPOINTS } from "../types/constants";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiError,
} from "../types/auth";

// 认证API服务类
export class AuthService {
  /**
   * 用户登录
   * @param email 邮箱地址
   * @param password 密码
   * @returns Promise<AuthResponse> 认证响应
   */
  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const loginData: LoginRequest = { email, password };

      const response = await httpClient.post<{
        success: boolean;
        data: AuthResponse;
      }>(API_ENDPOINTS.LOGIN, loginData);

      // 从包装的响应中提取实际数据
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error("服务器返回数据格式错误");
      }
    } catch (error) {
      // 错误已经在http-client中统一处理，直接抛出
      throw error as ApiError;
    }
  }

  /**
   * 用户注册
   * @param email 邮箱地址
   * @param password 密码
   * @returns Promise<AuthResponse> 认证响应
   */
  static async register(
    email: string,
    password: string
  ): Promise<AuthResponse> {
    try {
      const registerData: RegisterRequest = { email, password };

      const response = await httpClient.post<{ success: boolean; data: any }>(
        API_ENDPOINTS.REGISTER,
        registerData
      );

      // 从包装的响应中提取实际数据
      if (response.data.success && response.data.data) {
        const data = response.data.data;

        // 检查是否需要邮箱确认
        if (data.requiresEmailConfirmation) {
          // 创建一个特殊的错误类型来区分邮箱确认错误
          const confirmationError = new Error(
            data.message || "请检查您的邮箱并点击确认链接完成注册"
          );
          (confirmationError as any).requiresEmailConfirmation = true;
          throw confirmationError;
        }

        // 验证返回的数据结构
        if (!data.token || !data.user || !data.user.id || !data.user.email) {
          throw new Error("服务器返回数据不完整");
        }

        return data as AuthResponse;
      } else {
        throw new Error("服务器返回数据格式错误");
      }
    } catch (error) {
      // 错误已经在http-client中统一处理，直接抛出
      throw error as ApiError;
    }
  }

  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   * @returns boolean 是否为有效邮箱
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证密码强度
   * @param password 密码
   * @returns boolean 是否为有效密码
   */
  static validatePassword(password: string): boolean {
    // 密码至少6位字符
    return password.length >= 6;
  }

  /**
   * 验证登录表单
   * @param email 邮箱
   * @param password 密码
   * @returns string | null 错误信息，null表示验证通过
   */
  static validateLoginForm(email: string, password: string): string | null {
    if (!email.trim()) {
      return "请输入邮箱地址";
    }

    if (!this.validateEmail(email)) {
      return "请输入有效的邮箱地址";
    }

    if (!password.trim()) {
      return "请输入密码";
    }

    return null;
  }

  /**
   * 验证注册表单
   * @param email 邮箱
   * @param password 密码
   * @returns string | null 错误信息，null表示验证通过
   */
  static validateRegisterForm(email: string, password: string): string | null {
    if (!email.trim()) {
      return "请输入邮箱地址";
    }

    if (!this.validateEmail(email)) {
      return "请输入有效的邮箱地址";
    }

    if (!password.trim()) {
      return "请输入密码";
    }

    if (!this.validatePassword(password)) {
      return "密码至少需要6位字符";
    }

    return null;
  }
}
