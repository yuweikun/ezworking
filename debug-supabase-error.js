// 测试 Supabase 错误处理
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://novplbcuamgnlgarolly.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdnBsYmN1YW1nbmxnYXJvbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTU2MTIsImV4cCI6MjA2OTAzMTYxMn0.bs-XqShtEu8SLz-ikqjewEGu7Mdn631QBBRdFihkuSw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('测试 Supabase 登录错误...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    
    console.log('Data:', data);
    console.log('Error:', error);
    
    if (error) {
      console.log('Error properties:');
      console.log('- message:', error.message);
      console.log('- status:', error.status);
      console.log('- code:', error.code);
      console.log('- name:', error.name);
      console.log('- constructor:', error.constructor.name);
      console.log('- full error:', JSON.stringify(error, null, 2));
    }
    
  } catch (err) {
    console.error('Caught exception:', err);
  }
}

testLogin();