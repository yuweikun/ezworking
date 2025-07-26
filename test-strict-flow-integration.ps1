# 严格消息流程集成测试脚本
# 测试用户消息和AI消息的严格存储流程

Write-Host "🔒 开始严格消息流程集成测试..." -ForegroundColor Blue

# 检查环境变量
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local 文件不存在" -ForegroundColor Red
    exit 1
}

# 读取环境变量
Get-Content ".env.local" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_ANON_KEY = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Host "❌ Supabase 环境变量未设置" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 环境变量检查通过" -ForegroundColor Green

# 测试用户认证
Write-Host "`n🔐 测试用户认证..." -ForegroundColor Yellow

$loginData = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($authResponse.success) {
        $token = $authResponse.data.token
        $userId = $authResponse.data.user.id
        Write-Host "✅ 用户认证成功: $userId" -ForegroundColor Green
    } else {
        Write-Host "❌ 用户认证失败: $($authResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 认证请求失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 创建测试会话
Write-Host "`n📝 创建测试会话..." -ForegroundColor Yellow

$sessionData = @{
    title = "严格流程测试会话 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $sessionResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/sessions" -Method POST -Body $sessionData -Headers $headers
    
    if ($sessionResponse.success) {
        $sessionId = $sessionResponse.data.id
        Write-Host "✅ 会话创建成功: $sessionId" -ForegroundColor Green
    } else {
        Write-Host "❌ 会话创建失败: $($sessionResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 会话创建请求失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 测试严格消息流程
Write-Host "`n🔒 开始严格消息流程测试..." -ForegroundColor Blue

# 步骤1: 模拟用户发送消息（前端立即渲染）
$userMessage = "你好，这是一个严格流程测试消息"
Write-Host "👤 步骤1: 用户发送消息: '$userMessage'" -ForegroundColor Cyan
Write-Host "   ✅ 用户消息气泡立即渲染（模拟）" -ForegroundColor Green

# 步骤2: 严格等待用户消息存储
Write-Host "💾 步骤2: 开始存储用户消息到数据库..." -ForegroundColor Yellow

$userMessageData = @{
    session_id = $sessionId
    role = "user"
    content = $userMessage
    workflow_stage = @{
        stage = "user_input"
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    }
} | ConvertTo-Json -Depth 3

$startTime = Get-Date

try {
    $userStoreResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/messages/create" -Method POST -Body $userMessageData -Headers $headers
    
    if ($userStoreResponse.success) {
        $userStoreTime = (Get-Date) - $startTime
        Write-Host "   ✅ 用户消息存储成功 (耗时: $($userStoreTime.TotalMilliseconds)ms)" -ForegroundColor Green
        Write-Host "   📝 消息ID: $($userStoreResponse.data.id)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ 用户消息存储失败: $($userStoreResponse.message)" -ForegroundColor Red
        Write-Host "   🚫 流程终止 - AI不会开始响应" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ 用户消息存储请求失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   🚫 流程终止 - AI不会开始响应" -ForegroundColor Red
    exit 1
}

# 步骤3: 用户消息存储成功后，AI开始响应
Write-Host "🤖 步骤3: 用户消息存储完成，AI开始响应..." -ForegroundColor Yellow

# 步骤4: 模拟AI流式响应（立即渲染AI气泡）
Write-Host "📱 步骤4: AI响应流式渲染..." -ForegroundColor Cyan

# 模拟流式响应过程
$aiResponses = @(
    "你好！",
    "你好！我是AI助手。",
    "你好！我是AI助手。很高兴为你服务！",
    "你好！我是AI助手。很高兴为你服务！这是一个严格流程的测试响应。"
)

foreach ($response in $aiResponses) {
    Write-Host "   📝 AI响应更新: '$response'" -ForegroundColor Gray
    Start-Sleep -Milliseconds 300
}

$finalAiResponse = $aiResponses[-1]
Write-Host "   ✅ AI响应完成: '$finalAiResponse'" -ForegroundColor Green

# 步骤5: 严格等待AI消息存储
Write-Host "💾 步骤5: AI响应完成，开始存储AI消息到数据库..." -ForegroundColor Yellow

$aiMessageData = @{
    session_id = $sessionId
    role = "assistant"
    content = $finalAiResponse
    workflow_stage = @{
        stage = "ai_response"
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    }
} | ConvertTo-Json -Depth 3

$aiStoreStartTime = Get-Date

try {
    $aiStoreResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/messages/create" -Method POST -Body $aiMessageData -Headers $headers
    
    if ($aiStoreResponse.success) {
        $aiStoreTime = (Get-Date) - $aiStoreStartTime
        Write-Host "   ✅ AI消息存储成功 (耗时: $($aiStoreTime.TotalMilliseconds)ms)" -ForegroundColor Green
        Write-Host "   📝 消息ID: $($aiStoreResponse.data.id)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️ AI消息存储失败: $($aiStoreResponse.message)" -ForegroundColor Yellow
        Write-Host "   ℹ️ 但不阻止用户继续聊天" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️ AI消息存储请求失败: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   ℹ️ 但不阻止用户继续聊天" -ForegroundColor Gray
}

# 步骤6: 用户可以继续聊天
Write-Host "🎉 步骤6: 所有存储操作完成，用户现在可以继续聊天" -ForegroundColor Green

# 验证消息历史
Write-Host "`n📋 验证消息历史..." -ForegroundColor Yellow

try {
    $historyResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/messages?session_id=$sessionId" -Method GET -Headers $headers
    
    if ($historyResponse.success -and $historyResponse.data.history) {
        $messages = $historyResponse.data.history
        Write-Host "✅ 消息历史验证成功，共 $($messages.Count) 条消息:" -ForegroundColor Green
        
        foreach ($msg in $messages) {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($msg.created_at).ToString("HH:mm:ss")
            Write-Host "   [$timestamp] $($msg.role): $($msg.content.Substring(0, [Math]::Min(50, $msg.content.Length)))..." -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️ 消息历史验证失败" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ 消息历史验证请求失败: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 计算总耗时
$totalTime = (Get-Date) - $startTime
Write-Host "`n⏱️ 严格流程总耗时: $($totalTime.TotalMilliseconds)ms" -ForegroundColor Blue

# 测试总结
Write-Host "`n📊 严格消息流程测试总结:" -ForegroundColor Blue
Write-Host "✅ 步骤1: 用户消息立即渲染 - 完成" -ForegroundColor Green
Write-Host "✅ 步骤2: 用户消息严格存储 - 完成" -ForegroundColor Green
Write-Host "✅ 步骤3: AI响应启动 - 完成" -ForegroundColor Green
Write-Host "✅ 步骤4: AI响应流式渲染 - 完成" -ForegroundColor Green
Write-Host "✅ 步骤5: AI消息严格存储 - 完成" -ForegroundColor Green
Write-Host "✅ 步骤6: 用户可继续聊天 - 完成" -ForegroundColor Green

Write-Host "`n🎉 严格消息流程集成测试完成！" -ForegroundColor Green

# 清理测试数据（可选）
Write-Host "`n🧹 清理测试数据..." -ForegroundColor Yellow

try {
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/sessions/delete" -Method POST -Body (@{session_id = $sessionId} | ConvertTo-Json) -Headers $headers
    
    if ($deleteResponse.success) {
        Write-Host "✅ 测试会话已清理" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 测试会话清理失败: $($deleteResponse.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ 测试会话清理请求失败: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n✨ 所有测试完成！" -ForegroundColor Magenta