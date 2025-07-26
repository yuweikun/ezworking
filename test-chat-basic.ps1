# 基础聊天API测试脚本

param(
    [string]$BaseUrl = "http://localhost:3000"
)

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# 测试登录
Write-ColorOutput "=== 测试登录 ===" "Cyan"

$loginData = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($response.success -and $response.data.token) {
        Write-ColorOutput "✅ 登录成功" "Green"
        $token = $response.data.token
    } else {
        Write-ColorOutput "❌ 登录失败: $($response.message)" "Red"
        exit 1
    }
} catch {
    Write-ColorOutput "❌ 登录请求失败: $($_.Exception.Message)" "Red"
    exit 1
}

# 创建会话
Write-ColorOutput "`n=== 创建会话 ===" "Cyan"

$sessionData = @{
    title = "基础聊天测试 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/sessions" -Method POST -Body $sessionData -Headers $headers
    
    if ($response.success -and $response.data.id) {
        Write-ColorOutput "✅ 会话创建成功: $($response.data.id)" "Green"
        $sessionId = $response.data.id
    } else {
        Write-ColorOutput "❌ 会话创建失败: $($response.message)" "Red"
        exit 1
    }
} catch {
    Write-ColorOutput "❌ 会话创建请求失败: $($_.Exception.Message)" "Red"
    exit 1
}

# 测试简单聊天API
Write-ColorOutput "`n=== 测试简单聊天API ===" "Cyan"

$chatData = @{
    session_id = $sessionId
    query = "你好，这是一个测试消息"
} | ConvertTo-Json

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/chat-simple" -Method POST -Body $chatData -Headers $headers
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.success) {
        Write-ColorOutput "✅ 聊天API测试成功" "Green"
        Write-ColorOutput "响应时间: ${duration}ms" "Green"
        Write-ColorOutput "AI回复: $($response.data.response)" "White"
        Write-ColorOutput "上下文信息: 总消息数 $($response.data.context_info.total_messages)" "Gray"
    } else {
        Write-ColorOutput "❌ 聊天API测试失败: $($response.message)" "Red"
        exit 1
    }
} catch {
    Write-ColorOutput "❌ 聊天API请求失败: $($_.Exception.Message)" "Red"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-ColorOutput "错误详情: $responseBody" "Red"
    }
    exit 1
}

# 验证消息存储
Write-ColorOutput "`n=== 验证消息存储 ===" "Cyan"

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/messages?session_id=$sessionId" -Method GET -Headers $headers
    
    if ($response.success -and $response.data.history) {
        $messageCount = $response.data.history.Count
        Write-ColorOutput "✅ 消息存储验证成功" "Green"
        Write-ColorOutput "会话中共有 $messageCount 条消息" "Green"
        
        foreach ($msg in $response.data.history) {
            $role = if ($msg.role -eq "ai") { "🤖 AI" } else { "👤 用户" }
            $content = if ($msg.content.Length -gt 50) { $msg.content.Substring(0, 50) + "..." } else { $msg.content }
            Write-ColorOutput "$role : $content" "Gray"
        }
    } else {
        Write-ColorOutput "❌ 消息存储验证失败: $($response.message)" "Red"
    }
} catch {
    Write-ColorOutput "❌ 消息存储验证请求失败: $($_.Exception.Message)" "Red"
}

Write-ColorOutput "`n🎉 基础测试完成！" "Green"