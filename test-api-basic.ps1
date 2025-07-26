# Basic API Test
Write-Host "Testing basic API functionality..." -ForegroundColor Blue

# Test server health
Write-Host "1. Testing server health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -TimeoutSec 5
    Write-Host "   Server is running (Status: $($healthResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   Server is not running: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test authentication endpoint
Write-Host "2. Testing authentication..." -ForegroundColor Yellow
$loginData = @{
    email = "test@example.com"
    password = "123456"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($authResponse.success) {
        $token = $authResponse.data.token
        Write-Host "   Authentication successful" -ForegroundColor Green
        Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "   Authentication failed: $($authResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Authentication error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test session creation
Write-Host "3. Testing session creation..." -ForegroundColor Yellow
$sessionData = @{
    title = "Basic Test Session"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $sessionResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/sessions" -Method POST -Body $sessionData -Headers $headers
    
    if ($sessionResponse.success) {
        $sessionId = $sessionResponse.data.id
        Write-Host "   Session created successfully" -ForegroundColor Green
        Write-Host "   Session ID: $sessionId" -ForegroundColor Gray
    } else {
        Write-Host "   Session creation failed: $($sessionResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Session creation error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test AI Stream API
Write-Host "4. Testing AI Stream API..." -ForegroundColor Yellow
$chatData = @{
    session_id = $sessionId
    query = "Hello, this is a basic test."
} | ConvertTo-Json

try {
    Write-Host "   Sending request to /api/ai/stream..." -ForegroundColor Cyan
    $streamResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/ai/stream" -Method POST -Body $chatData -Headers $headers -TimeoutSec 30
    
    Write-Host "   Response Status: $($streamResponse.StatusCode)" -ForegroundColor Gray
    Write-Host "   Content Type: $($streamResponse.Headers.'Content-Type')" -ForegroundColor Gray
    
    if ($streamResponse.StatusCode -eq 200) {
        Write-Host "   AI Stream API responded successfully" -ForegroundColor Green
        
        # Check if response contains streaming data
        $content = $streamResponse.Content
        if ($content -match "data:") {
            Write-Host "   Streaming data format detected" -ForegroundColor Green
            
            # Try to extract first data chunk
            if ($content -match 'data: ({.*?})') {
                $firstChunk = $matches[1]
                Write-Host "   First chunk: $firstChunk" -ForegroundColor Gray
            }
        } else {
            Write-Host "   Warning: Response may not be in streaming format" -ForegroundColor Yellow
            Write-Host "   Response preview: $($content.Substring(0, [Math]::Min(200, $content.Length)))..." -ForegroundColor Gray
        }
    } else {
        Write-Host "   AI Stream API failed with status: $($streamResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "   AI Stream API error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get detailed error information
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorContent = $reader.ReadToEnd()
            Write-Host "   Error details: $errorContent" -ForegroundColor Red
        } catch {
            Write-Host "   Could not read error details" -ForegroundColor Red
        }
    }
}

# Cleanup
Write-Host "5. Cleaning up..." -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/sessions/delete" -Method POST -Body (@{session_id = $sessionId} | ConvertTo-Json) -Headers $headers
    if ($deleteResponse.success) {
        Write-Host "   Test session cleaned up" -ForegroundColor Green
    }
} catch {
    Write-Host "   Cleanup warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "Basic API test completed!" -ForegroundColor Blue