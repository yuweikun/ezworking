# Test with a real email format
Write-Host "Testing with real email format..." -ForegroundColor Green

# Try to register with a more realistic email
Write-Host "`nStep 1: Register with real email format" -ForegroundColor Yellow
try {
    $registerResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"testuser@gmail.com","password":"123456"}' -UseBasicParsing
    Write-Host "Register Status: $($registerResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Register Response: $($registerResponse.Content)" -ForegroundColor Cyan
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Register Error Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Register Error Response: $responseBody" -ForegroundColor Red
    }
}

# Try to login
Write-Host "`nStep 2: Login with real email" -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"testuser@gmail.com","password":"123456"}' -UseBasicParsing
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
        Write-Host "Login Response: $($loginResponse.Content)" -ForegroundColor Red
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Login Error Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Login Error Response: $responseBody" -ForegroundColor Red
    }
}