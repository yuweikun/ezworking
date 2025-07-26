# 测试聊天API功能
# 包括普通聊天API和流式聊天API

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$TestType = "all"  # all, chat, stream
)

# 颜色输出函数
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# 错误处理函数
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

# 测试用户登录获取token
function Get-AuthToken {
    Write-ColorOutput "=== 获取认证Token ===" "Cyan"
    
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

# 创建测试会话
function Create-TestSession {
    param([string]$Token)
    
    Write-ColorOutput "=== 创建测试会话 ===" "Cyan"
    
    $sessionData = @{
        title = "聊天API测试会话 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
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

# 测试普通聊天API
function Test-ChatAPI {
    param([string]$Token, [string]$SessionId)
    
    Write-ColorOutput "=== 测试普通聊天API ===" "Cyan"
    
    $chatData = @{
        session_id = $SessionId
        query = "你好，请简单介绍一下你自己"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    try {
        Write-ColorOutput "发送聊天请求..." "Yellow"
        $startTime = Get-Date
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/chat" -Method POST -Body $chatData -Headers $headers
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if ($response.success) {
            Write-ColorOutput "✅ 聊天API测试成功" "Green"
            Write-ColorOutput "响应时间: $([math]::Round($duration, 2))秒" "Green"
            Write-ColorOutput "AI回复: $($response.data.response)" "White"
            Write-ColorOutput "消息ID: $($response.data.message.id)" "Gray"
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

# 测试流式聊天API
function Test-StreamChatAPI {
    param([string]$Token, [string]$SessionId)
    
    Write-ColorOutput "=== 测试流式聊天API ===" "Cyan"
    
    $chatData = @{
        session_id = $SessionId
        query = "请详细介绍一下人工智能的发展历程"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    try {
        Write-ColorOutput "发送流式聊天请求..." "Yellow"
        $startTime = Get-Date
        
        # 使用WebRequest来处理流式响应
        $request = [System.Net.WebRequest]::Create("$BaseUrl/api/chat/stream")
        $request.Method = "POST"
        $request.ContentType = "application/json"
        $request.Headers.Add("Authorization", "Bearer $Token")
        
        # 写入请求数据
        $requestStream = $request.GetRequestStream()
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($chatData)
        $requestStream.Write($bytes, 0, $bytes.Length)
        $requestStream.Close()
        
        # 获取响应流
        $response = $request.GetResponse()
        $responseStream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        
        $fullContent = ""
        $chunkCount = 0
        
        Write-ColorOutput "📡 接收流式响应..." "Yellow"
        
        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            
            if ($line.StartsWith("data: ")) {
                $jsonData = $line.Substring(6)
                
                if ($jsonData.Trim() -ne "") {
                    try {
                        $chunk = $jsonData | ConvertFrom-Json
                        $chunkCount++
                        
                        if ($chunk.content) {
                            $fullContent += $chunk.content
                            Write-Host $chunk.content -NoNewline -ForegroundColor White
                        }
                        
                        if ($chunk.finished) {
                            Write-ColorOutput "`n" "White"
                            Write-ColorOutput "✅ 流式响应完成" "Green"
                            break
                        }
                        
                        if ($chunk.error) {
                            Write-ColorOutput "`n❌ 流式响应出现错误" "Red"
                            break
                        }
                    } catch {
                        Write-ColorOutput "解析chunk数据失败: $jsonData" "Red"
                    }
                }
            }
        }
        
        $reader.Close()
        $response.Close()
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-ColorOutput "响应时间: $([math]::Round($duration, 2))秒" "Green"
        Write-ColorOutput "接收到 $chunkCount 个数据块" "Green"
        Write-ColorOutput "总字符数: $($fullContent.Length)" "Green"
        
        return $true
        
    } catch {
        Write-ColorOutput "❌ 流式聊天API请求失败" "Red"
        Handle-RequestError $_
        return $false
    }
}

# 验证消息存储
function Verify-MessageStorage {
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
                $content = if ($msg.content.Length -gt 50) { $msg.content.Substring(0, 50) + "..." } else { $msg.content }
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

# 主测试流程
function Main {
    Write-ColorOutput "🚀 开始聊天API测试" "Cyan"
    Write-ColorOutput "测试类型: $TestType" "Yellow"
    Write-ColorOutput "基础URL: $BaseUrl" "Yellow"
    Write-ColorOutput "时间: $(Get-Date)" "Yellow"
    Write-ColorOutput "=" * 50 "Cyan"
    
    # 获取认证token
    $token = Get-AuthToken
    if (-not $token) {
        Write-ColorOutput "❌ 无法获取认证token，测试终止" "Red"
        return
    }
    
    # 创建测试会话
    $sessionId = Create-TestSession -Token $token
    if (-not $sessionId) {
        Write-ColorOutput "❌ 无法创建测试会话，测试终止" "Red"
        return
    }
    
    $testResults = @()
    
    # 测试普通聊天API
    if ($TestType -eq "all" -or $TestType -eq "chat") {
        Write-ColorOutput "`n" + "=" * 50 "Cyan"
        $result = Test-ChatAPI -Token $token -SessionId $sessionId
        $testResults += @{ Name = "普通聊天API"; Success = $result }
    }
    
    # 测试流式聊天API
    if ($TestType -eq "all" -or $TestType -eq "stream") {
        Write-ColorOutput "`n" + "=" * 50 "Cyan"
        $result = Test-StreamChatAPI -Token $token -SessionId $sessionId
        $testResults += @{ Name = "流式聊天API"; Success = $result }
    }
    
    # 验证消息存储
    if ($TestType -eq "all") {
        Write-ColorOutput "`n" + "=" * 50 "Cyan"
        $result = Verify-MessageStorage -Token $token -SessionId $sessionId
        $testResults += @{ Name = "消息存储验证"; Success = $result }
    }
    
    # 输出测试结果摘要
    Write-ColorOutput "`n" + "=" * 50 "Cyan"
    Write-ColorOutput "📊 测试结果摘要" "Cyan"
    Write-ColorOutput "=" * 50 "Cyan"
    
    $successCount = 0
    foreach ($result in $testResults) {
        $status = if ($result.Success) { "✅ 通过" } else { "❌ 失败" }
        $color = if ($result.Success) { "Green" } else { "Red" }
        Write-ColorOutput "$($result.Name): $status" $color
        if ($result.Success) { $successCount++ }
    }
    
    Write-ColorOutput "`n总计: $successCount/$($testResults.Count) 项测试通过" "Yellow"
    
    if ($successCount -eq $testResults.Count) {
        Write-ColorOutput "🎉 所有测试通过！" "Green"
    } else {
        Write-ColorOutput "⚠️  部分测试失败，请检查日志" "Yellow"
    }
}

# 运行主程序
Main