param (
    [switch]$WithCloudflare
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   DeepResearch Local Start Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = $PSScriptRoot

# 1. Start AI Engine
Write-Host "[1/3] Starting Python AI Engine (FastAPI) on port 8000..." -ForegroundColor Yellow
$aiEnginePath = Join-Path $rootPath "ai_engine"
Start-Process "cmd.exe" -ArgumentList "/c cd `"$aiEnginePath`" && python -m uvicorn main:app --port 8000 --reload" -WindowStyle Normal

Start-Sleep -Seconds 5

# 2. Start Node Backend
Write-Host "[2/3] Starting Node.js Backend API on port 5000..." -ForegroundColor Yellow
$backendPath = Join-Path $rootPath "backend"
Start-Process "cmd.exe" -ArgumentList "/c cd `"$backendPath`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 5

# 3. Optional: Cloudflare Tunnel
if ($WithCloudflare) {
    Write-Host "[3/3] Starting Cloudflare Tunnel pointing to localhost:5000..." -ForegroundColor Yellow
    Write-Host "A new window will open. Look for the 'https://*.trycloudflare.com' URL in that window." -ForegroundColor Yellow
    Start-Process "cmd.exe" -ArgumentList "/c cloudflared tunnel --url http://localhost:5000" -WindowStyle Normal
} else {
    Write-Host "Skipping Cloudflare Tunnel (use -WithCloudflare to enable)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ All services started in separate windows." -ForegroundColor Green
Write-Host "Backend API:    http://localhost:5000"
Write-Host "AI Engine API:  http://localhost:8000"
Write-Host "To stop them, simply close the command prompt windows." -ForegroundColor Gray
