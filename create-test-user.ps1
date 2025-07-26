# Create test user via registration API
Write-Host "Creating test user..." -ForegroundColor Green

try {
    # Try to register the test user
    Write-Host "`nStep 1: Register test user" -ForegroundColor Yellow
    $registerResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"123456"}' -UseBasicParsing
    Write-Host "Register Status: $($registerResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Register Response: $($registerResponse.Content)" -ForegroundColor Cyan
    
    # If registration successful, try to login
    if ($registerResponse.StatusCode -eq 201 -or $registerResponse.StatusCode -eq 200) {
        Write-Host "`nStep 2: Login with new user" -ForegroundColor Yellow
        Start-Sleep -Seconds 2  # Wait a bit for user to be created
        
        $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"123456"}' -UseBasicParsing
        Write-Host "Login Status: $($loginResponse.StatusCode)" -ForegroundColor Green
        Write-Host "Login Response: $($loginResponse.Content)" -ForegroundColor Cyan
        
        $loginData = $loginResponse.Content | ConvertFrom-Json
        if ($loginData.success -and $loginData.data.token) {
            $token = $loginData.data.token
            Write-Host "`nToken obtained successfully!" -ForegroundColor Green
            Write-Host "Token: $($token.Substring(0, 30))..." -ForegroundColor Cyan
            
            # Test sessions API
            Write-Host "`nStep 3: Test sessions API" -ForegroundColor Yellow
            $sessionResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
            Write-Host "Sessions Status: $($sessionResponse.StatusCode)" -ForegroundColor Green
            Write-Host "Sessions Response: $($sessionResponse.Content)" -ForegroundColor Cyan
        }
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Error Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response: $responseBody" -ForegroundColor Red
        
        # If user already exists, try to login directly
        if ($statusCode -eq 409 -or $responseBody -like "*already*") {
            Write-Host "`nUser might already exist, trying to login..." -ForegroundColor Yellow
            try {
                $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"123456"}' -UseBasicParsing
                Write-Host "Login Status: $($loginResponse.StatusCode)" -ForegroundColor Green
                Write-Host "Login Response: $($loginResponse.Content)" -ForegroundColor Cyan
            } catch {
                Write-Host "Login also failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}