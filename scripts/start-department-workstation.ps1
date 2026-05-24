$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root "backend\Bazap.API"
$frontendDir = Join-Path $root "frontend"

Write-Host "Starting Bazap inspection workstation..." -ForegroundColor Green

Start-Process -FilePath "dotnet" `
  -ArgumentList @("run", "--urls", "http://127.0.0.1:5001") `
  -WorkingDirectory $apiDir `
  -WindowStyle Hidden

Start-Sleep -Seconds 3

Start-Process -FilePath "powershell" `
  -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "`$env:VITE_API_BASE_URL='http://127.0.0.1:5001/api'; npm.cmd run dev -- --host 127.0.0.1 --port 5174"
  ) `
  -WorkingDirectory $frontendDir `
  -WindowStyle Hidden

Start-Sleep -Seconds 4
Start-Process "http://127.0.0.1:5174"

Write-Host "Workstation is running at http://127.0.0.1:5174" -ForegroundColor Green
