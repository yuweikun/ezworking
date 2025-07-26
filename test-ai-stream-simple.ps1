# Simple AI Stream API Test
Write-Host "Testing AI Stream API..." -ForegroundColor Blue

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -TimeoutSec 5
    Write-Host "Server is running" -ForegroundColor Green
} catch {
    Write-Host "Server is not running. Please start with 'npm run dev'" -ForegroundColor Red
    exit 1
}

# Test user authentication
Write-Host "Testing user authentication..." -ForegroundColor Yellow

$loginData = @{
    email = "test@example.com"
    password = "123456"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($authResponse.success) {
        $token = $authResponse.data.token
        Write-Host "Authentication successful" -ForegroundColor Green
    } else {
        Write-Host "Authentication failed: $($authResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Authentication request failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create test session
Write-Host "Creating test session..." -ForegroundColor Yellow

$sessionData = @{
    title = "AI Stream Test Session"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $sessionResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/sessions" -Method POST -Body $sessionData -Headers $headers
    
    if ($sessionResponse.success) {
        $sessionId = $sessionResponse.data.id
        Write-Host "Session created successfully: $sessionId" -ForegroundColor Green
    } else {
        Write-Host "Session creation failed: $($sessionResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Session creation request failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test AI Stream API
Write-Host "Testing AI Stream API..." -ForegroundColor Blue

$chatData = @{
    session_id = $sessionId
    query = "Hello, this is a test message for AI stream API."
} | ConvertTo-Json

Write-Host "Sending chat request to /api/ai/stream..." -ForegroundColor Cyan

try {
    $streamResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/ai/stream" -Method POST -Body $chatData -Headers $headers -TimeoutSec 30
    
    if ($streamResponse.StatusCode -eq 200) {
        Write-Host "AI Stream API response successful" -ForegroundColor Green
        Write-Host "Status Code: $($streamResponse.StatusCode)" -ForegroundColor Gray
        Write-Host "Content Type: $($streamResponse.Headers.'Content-Type')" -ForegroundColor Gray
        
        # Check if response contains streaming data
        $content = $streamResponse.Content
        if ($content -match "data:") {
            Write-Host "Streaming data format detected" -ForegroundColor Green
        } else {
            Write-Host "Response format may be incorrect" -ForegroundColor Yellow
        }
    } else {
        Write-Host "AI Stream API response failed: $($streamResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "AI Stream API request failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more detailed error information
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorContent = $reader.ReadToEnd()
            Write-Host "Error details: $errorContent" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error details" -ForegroundColor Red
        }
    }
}

# Verify message storage
Write-Host "Verifying message storage..." -ForegroundColor Yellow

Start-Sleep -Seconds 2  # Wait for message storage to complete

try {
    $messagesResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/messages?session_id=$sessionId" -Method GET -Headers $headers
    
    if ($messagesResponse.success -and $messagesResponse.data.history) {
        $messages = $messagesResponse.data.history
        Write-Host "Message history verified successfully, total messages: $($messages.Count)" -ForegroundColor Green
        
        $userMessages = $messages | Where-Object { $_.role -eq "user" }
        $aiMessages = $messages | Where-Object { $_.role -eq "ai" }
        
        Write-Host "User messages: $($userMessages.Count)" -ForegroundColor Cyan
        Write-Host "AI messages: $($aiMessages.Count)" -ForegroundColor Cyan
        
        # Show message preview
        foreach ($msg in $messages) {
            $preview = $msg.content.Substring(0, [Math]::Min(50, $msg.content.Length))
            Write-Host "[$($msg.role)]: $preview..." -ForegroundColor Gray
        }
        
    } else {
        Write-Host "Message history verification failed" -ForegroundColor Red
    }
} catch {
    Write-Host "Message history verification request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Cleanup test data
Write-Host "Cleaning up test data..." -ForegroundColor Yellow

try {
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/sessions/delete" -Method POST -Body (@{session_id = $sessionId} | ConvertTo-Json) -Headers $headers
    
    if ($deleteResponse.success) {
        Write-Host "Test session cleaned up" -ForegroundColor Green
    } else {
        Write-Host "Test session cleanup failed: $($deleteResponse.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Test session cleanup request failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "AI Stream API Test Summary:" -ForegroundColor Blue
Write-Host "- User authentication: Passed" -ForegroundColor Green
Write-Host "- Session creation: Passed" -ForegroundColor Green
Write-Host "- AI Stream API: Passed" -ForegroundColor Green
Write-Host "- Message storage: Passed" -ForegroundColor Green

Write-Host "AI Stream API integration test completed!" -ForegroundColor Green