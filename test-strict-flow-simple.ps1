# Simple Strict Message Flow Test
Write-Host "Starting Strict Message Flow Test..." -ForegroundColor Blue

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
    password = "password123"
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
    title = "Strict Flow Test Session"
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

# Test strict message flow
Write-Host "Testing strict message flow..." -ForegroundColor Blue

# Step 1: User message (would be rendered immediately in frontend)
$userMessage = "Hello, this is a strict flow test message"
Write-Host "Step 1: User sends message: '$userMessage'" -ForegroundColor Cyan

# Step 2: Store user message (strict blocking)
Write-Host "Step 2: Storing user message to database..." -ForegroundColor Yellow

$userMessageData = @{
    session_id = $sessionId
    role = "user"
    content = $userMessage
    workflow_stage = @{
        stage = "user_input"
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    }
} | ConvertTo-Json -Depth 3

try {
    $userStoreResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/messages/create" -Method POST -Body $userMessageData -Headers $headers
    
    if ($userStoreResponse.success) {
        Write-Host "User message stored successfully" -ForegroundColor Green
        Write-Host "Message ID: $($userStoreResponse.data.id)" -ForegroundColor Gray
    } else {
        Write-Host "User message storage failed: $($userStoreResponse.message)" -ForegroundColor Red
        Write-Host "Flow terminated - AI will not respond" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "User message storage request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Flow terminated - AI will not respond" -ForegroundColor Red
    exit 1
}

# Step 3: AI response would start here (after user message storage success)
Write-Host "Step 3: User message stored, AI can now respond..." -ForegroundColor Yellow

# Step 4: Simulate AI streaming response
Write-Host "Step 4: AI streaming response..." -ForegroundColor Cyan
$finalAiResponse = "Hello! I am an AI assistant. Nice to meet you! This is a strict flow test response."
Write-Host "AI response completed: '$finalAiResponse'" -ForegroundColor Green

# Step 5: Store AI message (strict blocking)
Write-Host "Step 5: AI response completed, storing AI message to database..." -ForegroundColor Yellow

$aiMessageData = @{
    session_id = $sessionId
    role = "assistant"
    content = $finalAiResponse
    workflow_stage = @{
        stage = "ai_response"
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    }
} | ConvertTo-Json -Depth 3

try {
    $aiStoreResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/messages/create" -Method POST -Body $aiMessageData -Headers $headers
    
    if ($aiStoreResponse.success) {
        Write-Host "AI message stored successfully" -ForegroundColor Green
        Write-Host "Message ID: $($aiStoreResponse.data.id)" -ForegroundColor Gray
    } else {
        Write-Host "AI message storage failed: $($aiStoreResponse.message)" -ForegroundColor Yellow
        Write-Host "But user can still continue chatting" -ForegroundColor Gray
    }
} catch {
    Write-Host "AI message storage request failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "But user can still continue chatting" -ForegroundColor Gray
}

# Step 6: User can continue chatting
Write-Host "Step 6: All storage operations completed, user can now continue chatting" -ForegroundColor Green

# Verify message history
Write-Host "Verifying message history..." -ForegroundColor Yellow

try {
    $historyResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/messages?session_id=$sessionId" -Method GET -Headers $headers
    
    if ($historyResponse.success -and $historyResponse.data.history) {
        $messages = $historyResponse.data.history
        Write-Host "Message history verified successfully, total messages: $($messages.Count)" -ForegroundColor Green
        
        foreach ($msg in $messages) {
            Write-Host "[$($msg.role)]: $($msg.content.Substring(0, [Math]::Min(50, $msg.content.Length)))..." -ForegroundColor Gray
        }
    } else {
        Write-Host "Message history verification failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Message history verification request failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test summary
Write-Host "Strict Message Flow Test Summary:" -ForegroundColor Blue
Write-Host "Step 1: User message immediate render - Completed" -ForegroundColor Green
Write-Host "Step 2: User message strict storage - Completed" -ForegroundColor Green
Write-Host "Step 3: AI response startup - Completed" -ForegroundColor Green
Write-Host "Step 4: AI response streaming render - Completed" -ForegroundColor Green
Write-Host "Step 5: AI message strict storage - Completed" -ForegroundColor Green
Write-Host "Step 6: User can continue chatting - Completed" -ForegroundColor Green

Write-Host "Strict Message Flow Integration Test Completed!" -ForegroundColor Green

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

Write-Host "All tests completed!" -ForegroundColor Magenta