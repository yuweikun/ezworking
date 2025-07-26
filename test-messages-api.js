const { setupTestAuth } = require('./test-auth-setup.js');

const BASE_URL = 'http://localhost:3000/api';

// 测试用的UUID（在实际使用中应该是真实的用户和会话ID）
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440001';

async function testMessagesAPI() {
  console.log('Testing Messages API endpoints...\n');
  
  // 首先获取认证令牌
  console.log('Setting up authentication...');
  const authData = await setupTestAuth();
  if (!authData) {
    console.log('❌ Failed to get authentication token. Exiting tests.');
    return;
  }
  
  const { token, userId } = authData;
  console.log('✅ Authentication successful. Running tests with token.\n');

  // 测试1: GET /api/messages 缺少参数（应该失败）
  console.log('1. Testing GET /api/messages without parameters (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // 测试2: GET /api/messages 缺少session_id（应该失败）
  console.log('2. Testing GET /api/messages without session_id (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // 测试3: GET /api/messages 使用无效的UUID格式（应该失败）
  console.log('3. Testing GET /api/messages with invalid UUID format (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/messages?session_id=invalid-uuid`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // 测试4: GET /api/messages 使用有效参数（可能返回404因为会话不存在）
  console.log('4. Testing GET /api/messages with valid parameters');
  try {
    const response = await fetch(`${BASE_URL}/messages?session_id=${TEST_SESSION_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // 测试5: POST /api/messages 缺少必需字段（应该失败）
  console.log('5. Testing POST /api/messages with missing fields (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        role: 'user'
        // 缺少 session_id 和 content
      })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // 测试6: POST /api/messages 使用无效的role（应该失败）
  console.log('6. Testing POST /api/messages with invalid role (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        session_id: TEST_SESSION_ID,
        role: 'invalid_role',
        content: 'Test message'
      })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // 测试7: POST /api/messages 使用有效数据（可能失败因为会话不存在）
  console.log('7. Testing POST /api/messages with valid data');
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        session_id: TEST_SESSION_ID,
        role: 'user',
        content: 'This is a test message',
        work_stage: 'testing'
      })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // 测试8: 不支持的方法 PUT（应该失败）
  console.log('8. Testing unsupported method PUT /api/messages (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');
}

testMessagesAPI().catch(console.error);