# 测试登录 API
Write-Host "测试登录 API..." -ForegroundColor Green

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"123456"}' -UseBasicParsing
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Yellow
    Write-Host "响应内容: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误响应: $responseBody" -ForegroundColor Red
    }
}