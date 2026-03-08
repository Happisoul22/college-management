# Start All Services Script for Ganache Local Blockchain

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Starting Academic Analytics System (Ganache)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Stop any hanging node processes just in case
Stop-Process -Name node -ErrorAction SilentlyContinue

# 1. Deploy Contract & Start Backend (Connected to Ganache 7545)
Write-Host "[1/2] Deploying smart contract to Ganache & starting backend..." -ForegroundColor Yellow
$BackendDeployJob = Start-Job {
    Set-Location -Path "$using:PWD\backend"
    npx hardhat run scripts/deploy.js --network localhost
}
Wait-Job -Job $BackendDeployJob | Out-Null
Receive-Job -Job $BackendDeployJob

$BackendRunJob = Start-Job {
    Set-Location -Path "$using:PWD\backend"
    npm run dev
}
Start-Sleep -Seconds 3

# 2. Start Frontend
Write-Host "[2/2] Starting Frontend Dev Server..." -ForegroundColor Yellow
$FrontendJob = Start-Job {
    Set-Location -Path "$using:PWD\frontend"
    npm run dev
}
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "All systems are online!" -ForegroundColor Green
Write-Host "Frontend is at: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend is at:  http://localhost:5000" -ForegroundColor Green
Write-Host "Blockchain is:  Ganache on http://127.0.0.1:7545" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C at any time, or close this window to stop everything." -ForegroundColor Cyan

# Keep console open and wait for user to quit
try {
    Wait-Event -SourceIdentifier "DummyEventThatNeverFires" -Timeout 86400
} catch {
} finally {
    Write-Host "Stopping all background jobs..." -ForegroundColor Red
    Stop-Job -Name *
    Remove-Job -Name *
    Stop-Process -Name node -ErrorAction SilentlyContinue
}
