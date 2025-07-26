# 测试消息API的PowerShell脚本

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

Write-Info "开始测试消息API..."
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
    title = "消息API测试会话"
} | ConvertTo-Json)

if (-not $sessionResponse -or -not $sessionResponse.success) {
    Write-Error "创建会话失败，无法继续测试"
    exit 1
}

$sessionId = $sessionResponse.data.id
Write-Success "会话创建成功，ID: $sessionId"
Write-Output ""

# 步骤3: 测试单条消息插入
Write-Info "步骤3: 测试单条消息插入API"

# 插入用户消息
$userMessageResponse = Test-API -Name "插入用户消息" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
    session_id = $sessionId
    role = "user"
    content = "你好，这是一条测试消息"
    workflow_stage = @{
        stage = "greeting"
        step = 1
    }
} | ConvertTo-Json)

# 插入助手消息
$assistantMessageResponse = Test-API -Name "插入助手消息" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
    session_id = $sessionId
    role = "assistant"
    content = "你好！我收到了你的测试消息。"
    workflow_stage = @{
        stage = "response"
        step = 2
    }
} | ConvertTo-Json)

# 步骤4: 测试批量消息插入
Write-Info "步骤4: 测试批量消息插入API"

$batchMessages = @(
    @{
        role = "user"
        content = "这是批量插入的第一条用户消息"
        workflow_stage = @{
            stage = "batch_test"
            step = 1
        }
    },
    @{
        role = "assistant"
        content = "这是批量插入的第一条助手回复"
        workflow_stage = @{
            stage = "batch_test"
            step = 2
        }
    },
    @{
        role = "user"
        content = "这是批量插入的第二条用户消息"
        workflow_stage = @{
            stage = "batch_test"
            step = 3
        }
    },
    @{
        role = "assistant"
        content = "这是批量插入的第二条助手回复"
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

# 步骤5: 验证消息是否正确插入
Write-Info "步骤5: 验证消息插入结果"

$messagesResponse = Test-API -Name "获取会话消息" -Method "GET" -Url "$baseUrl/api/messages?session_id=$sessionId" -Headers $authHeaders

if ($messagesResponse -and $messagesResponse.success) {
    $messageCount = $messagesResponse.data.history.Count
    Write-Success "✓ 会话中共有 $messageCount 条消息"
    
    Write-Info "消息列表:"
    foreach ($msg in $messagesResponse.data.history) {
        $timestamp = [DateTime]::Parse($msg.created_at).ToString("yyyy-MM-dd HH:mm:ss")
        Write-Output "[$timestamp] $($msg.role): $($msg.content)"
        if ($msg.workflow_stage) {
            $stage = $msg.workflow_stage | ConvertFrom-Json
            Write-Output "  工作流阶段: $($stage | ConvertTo-Json -Compress)"
        }
    }
}

# 步骤6: 测试错误情况
Write-Info "步骤6: 测试错误情况"

# 测试无效会话ID
Test-API -Name "无效会话ID" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
    session_id = "invalid-session-id"
    role = "user"
    content = "这应该失败"
} | ConvertTo-Json)

# 测试无效角色
Test-API -Name "无效角色" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
    session_id = $sessionId
    role = "invalid_role"
    content = "这应该失败"
} | ConvertTo-Json)

# 测试空内容
Test-API -Name "空内容" -Method "POST" -Url "$baseUrl/api/messages/create" -Headers $authHeaders -Body (@{
    session_id = $sessionId
    role = "user"
    content = ""
} | ConvertTo-Json)

# 测试批量插入空数组
Test-API -Name "批量插入空数组" -Method "POST" -Url "$baseUrl/api/messages/batch" -Headers $authHeaders -Body (@{
    session_id = $sessionId
    messages = @()
} | ConvertTo-Json)

# 步骤7: 清理测试数据
Write-Info "步骤7: 清理测试数据"
Test-API -Name "删除测试会话" -Method "DELETE" -Url "$baseUrl/api/sessions/delete" -Headers $authHeaders -Body (@{
    session_id = $sessionId
} | ConvertTo-Json)

Write-Success "=== 消息API测试完成 ==="