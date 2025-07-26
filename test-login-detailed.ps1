# 测试登录 API 的详细脚本

$loginData = @{
    email = "test@example.com"
    password = "testpassword123"
}

$jsonBody = $loginData | ConvertTo-Json
Write-Host "发送的数据: $jsonBody"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -Body $jsonBody `
        -ContentType "application/json" `
        -UseBasicParsing

    Write-Host "成功响应:"
    Write-Host "状态码: $($response.StatusCode)"
    Write-Host "响应头: $($response.Headers | ConvertTo-Json)"
    Write-Host "响应内容: $($response.Content)"
}
catch {
    Write-Host "错误响应:"
    Write-Host "状态码: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "状态描述: $($_.Exception.Response.StatusDescription)"
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误内容: $responseBody"
        $reader.Close()
    }
    
    Write-Host "完整错误: $($_.Exception.Message)"
}