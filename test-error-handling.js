/**
 * 测试增强的错误处理和响应标准化
 * 验证所有API端点的错误处理是否符合要求
 */

const BASE_URL = 'http://localhost:3000';

// 测试用例配置
const testCases = [
  {
    name: '测试无效JSON格式',
    endpoint: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ invalid json }',
    expectedStatus: 400,
    expectedError: 'INVALID_JSON'
  },
  {
    name: '测试缺少必需字段',
    endpoint: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: '测试邮箱格式无效',
    endpoint: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid-email', password: 'password123' }),
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: '测试不支持的HTTP方法',
    endpoint: '/api/auth/login',
    method: 'GET',
    expectedStatus: 405,
    expectedError: 'METHOD_NOT_ALLOWED'
  },
  {
    name: '测试无效的UUID格式',
    endpoint: '/api/messages?session_id=invalid-uuid',
    method: 'GET',
    expectedStatus: 400,
    expectedError: 'INVALID_PARAMS'
  },
  {
    name: '测试缺少查询参数',
    endpoint: '/api/messages',
    method: 'GET',
    expectedStatus: 400,
    expectedError: 'INVALID_PARAMS'
  },
  {
    name: '测试未授权访问',
    endpoint: '/api/sessions',
    method: 'GET',
    expectedStatus: 401,
    expectedError: 'UNAUTHORIZED'
  }
];

/**
 * 执行单个测试用例
 */
async function runTestCase(testCase) {
  try {
    console.log(`\n🧪 ${testCase.name}`);
    
    const options = {
      method: testCase.method,
      headers: testCase.headers || {}
    };
    
    if (testCase.body && testCase.method !== 'GET') {
      if (testCase.body.startsWith('{') && !testCase.body.includes('invalid')) {
        options.body = testCase.body;
      } else {
        // 对于无效JSON测试，直接发送原始字符串
        options.body = testCase.body;
      }
    }
    
    const response = await fetch(`${BASE_URL}${testCase.endpoint}`, options);
    const data = await response.json();
    
    // 验证响应状态码
    if (response.status !== testCase.expectedStatus) {
      console.log(`❌ 状态码不匹配: 期望 ${testCase.expectedStatus}, 实际 ${response.status}`);
      return false;
    }
    
    // 验证错误代码
    if (data.error !== testCase.expectedError) {
      console.log(`❌ 错误代码不匹配: 期望 ${testCase.expectedError}, 实际 ${data.error}`);
      return false;
    }
    
    // 验证响应结构
    const requiredFields = ['error', 'message', 'status', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.log(`❌ 缺少必需字段: ${field}`);
        return false;
      }
    }
    
    // 验证时间戳格式
    if (!isValidISO8601(data.timestamp)) {
      console.log(`❌ 时间戳格式无效: ${data.timestamp}`);
      return false;
    }
    
    console.log(`✅ 测试通过`);
    console.log(`   状态码: ${response.status}`);
    console.log(`   错误代码: ${data.error}`);
    console.log(`   错误消息: ${data.message}`);
    
    if (data.details) {
      console.log(`   详细信息: ${JSON.stringify(data.details, null, 2)}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ 测试执行失败: ${error.message}`);
    return false;
  }
}

/**
 * 验证ISO8601时间戳格式
 */
function isValidISO8601(timestamp) {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return iso8601Regex.test(timestamp);
}

/**
 * 测试验证错误响应格式
 */
async function testValidationErrorFormat() {
  console.log(`\n🧪 测试验证错误响应格式`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: '123', // 太短
        extraField: 'not-allowed' // 不支持的字段
      })
    });
    
    const data = await response.json();
    
    // 验证基本结构
    if (response.status !== 400 || data.error !== 'VALIDATION_ERROR') {
      console.log(`❌ 基本验证失败`);
      return false;
    }
    
    // 验证详细错误信息
    if (!data.details || !data.details.validationErrors) {
      console.log(`❌ 缺少详细验证错误信息`);
      return false;
    }
    
    // 验证字段级错误
    if (!data.details.fieldErrors) {
      console.log(`❌ 缺少字段级错误信息`);
      return false;
    }
    
    console.log(`✅ 验证错误格式测试通过`);
    console.log(`   字段错误: ${JSON.stringify(data.details.fieldErrors, null, 2)}`);
    console.log(`   验证错误: ${JSON.stringify(data.details.validationErrors, null, 2)}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ 验证错误格式测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试成功响应格式
 */
async function testSuccessResponseFormat() {
  console.log(`\n🧪 测试成功响应格式`);
  
  try {
    // 首先注册一个用户
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'password123'
      })
    });
    
    if (registerResponse.status !== 201) {
      console.log(`❌ 注册失败，无法测试成功响应格式`);
      return false;
    }
    
    const data = await registerResponse.json();
    
    // 验证成功响应结构
    const requiredFields = ['success', 'data', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.log(`❌ 成功响应缺少必需字段: ${field}`);
        return false;
      }
    }
    
    // 验证success字段
    if (data.success !== true) {
      console.log(`❌ success字段应该为true`);
      return false;
    }
    
    // 验证时间戳格式
    if (!isValidISO8601(data.timestamp)) {
      console.log(`❌ 时间戳格式无效: ${data.timestamp}`);
      return false;
    }
    
    console.log(`✅ 成功响应格式测试通过`);
    console.log(`   状态码: ${registerResponse.status}`);
    console.log(`   success: ${data.success}`);
    console.log(`   timestamp: ${data.timestamp}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ 成功响应格式测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('🚀 开始测试错误处理和响应标准化\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // 运行基本错误处理测试
  for (const testCase of testCases) {
    totalTests++;
    const passed = await runTestCase(testCase);
    if (passed) passedTests++;
  }
  
  // 运行验证错误格式测试
  totalTests++;
  const validationTestPassed = await testValidationErrorFormat();
  if (validationTestPassed) passedTests++;
  
  // 运行成功响应格式测试
  totalTests++;
  const successTestPassed = await testSuccessResponseFormat();
  if (successTestPassed) passedTests++;
  
  // 输出测试结果
  console.log(`\n📊 测试结果:`);
  console.log(`   通过: ${passedTests}/${totalTests}`);
  console.log(`   成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log(`\n🎉 所有测试通过！错误处理和响应标准化实现正确。`);
  } else {
    console.log(`\n⚠️  有 ${totalTests - passedTests} 个测试失败，需要检查实现。`);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'OPTIONS'
    });
    return true;
  } catch (error) {
    console.log('❌ 无法连接到服务器，请确保服务器正在运行 (npm run dev)');
    return false;
  }
}

// 运行测试
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAllTests();
  }
}

main().catch(console.error);