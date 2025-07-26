# Debug session creation API
Write-Host "Testing session creation API..." -ForegroundColor Green

# First, let's try to register a test user
Write-Host "`nStep 1: Register test user" -ForegroundColor Yellow
try {
    $registerResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"debug@test.com","password":"123456"}' -UseBasicParsing
    Write-Host "Register Status: $($registerResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Register Response: $($registerResponse.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "Register failed (expected): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Try to login
Write-Host "`nStep 2: Login test user" -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"debug@test.com","password":"123456"}' -UseBasicParsing
    Write-Host "Login Status: $($loginResponse.StatusCode)" -ForegroundColor Green
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    Write-Host "Token: $token" -ForegroundColor Cyan
    
    # Create a session
    Write-Host "`nStep 3: Create session" -ForegroundColor Yellow
    $sessionResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $token"} -Body '{"title":"Test Session"}' -UseBasicParsing
    Write-Host "Create Session Status: $($sessionResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Create Session Response: $($sessionResponse.Content)" -ForegroundColor Cyan
    
    # Get sessions
    Write-Host "`nStep 4: Get sessions" -ForegroundColor Yellow
    $getResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    Write-Host "Get Sessions Status: $($getResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Get Sessions Response: $($getResponse.Content)" -ForegroundColor Cyan
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Error Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response: $responseBody" -ForegroundColor Red
    }
}