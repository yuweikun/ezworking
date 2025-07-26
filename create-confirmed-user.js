// 创建已确认的测试用户
const { createClient } = require('@supabase/supabase-js');

// 直接设置配置（从.env.local文件中复制）
const supabaseUrl = 'https://novplbcuamgnlgarolly.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdnBsYmN1YW1nbmxnYXJvbGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1NTYxMiwiZXhwIjoyMDY5MDMxNjEyfQ.S5bZjiylC2llDFFefoONze_JhRVRYuYOcUJ7_SdH_gA';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 缺少必要的环境变量');
  process.exit(1);
}

const createAdminSupabaseClient = () => {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

async function createConfirmedUser() {
  try {
    console.log('🔧 创建已确认的测试用户...');
    
    const supabase = createAdminSupabaseClient();
    
    // 使用管理员权限创建用户
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: '123456',
      email_confirm: true, // 直接确认邮箱
      user_metadata: {
        name: 'Test User'
      }
    });
    
    if (error) {
      console.error('❌ 创建用户失败:', error);
      return;
    }
    
    console.log('✅ 用户创建成功:', {
      id: user.user.id,
      email: user.user.email,
      confirmed: user.user.email_confirmed_at ? '已确认' : '未确认'
    });
    
    // 测试登录
    console.log('\n🔍 测试登录...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: '123456'
    });
    
    if (loginError) {
      console.error('❌ 登录测试失败:', loginError);
      return;
    }
    
    console.log('✅ 登录测试成功:', {
      token: loginData.session.access_token.substring(0, 20) + '...',
      user: loginData.user.email
    });
    
    return {
      user: user.user,
      token: loginData.session.access_token
    };
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createConfirmedUser().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { createConfirmedUser };