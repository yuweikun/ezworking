# Debug authentication status
Write-Host "Debugging authentication..." -ForegroundColor Green

# Check if we can access the browser's localStorage
Write-Host "`nStep 1: Check browser localStorage" -ForegroundColor Yellow
Write-Host "Please open browser console and run:" -ForegroundColor Cyan
Write-Host "localStorage.getItem('auth_token')" -ForegroundColor White
Write-Host "localStorage.getItem('user_info')" -ForegroundColor White

# Test login first
Write-Host "`nStep 2: Try to login" -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"123456"}' -UseBasicParsing
    Write-Host "Login Status: $($loginResponse.StatusCode)" -ForegroundColor Green
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success -and $loginData.data.token) {
        $token = $loginData.data.token
        Write-Host "Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Cyan
        
        # Test sessions API with token
        Write-Host "`nStep 3: Test sessions API with token" -ForegroundColor Yellow
        $sessionResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
        Write-Host "Sessions Status: $($sessionResponse.StatusCode)" -ForegroundColor Green
        Write-Host "Sessions Response: $($sessionResponse.Content)" -ForegroundColor Cyan
    } else {
        Write-Host "Login failed - no token in response" -ForegroundColor Red
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Error Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response: $responseBody" -ForegroundColor Red
    }
}