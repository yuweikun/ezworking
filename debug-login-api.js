const https = require('https');
const http = require('http');

function testLoginAPI() {
  const loginData = {
    email: 'test@example.com',
    password: 'testpassword123'
  };

  const postData = JSON.stringify(loginData);

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🔍 测试登录 API...');
  console.log('请求数据:', loginData);

  const req = http.request(options, (res) => {
    console.log('响应状态:', res.statusCode);
    console.log('响应头:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('响应内容:', data);
      
      if (res.headers['content-type']?.includes('application/json')) {
        try {
          const responseData = JSON.parse(data);
          console.log('解析后的响应:', JSON.stringify(responseData, null, 2));
        } catch (parseError) {
          console.error('JSON 解析错误:', parseError.message);
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error('请求失败:', error.message);
  });

  req.write(postData);
  req.end();
}

testLoginAPI();