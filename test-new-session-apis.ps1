# Test new separated session APIs
Write-Host "Testing new separated session APIs..." -ForegroundColor Green

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
    $createResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body '{"title":"Test Session for New APIs"}' -UseBasicParsing
    $createData = $createResponse.Content | ConvertFrom-Json
    $sessionId = $createData.data.id
    Write-Host "Session created: $sessionId" -ForegroundColor Green
} catch {
    Write-Host "Create session failed" -ForegroundColor Red
    exit 1
}

# Test new update API
Write-Host "Step 3: Update session using new API" -ForegroundColor Yellow
try {
    $updateResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions/update" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body "{`"sessionId`":`"$sessionId`",`"title`":`"Updated Session Title via New API`"}" -UseBasicParsing
    Write-Host "Session title updated successfully using new API" -ForegroundColor Green
    Write-Host $updateResponse.Content -ForegroundColor Cyan
} catch {
    Write-Host "Update session failed" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response: $responseBody" -ForegroundColor Red
    }
}

# Test new delete API
Write-Host "Step 4: Delete session using new API" -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions/delete" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body "{`"sessionId`":`"$sessionId`"}" -UseBasicParsing
    Write-Host "Session deleted successfully using new API" -ForegroundColor Green
    Write-Host $deleteResponse.Content -ForegroundColor Cyan
} catch {
    Write-Host "Delete session failed" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response: $responseBody" -ForegroundColor Red
    }
}

# Verify session is deleted
Write-Host "Step 5: Verify session is deleted" -ForegroundColor Yellow
try {
    $listResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    $listData = $listResponse.Content | ConvertFrom-Json
    $remainingSessions = $listData.data.sessions | Where-Object { $_.id -eq $sessionId }
    
    if ($remainingSessions.Count -eq 0) {
        Write-Host "✅ Session successfully deleted - not found in list" -ForegroundColor Green
    } else {
        Write-Host "❌ Session still exists in list" -ForegroundColor Red
    }
    
    Write-Host "Current sessions count: $($listData.data.sessions.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to verify deletion" -ForegroundColor Red
}

Write-Host "New API endpoints test completed!" -ForegroundColor Green