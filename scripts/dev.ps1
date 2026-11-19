Write-Host "StockGuard dev — API :8800, web :5173" -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot

Start-Process pwsh -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root\services\api'; uv sync; uv run uvicorn app.main:app --reload --port 8800"
)

Start-Process pwsh -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root\apps\web'; npm install; npm run dev"
)

Write-Host "Two windows opened. Open http://localhost:5173" -ForegroundColor Green
