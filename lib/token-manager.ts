import { STORAGE_KEYS } from '../types/constants';
import { UserInfo } from '../types/auth';
import { StorageUtils } from './storage-utils';

// Token管理工具类
export class TokenManager {
  // 保存认证token
  static setToken(token: string): void {
    StorageUtils.setItem(STORAGE_KEYS.TOKEN, token);
  }

  // 获取认证token
  static getToken(): string | null {
    return StorageUtils.getItem(STORAGE_KEYS.TOKEN);
  }

  // 移除认证token
  static removeToken(): void {
    StorageUtils.removeItem(STORAGE_KEYS.TOKEN);
  }

  // 保存用户信息
  static setUser(user: UserInfo): void {
    StorageUtils.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  // 获取用户信息
  static getUser(): UserInfo | null {
    const userStr = StorageUtils.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as UserInfo;
    } catch (error) {
      console.error('解析用户信息失败:', error);
      // 如果解析失败，清除无效数据
      StorageUtils.removeItem(STORAGE_KEYS.USER);
      return null;
    }
  }

  // 移除用户信息
  static removeUser(): void {
    StorageUtils.removeItem(STORAGE_KEYS.USER);
  }

  // 清除所有认证信息
  static clearAuth(): void {
    this.removeToken();
    this.removeUser();
  }

  // 验证token格式
  static validateToken(token: string): boolean {
    // 基础token格式验证
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Token应该不为空且长度合理
    const trimmedToken = token.trim();
    if (trimmedToken.length < 10) {
      return false;
    }
    
    return true;
  }

  // 检查是否已认证
  static isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    
    // 验证token和用户数据的完整性
    if (!token || !user) {
      return false;
    }
    
    // 验证token格式
    if (!this.validateToken(token)) {
      this.clearAuth();
      return false;
    }
    
    // 确保用户数据包含必要字段
    if (!user.id || !user.email) {
      // 数据不完整，清除无效数据
      this.clearAuth();
      return false;
    }
    
    return true;
  }
}