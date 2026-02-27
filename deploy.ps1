Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 DEEP RESEARCH PLATFORM - FULL DEPLOY" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# ── CONFIG ──────────────────────────────────────────
$PROJECT_NAME = "deep-research-platform"

# ── LOGIN ───────────────────────────────────────────
Write-Host "🔐 Step 1: Login to Railway..." -ForegroundColor Yellow
railway login

# ── CREATE PROJECT ──────────────────────────────────
Write-Host "`n📁 Step 2: Creating Railway project..." -ForegroundColor Yellow
railway init --name $PROJECT_NAME

# ── DEPLOY API ──────────────────────────────────────
Write-Host "`n🔧 Step 3: Deploying API service..." -ForegroundColor Yellow
Push-Location backend/api

railway up `
  --service api `
  --environment production `
  -d

Write-Host "⚙️  Setting API environment variables..." -ForegroundColor Yellow
$apiVars = Get-Content "../../env.api.json" | ConvertFrom-Json
foreach ($var in $apiVars.PSObject.Properties) {
    railway variables set "$($var.Name)=$($var.Value)" --service api
}

Write-Host "🌐 Generating API domain..." -ForegroundColor Yellow
railway domain --service api

Pop-Location

# ── DEPLOY WORKER ────────────────────────────────────
Write-Host "`n🔧 Step 4: Deploying Worker service..." -ForegroundColor Yellow
Push-Location backend/worker

railway up `
  --service worker `
  --environment production `
  -d

Write-Host "⚙️  Setting Worker environment variables..." -ForegroundColor Yellow
$workerVars = Get-Content "../../env.worker.json" | ConvertFrom-Json
foreach ($var in $workerVars.PSObject.Properties) {
    railway variables set "$($var.Name)=$($var.Value)" --service worker
}

Pop-Location

# ── DEPLOY AI ENGINE ─────────────────────────────────
Write-Host "`n🔧 Step 5: Deploying AI Engine service..." -ForegroundColor Yellow
Push-Location ai_engine

railway up `
  --service ai_engine `
  --environment production `
  -d

Write-Host "⚙️  Setting AI Engine environment variables..." -ForegroundColor Yellow
$aiVars = Get-Content "../env.ai_engine.json" | ConvertFrom-Json
foreach ($var in $aiVars.PSObject.Properties) {
    railway variables set "$($var.Name)=$($var.Value)" --service ai_engine
}

Write-Host "🌐 Generating AI Engine domain..." -ForegroundColor Yellow
railway domain --service ai_engine

Pop-Location

# ── DONE ─────────────────────────────────────────────
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "✅ ALL SERVICES DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Check your Railway dashboard for live URLs." -ForegroundColor Green
Write-Host "Dashboard: https://railway.app/dashboard" -ForegroundColor Green
