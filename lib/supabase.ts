import { createClient } from '@supabase/supabase-js'
import { validateEnvVars, env } from './env'
import type { Database } from './types'

// 验证环境变量
validateEnvVars()

const supabaseUrl = env.supabaseUrl
const supabaseAnonKey = env.supabaseAnonKey

// 客户端实例 - 用于客户端组件
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 服务端实例 - 用于API路由，优化连接配置
export const createServerSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: 'public'
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js-web'
      }
    }
  })
}

// 管理员客户端 - 用于需要服务角色的操作
export const createAdminSupabaseClient = () => {
  const serviceRoleKey = env.supabaseServiceRoleKey
  
  if (!serviceRoleKey) {
    throw new Error('Missing Supabase service role key')
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export default supabase