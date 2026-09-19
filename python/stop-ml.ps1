$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$found = $false
Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*uvicorn*app.main*" } | ForEach-Object {
  Write-Host "stopping ML service PID $($_.ProcessId)"
  Stop-Process -Id $_.ProcessId -Force
  $found = $true
}
if (-not $found) { Write-Host "no ML service running" }