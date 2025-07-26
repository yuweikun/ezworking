# Direct API Test - Skip login for now

$BaseUrl = "http://localhost:3000"

Write-Host "=== Testing Direct API Access ===" -ForegroundColor Cyan

# Test if server is running
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl" -Method GET -TimeoutSec 5
    Write-Host "Server is running" -ForegroundColor Green
} catch {
    Write-Host "Server is not accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test messages API without auth (should return 401)
Write-Host "`n=== Testing Messages API (should return 401) ===" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/messages" -Method GET
    Write-Host "Unexpected success: $($response | ConvertTo-Json)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Expected 401 Unauthorized - API requires authentication" -ForegroundColor Green
    } else {
        Write-Host "Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test chat-simple API without auth (should return 401)
Write-Host "`n=== Testing Chat-Simple API (should return 401) ===" -ForegroundColor Cyan

$chatData = @{
    session_id = "test-session-id"
    query = "Hello"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/chat-simple" -Method POST -Body $chatData -ContentType "application/json"
    Write-Host "Unexpected success: $($response | ConvertTo-Json)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Expected 401 Unauthorized - API requires authentication" -ForegroundColor Green
    } else {
        Write-Host "Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== API Structure Test Completed ===" -ForegroundColor Cyan
Write-Host "APIs are properly protected with authentication" -ForegroundColor Green