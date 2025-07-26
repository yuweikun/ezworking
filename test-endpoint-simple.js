// Simple endpoint test
const https = require('http');

console.log('Testing endpoint accessibility...');

// Test basic server health
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = https.request(options, (res) => {
  console.log(`Server health: ${res.statusCode}`);
  
  // Test auth endpoint
  testAuth();
});

req.on('error', (err) => {
  console.error('Server connection error:', err.message);
});

req.on('timeout', () => {
  console.error('Server connection timeout');
  req.destroy();
});

req.end();

function testAuth() {
  const authData = JSON.stringify({
    email: 'test@example.com',
    password: '123456'
  });

  const authOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(authData)
    },
    timeout: 10000
  };

  const authReq = https.request(authOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Auth response: ${res.statusCode}`);
      try {
        const authResult = JSON.parse(data);
        if (authResult.success) {
          console.log('Auth successful, testing AI stream...');
          testAIStream(authResult.data.token);
        } else {
          console.log('Auth failed:', authResult.message);
        }
      } catch (e) {
        console.log('Auth response parse error:', e.message);
        console.log('Raw response:', data);
      }
    });
  });

  authReq.on('error', (err) => {
    console.error('Auth request error:', err.message);
  });

  authReq.on('timeout', () => {
    console.error('Auth request timeout');
    authReq.destroy();
  });

  authReq.write(authData);
  authReq.end();
}

function testAIStream(token) {
  // First create a session
  const sessionData = JSON.stringify({
    title: 'Node.js Test Session'
  });

  const sessionOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/sessions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(sessionData)
    },
    timeout: 10000
  };

  const sessionReq = https.request(sessionOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Session response: ${res.statusCode}`);
      try {
        const sessionResult = JSON.parse(data);
        if (sessionResult.success) {
          console.log('Session created, testing AI stream API...');
          
          const streamData = JSON.stringify({
            session_id: sessionResult.data.id,
            query: 'Hello, this is a Node.js test.'
          });

          const streamOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/ai/stream',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Content-Length': Buffer.byteLength(streamData)
            },
            timeout: 30000
          };

          const streamReq = https.request(streamOptions, (res) => {
            console.log(`AI Stream response: ${res.statusCode}`);
            console.log('Headers:', res.headers);
            
            if (res.statusCode === 200) {
              console.log('AI Stream API is working!');
              
              res.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                console.log('Received chunk:', chunkStr.substring(0, 100) + '...');
              });
              
              res.on('end', () => {
                console.log('Stream ended');
              });
            } else {
              let errorData = '';
              res.on('data', (chunk) => {
                errorData += chunk;
              });
              res.on('end', () => {
                console.log('AI Stream error:', errorData);
              });
            }
          });

          streamReq.on('error', (err) => {
            console.error('AI Stream request error:', err.message);
          });

          streamReq.on('timeout', () => {
            console.error('AI Stream request timeout');
            streamReq.destroy();
          });

          streamReq.write(streamData);
          streamReq.end();
          
        } else {
          console.log('Session creation failed:', sessionResult.message);
        }
      } catch (e) {
        console.log('Session response parse error:', e.message);
        console.log('Raw response:', data);
      }
    });
  });

  sessionReq.on('error', (err) => {
    console.error('Session request error:', err.message);
  });

  sessionReq.write(sessionData);
  sessionReq.end();
}