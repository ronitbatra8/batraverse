param(
  [string]$Port = "8000"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Join-Path $root ".venv\Scripts\python.exe"

try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
  Write-Host "ML service already running on :$Port (vectors=$($h.vectors))"
  exit 0
} catch { }

if (-not (Test-Path -LiteralPath $py)) {
  Write-Host "venv not found. Run:"
  Write-Host "  python -m venv .venv"
  Write-Host "  .venv\Scripts\pip install -r requirements.txt"
  exit 1
}

Start-Process -FilePath $py -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", $Port -WorkingDirectory $root -WindowStyle Hidden
Write-Host "Starting ML service on :$Port ..."

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
    Write-Host "OK: vectors=$($h.vectors)"
    exit 0
  } catch { }
}
Write-Host "Timed out waiting for :$Port"
exit 1