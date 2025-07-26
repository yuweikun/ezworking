const BASE_URL = 'http://localhost:3000/api';

// 测试用户凭据
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

async function setupTestAuth() {
  console.log('Setting up test authentication...\n');

  // 首先尝试注册测试用户
  console.log('1. Registering test user...');
  try {
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER)
    });
    const registerData = await registerResponse.json();
    console.log('Register Status:', registerResponse.status);
    console.log('Register Response:', JSON.stringify(registerData, null, 2));
  } catch (error) {
    console.log('Register Error:', error.message);
  }
  console.log('');

  // 然后尝试登录获取令牌
  console.log('2. Logging in to get access token...');
  try {
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    const loginData = await loginResponse.json();
    console.log('Login Status:', loginResponse.status);
    console.log('Login Response:', JSON.stringify(loginData, null, 2));
    
    if (loginData.success && loginData.data.session) {
      console.log('\n✅ Authentication successful!');
      console.log('Access Token:', loginData.data.session.access_token);
      console.log('User ID:', loginData.data.user.id);
      
      // 保存令牌到环境变量或文件中供其他测试使用
      return {
        token: loginData.data.session.access_token,
        userId: loginData.data.user.id
      };
    }
  } catch (error) {
    console.log('Login Error:', error.message);
  }
  
  return null;
}

// 如果直接运行此脚本
if (require.main === module) {
  setupTestAuth().catch(console.error);
}

module.exports = { setupTestAuth, TEST_USER };