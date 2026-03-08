param (
    [string]$BaseUrl = "http://65.1.92.214:5000",
    [string]$AdminKey = "dr_admin_super_secret_108"
)

$ErrorActionPreference = "Stop"

# Test Results Counter
$global:Pass = 0
$global:Fail = 0
$global:TestResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers,
        [string]$BodyStr
    )
    
    $uri = "$BaseUrl$Path"
    Write-Host -NoNewline "Testing: $Name ($Method $Path)... "
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $uri -Method Get -Headers $Headers -UseBasicParsing
        }
        else {
            if ($BodyStr) {
                $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $Headers -Body $BodyStr -ContentType "application/json" -UseBasicParsing
            }
            else {
                $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $Headers -UseBasicParsing
            }
        }
        Write-Host "✅ PASSED" -ForegroundColor Green
        $global:Pass++
        $global:TestResults += [PSCustomObject]@{Name = $Name; Path = $Path; Status = "PASS"; Error = $null }
        return $response
    }
    catch {
        Write-Host "❌ FAILED" -ForegroundColor Red
        $errorMsg = $_.Exception.Message
        if ($_.ErrorDetails) {
            $errorMsg += " - " + $_.ErrorDetails.Message
        }
        Write-Host "   ERROR: $errorMsg" -ForegroundColor DarkRed
        $global:Fail++
        $global:TestResults += [PSCustomObject]@{Name = $Name; Path = $Path; Status = "FAIL"; Error = $errorMsg }
        return $null
    }
}

Write-Host "========================================="
Write-Host "DeepResearch System Test Suite"
Write-Host "Target: $BaseUrl"
Write-Host "========================================="
Write-Host ""

# 1. Base Health
Test-Endpoint -Name "Backend API Health" -Method "GET" -Path "/health" -Headers @{}
Test-Endpoint -Name "AI Engine Health (via proxy)" -Method "GET" -Path "/agents" -Headers @{}

# 2. Auth Flow
$headers = @{}
$testUserEmail = "testuser_$(Get-Random)@example.com"
$testPassword = "password123!"

$testUsername = "testuser_$(Get-Random)"
$registerBody = '{"username":"' + $testUsername + '","email":"' + $testUserEmail + '","password":"' + $testPassword + '"}'
Test-Endpoint -Name "Signup" -Method "POST" -Path "/auth/signup" -Headers $headers -BodyStr $registerBody

$loginBody = '{"email":"' + $testUserEmail + '","password":"' + $testPassword + '"}'
$loginResp = Test-Endpoint -Name "Login" -Method "POST" -Path "/auth/login" -Headers $headers -BodyStr $loginBody

$authToken = ""
if ($loginResp -and $loginResp.token) {
    $authToken = $loginResp.token
    Write-Host "   -> Extracted Auth Token: $($authToken.Substring(0, 15))..." -ForegroundColor Cyan
}
else {
    Write-Host "   -> Failed to extract Auth Token. Protected endpoints may fail." -ForegroundColor Yellow
}

# 3. Protected Endpoints (Auth)
$authHeaders = @{"x-auth-token" = $authToken }
Test-Endpoint -Name "Get Current User" -Method "GET" -Path "/auth/me" -Headers $authHeaders

# 4. Admin Endpoints
$adminHeaders = @{"x-admin-key" = $AdminKey }
Test-Endpoint -Name "Admin: Overview Stats" -Method "GET" -Path "/admin/stats/overview" -Headers $adminHeaders
Test-Endpoint -Name "Admin: List Users" -Method "GET" -Path "/admin/users" -Headers $adminHeaders
Test-Endpoint -Name "Admin: List Keys" -Method "GET" -Path "/admin/api-keys" -Headers $adminHeaders

# 5. Connective Tissues & Agents
$agentHeaders = @{"Content-Type" = "application/json" }
Test-Endpoint -Name "Test Search Provider" -Method "POST" -Path "/agents/providers/test" -Headers $agentHeaders -BodyStr '{"provider": "arxiv", "query": "test query"}'
Test-Endpoint -Name "Test Topic Discovery" -Method "POST" -Path "/agents/topic_discovery/test" -Headers $agentHeaders -BodyStr '{"task": "test topic", "options": {}}'

# 6. Workspaces
Test-Endpoint -Name "List Workspaces" -Method "GET" -Path "/workspaces" -Headers $authHeaders
Test-Endpoint -Name "Create Workspace" -Method "POST" -Path "/workspaces" -Headers $authHeaders -BodyStr '{"name": "E2E Test Workspace", "description": "Automated test"}'

Write-Host ""
Write-Host "========================================="
Write-Host "TEST SUMMARY"
Write-Host "========================================="
Write-Host "Passed: $global:Pass" -ForegroundColor Green
Write-Host "Failed: $global:Fail" -ForegroundColor Red
Write-Host "Total:  $($global:Pass + $global:Fail)"

if ($global:Fail -gt 0) {
    Write-Host "`nFailing Endpoints Summary:" -ForegroundColor Yellow
    $global:TestResults | Where-Object { $_.Status -eq "FAIL" } | Format-Table -Property Name, Path, Error -AutoSize
    exit 1
}
else {
    Write-Host "`nAll tests passed successfully! Go for production!" -ForegroundColor Green
    exit 0
}
