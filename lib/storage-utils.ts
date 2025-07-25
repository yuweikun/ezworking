// 安全的localStorage操作工具
export class StorageUtils {
  // 检查是否在浏览器环境
  private static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // 安全地获取localStorage项
  static getItem(key: string): string | null {
    if (!this.isBrowser()) {
      return null;
    }
    
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`获取localStorage项失败 (${key}):`, error);
      return null;
    }
  }

  // 安全地设置localStorage项
  static setItem(key: string, value: string): boolean {
    if (!this.isBrowser()) {
      return false;
    }
    
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`设置localStorage项失败 (${key}):`, error);
      return false;
    }
  }

  // 安全地移除localStorage项
  static removeItem(key: string): boolean {
    if (!this.isBrowser()) {
      return false;
    }
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`移除localStorage项失败 (${key}):`, error);
      return false;
    }
  }

  // 安全地清除所有localStorage项
  static clear(): boolean {
    if (!this.isBrowser()) {
      return false;
    }
    
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('清除localStorage失败:', error);
      return false;
    }
  }
}