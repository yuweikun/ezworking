import { ApiError } from '../types/auth';
import { ERROR_MESSAGES } from '../types/constants';

// 错误映射工具类
export class ErrorMapper {
  /**
   * 将API错误映射为用户友好的错误信息
   * @param error API错误对象
   * @returns string 用户友好的错误信息
   */
  static mapAuthError(error: ApiError): string {
    // 如果错误已经有中文消息，直接返回
    if (error.message && this.isChineseMessage(error.message)) {
      return error.message;
    }

    // 根据错误代码映射为中文消息
    switch (error.code) {
      case 'NETWORK_ERROR':
        return ERROR_MESSAGES.NETWORK_ERROR;
      
      case 'UNAUTHORIZED':
      case 'BAD_REQUEST':
        return ERROR_MESSAGES.INVALID_CREDENTIALS;
      
      case 'CONFLICT':
        return ERROR_MESSAGES.EMAIL_EXISTS;
      
      case 'VALIDATION_ERROR':
        // 尝试解析具体的验证错误
        return this.parseValidationError(error.message) || ERROR_MESSAGES.INVALID_EMAIL;
      
      case 'SERVER_ERROR':
      case 'UNKNOWN_ERROR':
      default:
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  /**
   * 检查消息是否为中文
   * @param message 错误消息
   * @returns boolean 是否包含中文字符
   */
  private static isChineseMessage(message: string): boolean {
    return /[\u4e00-\u9fa5]/.test(message);
  }

  /**
   * 解析验证错误消息
   * @param message 原始错误消息
   * @returns string | null 解析后的错误消息
   */
  private static parseValidationError(message: string): string | null {
    if (!message) return null;

    // 常见的英文错误消息映射
    const errorMappings: Record<string, string> = {
      'invalid email': ERROR_MESSAGES.INVALID_EMAIL,
      'email already exists': ERROR_MESSAGES.EMAIL_EXISTS,
      'password too short': ERROR_MESSAGES.WEAK_PASSWORD,
      'invalid credentials': ERROR_MESSAGES.INVALID_CREDENTIALS,
      'user not found': ERROR_MESSAGES.INVALID_CREDENTIALS,
      'incorrect password': ERROR_MESSAGES.INVALID_CREDENTIALS,
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [key, value] of Object.entries(errorMappings)) {
      if (lowerMessage.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * 获取登录相关的错误提示
   * @param error API错误对象
   * @returns string 登录错误提示
   */
  static getLoginErrorMessage(error: ApiError): string {
    if (error.code === 'UNAUTHORIZED' || error.code === 'BAD_REQUEST') {
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    }
    
    return this.mapAuthError(error);
  }

  /**
   * 获取注册相关的错误提示
   * @param error API错误对象
   * @returns string 注册错误提示
   */
  static getRegisterErrorMessage(error: ApiError): string {
    if (error.code === 'CONFLICT') {
      return ERROR_MESSAGES.EMAIL_EXISTS;
    }
    
    return this.mapAuthError(error);
  }
}