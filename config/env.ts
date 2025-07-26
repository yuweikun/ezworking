// 环境变量配置
export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  AUTH_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_AUTH_TIMEOUT || '10000', 10)
} as const;

// 验证必要的环境变量
export function validateEnv() {
  const requiredEnvVars = ['NEXT_PUBLIC_API_BASE_URL'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Warning: ${envVar} is not set, using default value`);
    }
  }
}