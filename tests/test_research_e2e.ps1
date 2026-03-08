param (
    [string]$BaseUrl = "http://65.1.92.214:5000",
    [string]$Topic = "What are the core differences between LangChain and LangGraph limit to 3 bullet points?",
    [string]$Depth = "standard"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  DeepResearch E2E Terminal Test" -ForegroundColor Cyan
Write-Host "  Target: $BaseUrl"
Write-Host "  Topic:  $Topic"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Invoke-Api {
    param([string]$Method, [string]$Path, [hashtable]$Headers, [string]$BodyStr)
    $uri = "$BaseUrl$Path"
    if ($Method -eq "GET") {
        return Invoke-RestMethod -Uri $uri -Method Get -Headers $Headers -UseBasicParsing -ErrorAction Stop
    }
    else {
        if ($BodyStr) {
            return Invoke-RestMethod -Uri $uri -Method $Method -Headers $Headers -Body $BodyStr -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        }
        else {
            return Invoke-RestMethod -Uri $uri -Method $Method -Headers $Headers -UseBasicParsing -ErrorAction Stop
        }
    }
}

try {
    # 1. Login or register a test user
    $testUsername = "test_researcher_$(Get-Random)"
    $email = "$testUsername@example.com"
    $pass = "password123!"
    
    Write-Host "[1/5] Registering ephemeral test user ($email)..." -ForegroundColor Yellow
    $regBody = '{"username":"' + $testUsername + '","email":"' + $email + '","password":"' + $pass + '"}'
    $null = Invoke-Api -Method POST -Path "/auth/signup" -Headers @{} -BodyStr $regBody
    
    $loginBody = '{"email":"' + $email + '","password":"' + $pass + '"}'
    $loginData = Invoke-Api -Method POST -Path "/auth/login" -Headers @{} -BodyStr $loginBody
    $token = $loginData.token
    $authHeaders = @{"x-auth-token" = $token; "Content-Type" = "application/json" }
    
    Write-Host "      ✅ Auth acquired." -ForegroundColor Green

    # 2. Create Workspace
    Write-Host "[2/5] Creating Sandbox Workspace..." -ForegroundColor Yellow
    $wsBody = '{"name":"Terminal CLI Test", "description":"Automated research test"}'
    $wsData = Invoke-Api -Method POST -Path "/workspaces" -Headers $authHeaders -BodyStr $wsBody
    $wid = $wsData.workspace.id
    Write-Host "      ✅ Workspace ID: $wid" -ForegroundColor Green

    # 3. Start Research
    Write-Host "[3/5] Dispatching Deep Research Job..." -ForegroundColor Yellow
    $reqBody = @{
        topic = $Topic
        depth = $Depth
    } | ConvertTo-Json
    
    $startData = Invoke-Api -Method POST -Path "/workspaces/$wid/research/start" -Headers $authHeaders -BodyStr $reqBody
    $sessionId = $startData.session_id
    Write-Host "      ✅ Job Queued! Session ID: $sessionId" -ForegroundColor Green

    # 4. Poll Status
    Write-Host "[4/4] Polling execution status every 10 seconds..." -ForegroundColor Yellow
    $statusPath = "/research/status/$sessionId"
    
    $maxTries = 60 # 60 * 10s = 10 minutes timeout
    $tries = 0
    $lastStage = ""
    
    while ($tries -lt $maxTries) {
        $statusData = Invoke-Api -Method GET -Path $statusPath -Headers $authHeaders -BodyStr ""
        $currentStatus = $statusData.status
        $currentStage = $statusData.current_stage
        
        if ($currentStage -ne $lastStage) {
            Write-Host "   -> [State Transition] $currentStage" -ForegroundColor Cyan
            $lastStage = $currentStage
        }
        
        if ($currentStatus -eq "completed") {
            Write-Host "`n✅ Research Completed Successfully!" -ForegroundColor Green
            Write-Host "Report Output:" -ForegroundColor Magenta
            Write-Host "---------------------------------------------------"
            Write-Host $statusData.report_markdown
            Write-Host "---------------------------------------------------"
            exit 0
        }
        elseif ($currentStatus -eq "failed") {
            Write-Host "`n❌ Research Failed!" -ForegroundColor Red
            exit 1
        }
        
        Start-Sleep -Seconds 10
        $tries++
        Write-Host -NoNewline "."
    }
    
    Write-Host "`n⚠️  Timed out waiting for research to complete." -ForegroundColor Yellow
    exit 1

}
catch {
    Write-Host "`n❌ Fatal Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
