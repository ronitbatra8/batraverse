@echo off
setlocal
title BATRAVERSE Testing - Day Start

set "REPO=D:\sites\BATRAVERSE"
set "STATIC_URL=sloping-filled-july.ngrok-free.dev"
set "TUNNEL_URL=https://sloping-filled-july.ngrok-free.dev"
set "NGRK=C:\Users\batra\AppData\Local\ngrok\bin\ngrok.exe"

cd /d "%REPO%"
if errorlevel 1 (
  echo ERROR: Cannot find %REPO%
  pause
  exit /b 1
)

echo ==========================================================
echo   BATRAVERSE ^- Testing environment daily start
echo ==========================================================

echo.
echo [1/4] Pushing latest code to GitHub (Vercel auto-deploys)...
git add -A
git diff --cached --quiet
if errorlevel 1 git commit -m "auto: sync latest changes"
git push origin main

echo.
echo [2/4] Stopping old backend and tunnel...
taskkill /F /IM ngrok.exe >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'node src[\\/]index\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
powershell -NoProfile -Command "$i=0; while((Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue) -and $i -lt 20){ Start-Sleep -Milliseconds 500; $i++ }; exit 0"

echo.
echo [3/4] Starting tunnel and backend...
start "Ngrok Tunnel" /min cmd /c ""%NGRK%" http 5000 --url=%STATIC_URL%"
start "Backend :5000" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%REPO%\server'; node src/index.js"

echo.
echo [4/4] Waiting for backend and tunnel to come up...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if($ok){ Write-Output 'backend:  OK   (http://localhost:5000)' } else { Write-Output 'backend:  FAILED - check the Backend window' }"
powershell -NoProfile -Command "try { $t=Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 5; $u=$t.tunnels[0].public_url; if($u -eq '%TUNNEL_URL%'){ Write-Output ('tunnel:   OK   (' + $u + ')') } else { Write-Output ('tunnel:   URL IS ' + $u + ' - if different from expected, update Vercel env NEXT_PUBLIC_API_URL and redeploy!') } } catch { Write-Output 'tunnel:   NOT UP - ngrok window may need attention' }"

echo.
echo ==========================================================
echo   Site:     https://batraverse.vercel.app
echo   API base: %TUNNEL_URL%/api
echo   Backend:  http://localhost:5000  (see 'Backend' window)
echo   Tunnel:   %TUNNEL_URL%
echo   You can close this window - backend and tunnel keep running.
echo ==========================================================
pause