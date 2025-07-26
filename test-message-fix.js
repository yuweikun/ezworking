// 测试修复后的消息API
const baseUrl = "http://localhost:3000";

async function testMessageAPI() {
    console.log('测试修复后的消息API...\n');

    try {
        // 1. 先测试一个简单的API调用
        console.log('1. 测试服务器连接...');
        const healthResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: '123456'
            })
        });

        console.log('登录响应状态:', healthResponse.status);
        
        if (healthResponse.ok) {
            const loginData = await healthResponse.json();
            console.log('登录响应:', JSON.stringify(loginData, null, 2));
            
            if (loginData.success) {
                const token = loginData.data?.token || loginData.token;
                console.log('Token:', token ? token.substring(0, 20) + '...' : 'undefined');
                
                // 2. 创建测试会话
                console.log('\n2. 创建测试会话...');
                const sessionResponse = await fetch(`${baseUrl}/api/sessions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: '消息API修复测试'
                    })
                });

                if (sessionResponse.ok) {
                    const sessionData = await sessionResponse.json();
                    console.log('会话创建成功:', sessionData.success);
                    
                    if (sessionData.success) {
                        const sessionId = sessionData.data.id;
                        console.log('会话ID:', sessionId);
                        
                        // 3. 测试消息创建API
                        console.log('\n3. 测试消息创建API...');
                        const messageResponse = await fetch(`${baseUrl}/api/messages/create`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                session_id: sessionId,
                                role: 'user',
                                content: '这是一条测试消息',
                                workflow_stage: { stage: 'test', step: 1 }
                            })
                        });

                        console.log('消息创建响应状态:', messageResponse.status);
                        
                        if (messageResponse.ok) {
                            const messageData = await messageResponse.json();
                            console.log('消息创建结果:', messageData);
                            
                            // 4. 测试批量消息API
                            console.log('\n4. 测试批量消息API...');
                            const batchResponse = await fetch(`${baseUrl}/api/messages/batch`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
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
                                })
                            });

                            console.log('批量消息响应状态:', batchResponse.status);
                            
                            if (batchResponse.ok) {
                                const batchData = await batchResponse.json();
                                console.log('批量消息结果:', batchData);
                                
                                // 5. 验证消息存储
                                console.log('\n5. 验证消息存储...');
                                const messagesResponse = await fetch(`${baseUrl}/api/messages?session_id=${sessionId}`, {
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                });

                                if (messagesResponse.ok) {
                                    const messagesData = await messagesResponse.json();
                                    console.log('消息历史:', messagesData);
                                    console.log('总消息数:', messagesData.data.history.length);
                                } else {
                                    const errorText = await messagesResponse.text();
                                    console.log('获取消息历史失败:', errorText);
                                }
                            } else {
                                const errorText = await batchResponse.text();
                                console.log('批量消息创建失败:', errorText);
                            }
                        } else {
                            const errorText = await messageResponse.text();
                            console.log('消息创建失败:', errorText);
                        }
                    }
                } else {
                    const errorText = await sessionResponse.text();
                    console.log('会话创建失败:', errorText);
                }
            }
        } else {
            const errorText = await healthResponse.text();
            console.log('登录失败:', errorText);
        }

    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
    }
}

testMessageAPI();