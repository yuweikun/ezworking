# 测试API集成
Write-Host "测试会话API集成..." -ForegroundColor Green

# 登录获取token
Write-Host "`nStep 1: 登录获取token" -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"123456"}' -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    Write-Host "✅ 登录成功，Token: $($token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "❌ 登录失败" -ForegroundColor Red
    exit 1
}

# 创建测试会话
Write-Host "`nStep 2: 创建测试会话" -ForegroundColor Yellow
try {
    $createResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body '{"title":"测试会话"}' -UseBasicParsing
    $createData = $createResponse.Content | ConvertFrom-Json
    $sessionId = $createData.data.id
    Write-Host "✅ 会话创建成功，ID: $sessionId" -ForegroundColor Green
    Write-Host "会话数据: $($createResponse.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 创建会话失败" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "状态码: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误响应: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# 更新会话标题
Write-Host "`nStep 3: 更新会话标题" -ForegroundColor Yellow
try {
    $updateResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions/$sessionId" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body '{"title":"更新后的会话标题"}' -UseBasicParsing
    $updateData = $updateResponse.Content | ConvertFrom-Json
    Write-Host "✅ 会话标题更新成功" -ForegroundColor Green
    Write-Host "更新后数据: $($updateResponse.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 更新会话标题失败" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "状态码: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误响应: $responseBody" -ForegroundColor Red
    }
}

# 获取会话列表验证更新
Write-Host "`nStep 4: 获取会话列表验证更新" -ForegroundColor Yellow
try {
    $listResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    $listData = $listResponse.Content | ConvertFrom-Json
    Write-Host "✅ 会话列表获取成功" -ForegroundColor Green
    Write-Host "会话列表: $($listResponse.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 获取会话列表失败" -ForegroundColor Red
}

# 删除会话
Write-Host "`nStep 5: 删除会话" -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions/$sessionId" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body '{"action":"delete"}' -UseBasicParsing
    $deleteData = $deleteResponse.Content | ConvertFrom-Json
    Write-Host "✅ 会话删除成功" -ForegroundColor Green
    Write-Host "删除响应: $($deleteResponse.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 删除会话失败" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "状态码: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误响应: $responseBody" -ForegroundColor Red
    }
}

# 最终验证会话列表
Write-Host "`nStep 6: 最终验证会话列表" -ForegroundColor Yellow
try {
    $finalListResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    $finalListData = $finalListResponse.Content | ConvertFrom-Json
    Write-Host "✅ 最终会话列表: $($finalListResponse.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ 获取最终会话列表失败" -ForegroundColor Red
}

Write-Host "`nAPI集成测试完成！" -ForegroundColor Green