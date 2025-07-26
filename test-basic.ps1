# Basic Chat API Test

$BaseUrl = "http://localhost:3000"

Write-Host "=== Testing Login ===" -ForegroundColor Cyan

$loginData = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($response.success -and $response.data.token) {
        Write-Host "Login successful" -ForegroundColor Green
        $token = $response.data.token
    } else {
        Write-Host "Login failed: $($response.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Login request failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Creating Session ===" -ForegroundColor Cyan

$sessionData = @{
    title = "Basic Chat Test - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/sessions" -Method POST -Body $sessionData -Headers $headers
    
    if ($response.success -and $response.data.id) {
        Write-Host "Session created successfully: $($response.data.id)" -ForegroundColor Green
        $sessionId = $response.data.id
    } else {
        Write-Host "Session creation failed: $($response.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Session creation request failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Testing Simple Chat API ===" -ForegroundColor Cyan

$chatData = @{
    session_id = $sessionId
    query = "Hello, this is a test message"
} | ConvertTo-Json

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/chat-simple" -Method POST -Body $chatData -Headers $headers
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.success) {
        Write-Host "Chat API test successful" -ForegroundColor Green
        Write-Host "Response time: ${duration}ms" -ForegroundColor Green
        Write-Host "AI reply: $($response.data.response)" -ForegroundColor White
        Write-Host "Context info: Total messages $($response.data.context_info.total_messages)" -ForegroundColor Gray
    } else {
        Write-Host "Chat API test failed: $($response.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Chat API request failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error details: $responseBody" -ForegroundColor Red
    }
    exit 1
}

Write-Host "`n=== Verifying Message Storage ===" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/messages?session_id=$sessionId" -Method GET -Headers $headers
    
    if ($response.success -and $response.data.history) {
        $messageCount = $response.data.history.Count
        Write-Host "Message storage verification successful" -ForegroundColor Green
        Write-Host "Session contains $messageCount messages" -ForegroundColor Green
        
        foreach ($msg in $response.data.history) {
            $role = if ($msg.role -eq "ai") { "AI" } else { "User" }
            $content = if ($msg.content.Length -gt 50) { $msg.content.Substring(0, 50) + "..." } else { $msg.content }
            Write-Host "$role : $content" -ForegroundColor Gray
        }
    } else {
        Write-Host "Message storage verification failed: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "Message storage verification request failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nBasic test completed!" -ForegroundColor Green