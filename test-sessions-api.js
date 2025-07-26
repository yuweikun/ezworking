// Simple test script to verify sessions API endpoints
const { setupTestAuth } = require('./test-auth-setup.js');

const BASE_URL = 'http://localhost:3000/api';

async function testSessionsAPI() {
  console.log('Testing Sessions API endpoints...\n');
  
  // 首先获取认证令牌
  console.log('Setting up authentication...');
  const authData = await setupTestAuth();
  if (!authData) {
    console.log('❌ Failed to get authentication token. Exiting tests.');
    return;
  }
  
  const { token, userId } = authData;
  console.log('✅ Authentication successful. Running tests with token.\n');

  // Test 1: GET /api/sessions (should work with authentication)
  console.log('1. Testing GET /api/sessions with authentication');
  try {
    const response = await fetch(`${BASE_URL}/sessions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 2: POST /api/sessions with invalid data
  console.log('2. Testing POST /api/sessions with invalid data (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({}) // missing title
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 3: POST /api/sessions with valid data
  console.log('3. Testing POST /api/sessions with valid data');
  try {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        title: 'Test Session'
      })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 4: POST /api/sessions/invalid-uuid (should fail)
  console.log('4. Testing POST /api/sessions/invalid-uuid (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/sessions/invalid-uuid`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'delete' })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 5: Unsupported method
  console.log('5. Testing unsupported method PUT /api/sessions (should fail)');
  try {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Run tests
testSessionsAPI().catch(console.error);