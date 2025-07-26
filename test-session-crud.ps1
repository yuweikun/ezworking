# Test session CRUD operations
Write-Host "Testing session CRUD operations..." -ForegroundColor Green

# Login to get token
Write-Host "Step 1: Login" -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"123456"}' -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    Write-Host "Login successful" -ForegroundColor Green
} catch {
    Write-Host "Login failed" -ForegroundColor Red
    exit 1
}

# Create test session
Write-Host "Step 2: Create session" -ForegroundColor Yellow
try {
    $createResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body '{"title":"Test Session"}' -UseBasicParsing
    $createData = $createResponse.Content | ConvertFrom-Json
    $sessionId = $createData.data.id
    Write-Host "Session created: $sessionId" -ForegroundColor Green
} catch {
    Write-Host "Create session failed" -ForegroundColor Red
    exit 1
}

# Update session title
Write-Host "Step 3: Update session title" -ForegroundColor Yellow
try {
    $updateResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions/$sessionId" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body '{"title":"Updated Session Title"}' -UseBasicParsing
    Write-Host "Session title updated successfully" -ForegroundColor Green
    Write-Host $updateResponse.Content -ForegroundColor Cyan
} catch {
    Write-Host "Update session failed" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $statusCode" -ForegroundColor Red
}

# Delete session
Write-Host "Step 4: Delete session" -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions/$sessionId" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body '{"action":"delete"}' -UseBasicParsing
    Write-Host "Session deleted successfully" -ForegroundColor Green
    Write-Host $deleteResponse.Content -ForegroundColor Cyan
} catch {
    Write-Host "Delete session failed" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $statusCode" -ForegroundColor Red
}

Write-Host "Test completed!" -ForegroundColor Green