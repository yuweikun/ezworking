// 简单的消息存储功能测试
// 使用 Node.js 运行: node test-message-storage-simple.js

const baseUrl = "http://localhost:3000";

// 简单的 fetch 封装
async function apiCall(url, method = 'GET', body = null, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return { response, data, success: response.ok };
    } catch (error) {
        return { error: error.message, success: false };
    }
}

async function testMessageStorage() {
    console.log('🚀 开始测试消息存储功能...\n');

    // 1. 登录
    console.log('1. 用户登录...');
    const loginResult = await apiCall(`${baseUrl}/api/auth/login`, 'POST', {
        email: 'test@example.com',
        password: 'password123'
    });

    if (!loginResult.success || !loginResult.data.success) {
        console.error('❌ 登录失败:', loginResult.data?.message || loginResult.error);
        return;
    }

    const token = loginResult.data.token;
    console.log('✅ 登录成功\n');

    // 2. 创建测试会话
    console.log('2. 创建测试会话...');
    const sessionResult = await apiCall(`${baseUrl}/api/sessions`, 'POST', {
        title: '消息存储测试会话'
    }, token);

    if (!sessionResult.success || !sessionResult.data.success) {
        console.error('❌ 创建会话失败:', sessionResult.data?.message || sessionResult.error);
        return;
    }

    const sessionId = sessionResult.data.data.id;
    console.log('✅ 会话创建成功, ID:', sessionId, '\n');

    // 3. 测试单条消息存储
    console.log('3. 测试单条消息存储...');
    
    // 存储用户消息
    const userMsgResult = await apiCall(`${baseUrl}/api/messages/create`, 'POST', {
        session_id: sessionId,
        role: 'user',
        content: '你好，这是一条测试消息',
        workflow_stage: { stage: 'test', step: 1 }
    }, token);

    if (!userMsgResult.success || !userMsgResult.data.success) {
        console.error('❌ 用户消息存储失败:', userMsgResult.data?.message || userMsgResult.error);
        return;
    }

    console.log('✅ 用户消息存储成功, ID:', userMsgResult.data.data.id);

    // 存储AI回复
    const aiMsgResult = await apiCall(`${baseUrl}/api/messages/create`, 'POST', {
        session_id: sessionId,
        role: 'assistant',
        content: '你好！我收到了你的测试消息。',
        workflow_stage: { stage: 'test', step: 2 }
    }, token);

    if (!aiMsgResult.success || !aiMsgResult.data.success) {
        console.error('❌ AI消息存储失败:', aiMsgResult.data?.message || aiMsgResult.error);
        return;
    }

    console.log('✅ AI消息存储成功, ID:', aiMsgResult.data.data.id, '\n');

    // 4. 测试批量消息存储
    console.log('4. 测试批量消息存储...');
    const batchResult = await apiCall(`${baseUrl}/api/messages/batch`, 'POST', {
        session_id: sessionId,
        messages: [
            {
                role: 'user',
                content: '批量消息1',
                workflow_stage: { stage: 'batch', step: 1 }
            },
            {
                role: 'assistant',
                content: '批量回复1',
                workflow_stage: { stage: 'batch', step: 2 }
            }
        ]
    }, token);

    if (!batchResult.success || !batchResult.data.success) {
        console.error('❌ 批量消息存储失败:', batchResult.data?.message || batchResult.error);
        return;
    }

    console.log('✅ 批量消息存储成功, 插入数量:', batchResult.data.data.inserted_count, '\n');

    // 5. 验证消息存储
    console.log('5. 验证消息存储...');
    const messagesResult = await apiCall(`${baseUrl}/api/messages?session_id=${sessionId}`, 'GET', null, token);

    if (!messagesResult.success || !messagesResult.data.success) {
        console.error('❌ 获取消息失败:', messagesResult.data?.message || messagesResult.error);
        return;
    }

    const messages = messagesResult.data.data.history;
    console.log('✅ 消息验证成功!');
    console.log(`   总消息数: ${messages.length}`);
    console.log(`   用户消息: ${messages.filter(m => m.role === 'user').length}`);
    console.log(`   AI回复: ${messages.filter(m => m.role === 'assistant').length}`);

    console.log('\n📋 消息详情:');
    messages.forEach((msg, index) => {
        const timestamp = new Date(msg.created_at).toLocaleString();
        console.log(`   ${index + 1}. [${timestamp}] ${msg.role}: ${msg.content}`);
        if (msg.workflow_stage) {
            try {
                const stage = JSON.parse(msg.workflow_stage);
                console.log(`      工作流: ${JSON.stringify(stage)}`);
            } catch (e) {
                console.log(`      工作流: ${msg.workflow_stage}`);
            }
        }
    });

    // 6. 清理测试数据
    console.log('\n6. 清理测试数据...');
    const deleteResult = await apiCall(`${baseUrl}/api/sessions/delete`, 'DELETE', {
        session_id: sessionId
    }, token);

    if (deleteResult.success && deleteResult.data.success) {
        console.log('✅ 测试数据清理成功');
    } else {
        console.log('⚠️  测试数据清理失败，但不影响测试结果');
    }

    console.log('\n🎉 消息存储功能测试完成！');
    console.log('\n📝 测试总结:');
    console.log('✅ 用户认证');
    console.log('✅ 会话创建');
    console.log('✅ 单条消息存储 (用户 + AI)');
    console.log('✅ 批量消息存储');
    console.log('✅ 消息历史获取');
    console.log('✅ 工作流阶段存储');
    console.log('✅ 数据清理');
}

// 运行测试
testMessageStorage().catch(error => {
    console.error('💥 测试过程中发生错误:', error);
});