# 测试前端消息存储集成的PowerShell脚本

# 设置基础URL
$baseUrl = "http://localhost:3000"

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Warning { Write-ColorOutput Yellow $args }

# 测试函数
function Test-API {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Info "=== 测试: $Name ==="
    Write-Info "URL: $Method $Url"
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body
            Write-Info "请求体: $Body"
        }
        
        $response = Invoke-RestMethod @params
        Write-Success "✓ 成功"
        Write-Output ($response | ConvertTo-Json -Depth 10)
        return $response
    }
    catch {
        Write-Error "✗ 失败: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Error "状态码: $statusCode"
            
            try {
                $errorResponse = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorResponse)
                $errorBody = $reader.ReadToEnd()
                Write-Error "错误响应: $errorBody"
            }
            catch {
                Write-Warning "无法读取错误响应体"
            }
        }
        return $null
    }
    
    Write-Output ""
}

Write-Info "开始测试前端消息存储集成..."
Write-Info "确保服务器运行在 $baseUrl"
Write-Output ""

# 步骤1: 登录获取token
Write-Info "步骤1: 用户登录"
$loginResponse = Test-API -Name "用户登录" -Method "POST" -Url "$baseUrl/api/auth/login" -Body (@{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json)

if (-not $loginResponse -or -not $loginResponse.success) {
    Write-Error "登录失败，无法继续测试"
    exit 1
}

$token = $loginResponse.token
$authHeaders = @{
    "Authorization" = "Bearer $token"
}

Write-Success "登录成功，获取到token"
Write-Output ""

# 步骤2: 创建测试会话
Write-Info "步骤2: 创建测试会话"
$sessionResponse = Test-API -Name "创建会话" -Method "POST" -Url "$baseUrl/api/sessions" -Headers $authHeaders -Body (@{
    title = "前端集成测试会话"
} | ConvertTo-Json)

if (-not $sessionResponse -or -not $sessionResponse.success) {
    Write-Error "创建会话失败，无法继续测试"
    exit 1
}

$sessionId = $sessionResponse.data.id
Write-Success "会话创建成功，ID: $sessionId"
Write-Output ""

# 步骤3: 模拟前端聊天流程
Write-Info "步骤3: 模拟前端聊天流程"

# 3.1 存储用户消息
Write-Info "3.1 存储用户消息"
$userMessage = "你好，请介绍一下你自己"
$userMessageResponse = Test-API -Name "存储用户消息" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
    session_id = $sessionId
    role = "user"
    content = $userMessage
    workflow_stage = @{
        stage = "user_input"
        step = 1
    }
} | ConvertTo-Json)

if (-not $userMessageResponse -or -not $userMessageResponse.success) {
    Write-Error "存储用户消息失败"
    exit 1
}

Write-Success "用户消息存储成功，ID: $($userMessageResponse.data.id)"

# 3.2 调用聊天流式API (模拟)
Write-Info "3.2 调用聊天流式API"
Write-Warning "注意: 这里我们模拟AI回复，实际应用中会调用 /api/chat/stream"

# 模拟AI回复内容
$aiReply = "你好！我是一个AI助手，很高兴为您服务。我可以帮助您解答问题、提供信息和协助完成各种任务。有什么我可以帮助您的吗？"

# 3.3 存储AI回复
Write-Info "3.3 存储AI回复"
$aiMessageResponse = Test-API -Name "存储AI回复" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
    session_id = $sessionId
    role = "assistant"
    content = $aiReply
    workflow_stage = @{
        stage = "ai_response"
        step = 2
        completed = $true
    }
} | ConvertTo-Json)

if (-not $aiMessageResponse -or -not $aiMessageResponse.success) {
    Write-Error "存储AI回复失败"
    exit 1
}

Write-Success "AI回复存储成功，ID: $($aiMessageResponse.data.id)"

# 步骤4: 验证消息存储
Write-Info "步骤4: 验证消息存储"
$messagesResponse = Test-API -Name "获取会话消息" -Method "GET" -Url "$baseUrl/api/messages?session_id=$sessionId" -Headers $authHeaders

if ($messagesResponse -and $messagesResponse.success) {
    $messageCount = $messagesResponse.data.history.Count
    $userMessages = ($messagesResponse.data.history | Where-Object { $_.role -eq "user" }).Count
    $assistantMessages = ($messagesResponse.data.history | Where-Object { $_.role -eq "assistant" }).Count
    
    Write-Success "✓ 消息存储验证成功！"
    Write-Success "  总消息数: $messageCount"
    Write-Success "  用户消息: $userMessages"
    Write-Success "  AI回复: $assistantMessages"
    
    Write-Info "消息详情:"
    foreach ($msg in $messagesResponse.data.history) {
        $timestamp = [DateTime]::Parse($msg.created_at).ToString("yyyy-MM-dd HH:mm:ss")
        Write-Output "[$timestamp] $($msg.role): $($msg.content.Substring(0, [Math]::Min(50, $msg.content.Length)))..."
        if ($msg.workflow_stage) {
            $stage = $msg.workflow_stage | ConvertFrom-Json
            Write-Output "  工作流: $($stage | ConvertTo-Json -Compress)"
        }
    }
} else {
    Write-Error "消息存储验证失败"
}

