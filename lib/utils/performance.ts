/**
 * 性能监控工具
 * 用于监控API响应时间、数据库查询性能和缓存命中率
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0
  };
  private maxMetrics: number = 1000;

  /**
   * 记录性能指标
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // 保持指标数量在限制内
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit() {
    this.cacheMetrics.hits++;
    this.cacheMetrics.totalRequests++;
    this.updateHitRate();
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss() {
    this.cacheMetrics.misses++;
    this.cacheMetrics.totalRequests++;
    this.updateHitRate();
  }

  /**
   * 更新缓存命中率
   */
  private updateHitRate() {
    if (this.cacheMetrics.totalRequests > 0) {
      this.cacheMetrics.hitRate = this.cacheMetrics.hits / this.cacheMetrics.totalRequests;
    }
  }

  /**
   * 获取性能统计
   */
  getStats() {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 300000); // 最近5分钟

    const stats = {
      totalMetrics: this.metrics.length,
      recentMetrics: recentMetrics.length,
      averageResponseTime: this.calculateAverage(recentMetrics.map(m => m.duration)),
      slowestEndpoints: this.getSlowestEndpoints(recentMetrics),
      fastestEndpoints: this.getFastestEndpoints(recentMetrics),
      cacheMetrics: { ...this.cacheMetrics },
      endpointStats: this.getEndpointStats(recentMetrics)
    };

    return stats;
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 获取最慢的端点
   */
  private getSlowestEndpoints(metrics: PerformanceMetric[], limit: number = 5) {
    return metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(m => ({ name: m.name, duration: m.duration, timestamp: m.timestamp }));
  }

  /**
   * 获取最快的端点
   */
  private getFastestEndpoints(metrics: PerformanceMetric[], limit: number = 5) {
    return metrics
      .sort((a, b) => a.duration - b.duration)
      .slice(0, limit)
      .map(m => ({ name: m.name, duration: m.duration, timestamp: m.timestamp }));
  }

  /**
   * 获取端点统计信息
   */
  private getEndpointStats(metrics: PerformanceMetric[]) {
    const endpointGroups = metrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric.duration);
      return groups;
    }, {} as Record<string, number[]>);

    const stats: Record<string, any> = {};
    
    for (const [endpoint, durations] of Object.entries(endpointGroups)) {
      stats[endpoint] = {
        count: durations.length,
        average: this.calculateAverage(durations),
        min: Math.min(...durations),
        max: Math.max(...durations),
        p95: this.calculatePercentile(durations, 0.95),
        p99: this.calculatePercentile(durations, 0.99)
      };
    }

    return stats;
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 清除所有指标
   */
  clearMetrics() {
    this.metrics = [];
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0
    };
  }

  /**
   * 导出指标数据
   */
  exportMetrics() {
    return {
      metrics: [...this.metrics],
      cacheMetrics: { ...this.cacheMetrics },
      exportedAt: new Date().toISOString()
    };
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控装饰器
 */
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      performanceMonitor.recordMetric(name, duration, {
        success: true,
        args: args.length
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      performanceMonitor.recordMetric(name, duration, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        args: args.length
      });
      
      throw error;
    }
  };
}

/**
 * 数据库查询性能监控
 */
export function withDatabaseMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  queryName: string
) {
  return withPerformanceMonitoring(fn, `db:${queryName}`);
}

/**
 * API端点性能监控
 */
export function withApiMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  endpoint: string
) {
  return withPerformanceMonitoring(fn, `api:${endpoint}`);
}

/**
 * 缓存性能监控装饰器
 */
export function withCacheMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getCacheKey: (...args: T) => string,
  cache: { get: (key: string) => R | null; set: (key: string, value: R, ttl?: number) => void },
  ttlSeconds: number = 300
) {
  return async (...args: T): Promise<R> => {
    const cacheKey = getCacheKey(...args);
    
    // 尝试从缓存获取
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      performanceMonitor.recordCacheHit();
      return cached;
    }

    // 缓存未命中，执行函数
    performanceMonitor.recordCacheMiss();
    const result = await fn(...args);
    
    // 存储到缓存
    cache.set(cacheKey, result, ttlSeconds);
    
    return result;
  };
}

/**
 * 性能报告生成器
 */
export function generatePerformanceReport() {
  const stats = performanceMonitor.getStats();
  
  const report = {
    summary: {
      totalRequests: stats.totalMetrics,
      recentRequests: stats.recentMetrics,
      averageResponseTime: Math.round(stats.averageResponseTime),
      cacheHitRate: Math.round(stats.cacheMetrics.hitRate * 100),
      generatedAt: new Date().toISOString()
    },
    performance: {
      slowestEndpoints: stats.slowestEndpoints,
      fastestEndpoints: stats.fastestEndpoints,
      endpointStats: stats.endpointStats
    },
    caching: stats.cacheMetrics,
    recommendations: generateRecommendations(stats)
  };

  return report;
}

/**
 * 生成性能优化建议
 */
function generateRecommendations(stats: any) {
  const recommendations: string[] = [];

  // 响应时间建议
  if (stats.averageResponseTime > 1000) {
    recommendations.push('平均响应时间较高，建议优化数据库查询或增加缓存');
  }

  // 缓存命中率建议
  if (stats.cacheMetrics.hitRate < 0.7) {
    recommendations.push('缓存命中率较低，建议调整缓存策略或增加缓存时间');
  }

  // 慢查询建议
  const slowEndpoints = stats.slowestEndpoints.filter((e: any) => e.duration > 2000);
  if (slowEndpoints.length > 0) {
    recommendations.push(`发现慢查询端点: ${slowEndpoints.map((e: any) => e.name).join(', ')}`);
  }

  // 端点使用频率建议
  const endpointStats = stats.endpointStats;
  for (const [endpoint, stat] of Object.entries(endpointStats)) {
    const s = stat as any;
    if (s.p95 > 1500) {
      recommendations.push(`端点 ${endpoint} 的P95响应时间较高 (${s.p95}ms)，建议优化`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('系统性能良好，无需特别优化');
  }

  return recommendations;
}

/**
 * 性能警报检查
 */
export function checkPerformanceAlerts() {
  const stats = performanceMonitor.getStats();
  const alerts: string[] = [];

  // 响应时间警报
  if (stats.averageResponseTime > 2000) {
    alerts.push(`CRITICAL: 平均响应时间过高 (${Math.round(stats.averageResponseTime)}ms)`);
  } else if (stats.averageResponseTime > 1000) {
    alerts.push(`WARNING: 平均响应时间较高 (${Math.round(stats.averageResponseTime)}ms)`);
  }

  // 缓存命中率警报
  if (stats.cacheMetrics.hitRate < 0.5) {
    alerts.push(`WARNING: 缓存命中率过低 (${Math.round(stats.cacheMetrics.hitRate * 100)}%)`);
  }

  // 慢查询警报
  const criticalSlowQueries = stats.slowestEndpoints.filter((e: any) => e.duration > 3000);
  if (criticalSlowQueries.length > 0) {
    alerts.push(`CRITICAL: 发现极慢查询: ${criticalSlowQueries.map((e: any) => `${e.name}(${e.duration}ms)`).join(', ')}`);
  }

  return alerts;
}

// 在开发环境中定期输出性能报告
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const alerts = checkPerformanceAlerts();
    if (alerts.length > 0) {
      console.warn('Performance Alerts:', alerts);
    }
  }, 30000); // 每30秒检查一次
}