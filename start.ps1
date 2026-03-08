# Start All Services Script for Academic Analytics System

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Starting Academic Analytics System" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Stop any hanging node processes just in case
Stop-Process -Name node -ErrorAction SilentlyContinue

# 1. Start Hardhat Node
Write-Host "[1/3] Starting Local Blockchain..." -ForegroundColor Yellow
$NodeJob = Start-Job {
    Set-Location -Path "$using:PWD\backend"
    npx hardhat node
}
Start-Sleep -Seconds 5

# 2. Deploy Contract & Start Backend
Write-Host "[2/3] Deploying smart contract & starting backend server..." -ForegroundColor Yellow
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

# 3. Start Frontend
Write-Host "[3/3] Starting Frontend Dev Server..." -ForegroundColor Yellow
$FrontendJob = Start-Job {
    Set-Location -Path "$using:PWD\frontend"
    npm run dev
}
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "All systems are online!" -ForegroundColor Green
Write-Host "Frontend is at: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend is at:  http://localhost:5000" -ForegroundColor Green
Write-Host "Blockchain is:  http://127.0.0.1:8545" -ForegroundColor Green
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