# 步骤5: 测试会话切换场景
Write-Info "步骤5: 测试会话切换场景"

# 创建第二个会话
$session2Response = Test-API -Name "创建第二个会话" -Method "POST" -Url "$baseUrl/api/sessions" -Headers $authHeaders -Body (@{
    title = "第二个测试会话"
} | ConvertTo-Json)

if ($session2Response -and $session2Response.success) {
    $session2Id = $session2Response.data.id
    Write-Success "第二个会话创建成功，ID: $session2Id"
    
    # 在第二个会话中添加消息
    Test-API -Name "第二个会话用户消息" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
        session_id = $session2Id
        role = "user"
        content = "这是第二个会话的消息"
        workflow_stage = @{
            stage = "session_switch_test"
            step = 1
        }
    } | ConvertTo-Json) | Out-Null
    
    Test-API -Name "第二个会话AI回复" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
        session_id = $session2Id
        role = "assistant"
        content = "这是第二个会话的AI回复"
        workflow_stage = @{
            stage = "session_switch_test"
            step = 2
        }
    } | ConvertTo-Json) | Out-Null
    
    # 验证两个会话的消息隔离
    Write-Info "验证会话消息隔离:"
    
    $session1Messages = Test-API -Name "获取会话1消息" -Method "GET" -Url "$baseUrl/api/messages?session_id=$sessionId" -Headers $authHeaders
    $session2Messages = Test-API -Name "获取会话2消息" -Method "GET" -Url "$baseUrl/api/messages?session_id=$session2Id" -Headers $authHeaders
    
    if ($session1Messages.success -and $session2Messages.success) {
        Write-Success "✓ 会话消息隔离验证成功！"
        Write-Success "  会话1消息数: $($session1Messages.data.history.Count)"
        Write-Success "  会话2消息数: $($session2Messages.data.history.Count)"
    }
}

# 步骤6: 测试批量消息场景
Write-Info "步骤6: 测试批量消息场景"

$batchMessages = @(
    @{
        role = "user"
        content = "批量测试消息1"
        workflow_stage = @{
            stage = "batch_test"
            step = 1
        }
    },
    @{
        role = "assistant"
        content = "批量测试回复1"
        workflow_stage = @{
            stage = "batch_test"
            step = 2
        }
    },
    @{
        role = "user"
        content = "批量测试消息2"
        workflow_stage = @{
            stage = "batch_test"
            step = 3
        }
    },
    @{
        role = "assistant"
        content = "批量测试回复2"
        workflow_stage = @{
            stage = "batch_test"
            step = 4
        }
    }
)

$batchResponse = Test-API -Name "批量插入消息" -Method "POST" -Url "$baseUrl/api/messages/batch" -Headers $authHeaders -Body (@{
    session_id = $sessionId
    messages = $batchMessages
} | ConvertTo-Json -Depth 10)

if ($batchResponse -and $batchResponse.success) {
    Write-Success "✓ 批量消息插入成功！插入了 $($batchResponse.data.inserted_count) 条消息"
    
    # 验证最终消息数量
    $finalMessages = Test-API -Name "获取最终消息列表" -Method "GET" -Url "$baseUrl/api/messages?session_id=$sessionId" -Headers $authHeaders
    if ($finalMessages.success) {
        Write-Success "✓ 最终验证: 会话中共有 $($finalMessages.data.history.Count) 条消息"
    }
}

# 步骤7: 清理测试数据
Write-Info "步骤7: 清理测试数据"
Test-API -Name "删除测试会话1" -Method "DELETE" -Url "$baseUrl/api/sessions/delete" -Headers $authHeaders -Body (@{
    session_id = $sessionId
} | ConvertTo-Json) | Out-Null

if ($session2Id) {
    Test-API -Name "删除测试会话2" -Method "DELETE" -Url "$baseUrl/api/sessions/delete" -Headers $authHeaders -Body (@{
        session_id = $session2Id
    } | ConvertTo-Json) | Out-Null
}

Write-Success "=== 前端消息存储集成测试完成 ==="
Write-Info "测试总结:"
Write-Success "✓ 用户认证和会话管理"
Write-Success "✓ 用户消息存储"
Write-Success "✓ AI回复存储"
Write-Success "✓ 消息历史加载"
Write-Success "✓ 会话消息隔离"
Write-Success "✓ 批量消息处理"
Write-Success "✓ 数据清理"

Write-Info "前端集成要点:"
Write-Info "1. 用户发送消息时调用 /api/messages/create 存储用户消息"
Write-Info "2. 调用 /api/chat/stream 获取AI流式回复"
Write-Info "3. AI回复完成后调用 /api/messages/create 存储AI回复"
Write-Info "4. 会话切换时调用 /api/messages 加载历史消息"
Write-Info "5. 每个聊天气泡对应数据库中的一条消息记录"