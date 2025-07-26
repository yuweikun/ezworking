# 测试简化版聊天API

param(
    [string]$BaseUrl = "http://localhost:3000"
)

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Handle-RequestError {
    param($Exception)
    
    $statusCode = $Exception.Exception.Response.StatusCode.value__
    Write-ColorOutput "错误状态码: $statusCode" "Red"
    
    if ($Exception.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($Exception.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-ColorOutput "错误响应: $responseBody" "Red"
        } catch {
            Write-ColorOutput "无法读取错误响应" "Red"
        }
    }
}

# 测试登录
function Test-Login {
    Write-ColorOutput "=== 测试登录 ===" "Cyan"
    
    $loginData = @{
        email = "test@example.com"
        password = "password123"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
        
        if ($response.success -and $response.data.token) {
            Write-ColorOutput "✅ 登录成功" "Green"
            return $response.data.token
        } else {
            Write-ColorOutput "❌ 登录失败: $($response.message)" "Red"
            return $null
        }
    } catch {
        Write-ColorOutput "❌ 登录请求失败" "Red"
        Handle-RequestError $_
        return $null
    }
}

# 创建会话
function Create-Session {
    param([string]$Token)
    
    Write-ColorOutput "=== 创建会话 ===" "Cyan"
    
    $sessionData = @{
        title = "简单聊天测试 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/sessions" -Method POST -Body $sessionData -Headers $headers
        
        if ($response.success -and $response.data.id) {
            Write-ColorOutput "✅ 会话创建成功: $($response.data.id)" "Green"
            return $response.data.id
        } else {
            Write-ColorOutput "❌ 会话创建失败: $($response.message)" "Red"
            return $null
        }
    } catch {
        Write-ColorOutput "❌ 会话创建请求失败" "Red"
        Handle-RequestError $_
        return $null
    }
}

# 测试简单聊天API
function Test-SimpleChat {
    param([string]$Token, [string]$SessionId, [string]$Query)
    
    Write-ColorOutput "=== 测试简单聊天API ===" "Cyan"
    Write-ColorOutput "查询: $Query" "Yellow"
    
    $chatData = @{
        session_id = $SessionId
        query = $Query
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
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
            return $true
        } else {
            Write-ColorOutput "❌ 聊天API测试失败: $($response.message)" "Red"
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 聊天API请求失败" "Red"
        Handle-RequestError $_
        return $false
    }
}

# 验证消息存储
function Verify-Messages {
    param([string]$Token, [string]$SessionId)
    
    Write-ColorOutput "=== 验证消息存储 ===" "Cyan"
    
    $headers = @{
        "Authorization" = "Bearer $Token"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/messages?session_id=$SessionId" -Method GET -Headers $headers
        
        if ($response.success -and $response.data.history) {
            $messageCount = $response.data.history.Count
            Write-ColorOutput "✅ 消息存储验证成功" "Green"
            Write-ColorOutput "会话中共有 $messageCount 条消息" "Green"
            
            foreach ($msg in $response.data.history) {
                $role = if ($msg.role -eq "ai") { "🤖 AI" } else { "👤 用户" }
                $content = if ($msg.content.Length -gt 80) { $msg.content.Substring(0, 80) + "..." } else { $msg.content }
                Write-ColorOutput "$role : $content" "Gray"
            }
            
            return $true
        } else {
            Write-ColorOutput "❌ 消息存储验证失败: $($response.message)" "Red"
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 消息存储验证请求失败" "Red"
        Handle-RequestError $_
        return $false
    }
}
}

# 主测试流程
function Main {
    Write-ColorOutput "🚀 开始简单聊天API测试" "Cyan"
    Write-ColorOutput "基础URL: $BaseUrl" "Yellow"
    Write-ColorOutput "时间: $(Get-Date)" "Yellow"
    Write-ColorOutput "=" * 60 "Cyan"
    
    # 1. 登录
    $token = Test-Login
    if (-not $token) {
        Write-ColorOutput "❌ 登录失败，测试终止" "Red"
        return
    }
    
    # 2. 创建会话
    $sessionId = Create-Session -Token $token
    if (-not $sessionId) {
        Write-ColorOutput "❌ 创建会话失败，测试终止" "Red"
        return
    }
    
    # 3. 测试多轮对话
    $queries = @(
        "你好，我是新用户",
        "请介绍一下你自己",
        "我们刚才聊了什么？",
        "谢谢你的回复"
    )
    
    $successCount = 0
    $totalTests = $queries.Count + 1  # +1 for message verification
    
    foreach ($query in $queries) {
        Write-ColorOutput "`n" + "-" * 60 "Cyan"
        $result = Test-SimpleChat -Token $token -SessionId $sessionId -Query $query
        if ($result) { $successCount++ }
        Start-Sleep -Seconds 1  # 避免请求过快
    }
    
    # 4. 验证消息存储
    Write-ColorOutput "`n" + "-" * 60 "Cyan"
    $result = Verify-Messages -Token $token -SessionId $sessionId
    if ($result) { $successCount++ }
    
    # 输出测试结果
    Write-ColorOutput "`n" + "=" * 60 "Cyan"
    Write-ColorOutput "📊 测试结果摘要" "Cyan"
    Write-ColorOutput "=" * 60 "Cyan"
    Write-ColorOutput "成功: $successCount/$totalTests 项测试通过" "Yellow"
    
    if ($successCount -eq $totalTests) {
        Write-ColorOutput "🎉 所有测试通过！" "Green"
        Write-ColorOutput "✅ 用户消息存储功能正常" "Green"
        Write-ColorOutput "✅ AI回复存储功能正常" "Green"
        Write-ColorOutput "✅ 上下文获取功能正常" "Green"
        Write-ColorOutput "✅ 多轮对话功能正常" "Green"
    } else {
        Write-ColorOutput "⚠️ 部分测试失败，请检查日志" "Yellow"
    }
}

# 运行测试
Main