// 在浏览器控制台中运行这个脚本来检查前端问题

console.log('=== 前端问题检查 ===');

// 1. 检查认证状态
console.log('1. 检查认证状态:');
const token = localStorage.getItem('auth_token');
const userInfo = localStorage.getItem('user_info');
console.log('Token:', token ? token.substring(0, 30) + '...' : 'null');
console.log('User Info:', userInfo);

if (!token) {
    console.error('❌ 用户未登录！这可能是问题的原因。');
    console.log('请先登录或运行以下代码自动登录:');
    console.log(`
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: '123456' })
}).then(r => r.json()).then(data => {
    if (data.success) {
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user_info', JSON.stringify(data.data.user));
        console.log('✅ 登录成功！请刷新页面。');
    }
});
    `);
} else {
    console.log('✅ 用户已登录');
}

// 2. 检查会话列表
console.log('\n2. 检查会话列表:');
if (token) {
    fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
        console.log('会话API响应:', data);
        if (data.success) {
            console.log(`✅ 找到 ${data.data.sessions.length} 个会话`);
            if (data.data.sessions.length === 0) {
                console.log('💡 没有会话，创建一个测试会话:');
                console.log(`
fetch('/api/sessions', {
    method: 'POST',
    headers: { 
        'Authorization': 'Bearer ${token}',
        'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ title: '测试会话' })
}).then(r => r.json()).then(data => {
    console.log('创建会话结果:', data);
    if (data.success) {
        console.log('✅ 测试会话创建成功！请刷新页面。');
    }
});
                `);
            }
        } else {
            console.error('❌ 获取会话列表失败:', data.message);
        }
    })
    .catch(err => {
        console.error('❌ 会话API请求失败:', err);
    });
}

// 3. 检查DOM元素
console.log('\n3. 检查DOM元素:');
setTimeout(() => {
    const conversationsElement = document.querySelector('.ant-conversations');
    console.log('会话列表元素:', conversationsElement);
    
    if (conversationsElement) {
        const menuItems = conversationsElement.querySelectorAll('.ant-conversations-item');
        console.log(`找到 ${menuItems.length} 个会话项`);
        
        if (menuItems.length > 0) {
            console.log('✅ 会话项存在，检查右键菜单...');
            
            // 模拟右键点击第一个会话项
            const firstItem = menuItems[0];
            console.log('第一个会话项:', firstItem);
            
            // 检查是否有菜单配置
            const menuTrigger = firstItem.querySelector('[data-menu-trigger]') || firstItem;
            console.log('菜单触发器:', menuTrigger);
            
            if (menuTrigger) {
                console.log('💡 尝试右键点击第一个会话项来测试菜单');
                console.log('如果菜单没有出现，可能是事件绑定有问题');
            }
        } else {
            console.log('❌ 没有找到会话项，可能是数据加载问题');
        }
    } else {
        console.log('❌ 没有找到会话列表元素');
    }
}, 2000);

// 4. 检查控制台错误
console.log('\n4. 检查控制台错误:');
console.log('请查看控制台是否有红色错误信息');
console.log('常见错误可能包括:');
console.log('- 网络请求失败');
console.log('- JavaScript语法错误');
console.log('- React组件错误');
console.log('- 认证token过期');

// 5. 提供解决方案
console.log('\n5. 可能的解决方案:');
console.log('a) 确保用户已登录');
console.log('b) 确保有会话数据');
console.log('c) 检查网络连接');
console.log('d) 刷新页面重新加载');
console.log('e) 清除浏览器缓存');

console.log('\n=== 检查完成 ===');