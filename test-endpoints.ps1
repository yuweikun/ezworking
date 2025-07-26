# Test API endpoints accessibility
Write-Host "Testing API endpoints..." -ForegroundColor Green

$endpoints = @(
    @{ Method = "POST"; Url = "http://localhost:3000/api/auth/login"; Body = '{"email":"test@example.com","password":"123456"}' },
    @{ Method = "POST"; Url = "http://localhost:3000/api/auth/register"; Body = '{"email":"test@example.com","password":"123456"}' },
    @{ Method = "GET"; Url = "http://localhost:3000/api/sessions"; Body = $null },
    @{ Method = "GET"; Url = "http://localhost:3000/api/messages?session_id=test-id"; Body = $null }
)

foreach ($endpoint in $endpoints) {
    Write-Host "`nTesting $($endpoint.Method) $($endpoint.Url)" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $endpoint.Url
            Method = $endpoint.Method
            Headers = @{"Content-Type"="application/json"}
            UseBasicParsing = $true
        }
        
        if ($endpoint.Body) {
            $params.Body = $endpoint.Body
        }
        
        $response = Invoke-WebRequest @params
        Write-Host "Success - Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Accessible - Status: $statusCode" -ForegroundColor Green
        
        if ($statusCode -eq 404) {
            Write-Host "ERROR - 404 Route not found" -ForegroundColor Red
        }
    }
}