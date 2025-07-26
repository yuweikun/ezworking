import * as dotenv from 'dotenv';
import * as path from 'path';
import OpenAI from 'openai';

// 加载环境变量
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testOpenAIConnection() {
  console.log('🔍 测试OpenAI连接...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : '未设置');
  
  if (!apiKey) {
    console.error('❌ API密钥未设置');
    return;
  }

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.openai.com/v1',
    });

    console.log('📡 发送测试请求...');
    
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
      max_tokens: 50,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    console.log('✅ 连接成功！');
    console.log('📝 AI回复:', content);
    
  } catch (error: any) {
    console.error('❌ 连接失败:', error.message);
    console.error('错误详情:', error);
  }
}

testOpenAIConnection();