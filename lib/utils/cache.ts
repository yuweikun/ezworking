/**
 * 缓存工具类 - 提供内存缓存和响应缓存功能
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 清理过期的缓存条目
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // 获取缓存统计信息
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 全局缓存实例
export const memoryCache = new MemoryCache(500);

// 定期清理过期缓存
if (typeof window === 'undefined') { // 只在服务端运行
  setInterval(() => {
    memoryCache.cleanup();
  }, 60000); // 每分钟清理一次
}

/**
 * 缓存装饰器 - 为函数添加缓存功能
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getCacheKey: (...args: T) => string,
  ttlSeconds: number = 300
) {
  return async (...args: T): Promise<R> => {
    const cacheKey = getCacheKey(...args);
    
    // 尝试从缓存获取
    const cached = memoryCache.get<R>(cacheKey);
    if (cached !== null) {
      // 记录缓存命中（如果性能监控可用）
      if (typeof window === 'undefined') {
        try {
          const { performanceMonitor } = await import('./performance');
          performanceMonitor.recordCacheHit();
        } catch (e) {
          // 性能监控不可用时忽略
        }
      }
      return cached;
    }

    // 记录缓存未命中
    if (typeof window === 'undefined') {
      try {
        const { performanceMonitor } = await import('./performance');
        performanceMonitor.recordCacheMiss();
      } catch (e) {
        // 性能监控不可用时忽略
      }
    }

    // 执行函数并缓存结果
    const result = await fn(...args);
    memoryCache.set(cacheKey, result, ttlSeconds);
    
    return result;
  };
}

/**
 * 会话权限检查缓存
 */
export const cachedSessionPermissionCheck = withCache(
  async (userId: string, sessionId: string) => {
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();
    
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { hasPermission: false, error: '无权访问此会话', status: 403 };
      }
      return { hasPermission: false, error: '会话查询失败', status: 500 };
    }

    if (!session) {
      return { hasPermission: false, error: '会话不存在', status: 404 };
    }

    return { hasPermission: true };
  },
  (userId: string, sessionId: string) => `session_permission:${userId}:${sessionId}`,
  60 // 缓存1分钟
);

/**
 * 用户会话列表缓存
 */
export const cachedUserSessions = withCache(
  async (userId: string, page: number, limit: number) => {
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();
    const offset = (page - 1) * limit;
    
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, user_id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return sessions || [];
  },
  (userId: string, page: number, limit: number) => `user_sessions:${userId}:${page}:${limit}`,
  30 // 缓存30秒
);

/**
 * 消息历史缓存
 */
export const cachedMessageHistory = withCache(
  async (sessionId: string, page: number, limit: number) => {
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();
    const offset = (page - 1) * limit;
    
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('role, content, work_stage, timestamp')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return messages || [];
  },
  (sessionId: string, page: number, limit: number) => `message_history:${sessionId}:${page}:${limit}`,
  60 // 缓存1分钟
);

/**
 * 缓存失效工具
 */
export const cacheInvalidation = {
  // 当会话被创建、更新或删除时，清除相关缓存
  invalidateUserSessions: (userId: string) => {
    const keys = memoryCache.getStats().keys;
    keys.forEach(key => {
      if (key.startsWith(`user_sessions:${userId}:`)) {
        memoryCache.delete(key);
      }
    });
  },

  // 当消息被创建时，清除相关缓存
  invalidateMessageHistory: (sessionId: string) => {
    const keys = memoryCache.getStats().keys;
    keys.forEach(key => {
      if (key.startsWith(`message_history:${sessionId}:`)) {
        memoryCache.delete(key);
      }
    });
  },

  // 当会话权限发生变化时，清除权限缓存
  invalidateSessionPermission: (userId: string, sessionId: string) => {
    memoryCache.delete(`session_permission:${userId}:${sessionId}`);
  },

  // 清除所有缓存
  clearAll: () => {
    memoryCache.clear();
  }
};

/**
 * HTTP 响应缓存头设置
 */
export const cacheHeaders = {
  // 短期缓存 (30秒)
  short: {
    'Cache-Control': 'public, max-age=30, s-maxage=30',
    'Vary': 'Authorization'
  },
  
  // 中期缓存 (5分钟)
  medium: {
    'Cache-Control': 'public, max-age=300, s-maxage=300',
    'Vary': 'Authorization'
  },
  
  // 长期缓存 (1小时)
  long: {
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'Vary': 'Authorization'
  },
  
  // 无缓存
  none: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};