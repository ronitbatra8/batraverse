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
echo [2/4] Stopping old backend, ML service, and tunnel...
taskkill /F /IM ngrok.exe >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'uvicorn app\.main' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'node src[\\/]index\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
powershell -NoProfile -Command "$i=0; while((Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue) -and $i -lt 20){ Start-Sleep -Milliseconds 500; $i++ }; exit 0"

echo.
echo [3/4] Starting tunnel, backend, ML service, and frontend...
start "Ngrok Tunnel" /min cmd /c ""%NGRK%" http 5000 --url=%STATIC_URL%"
start "Backend :5000" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%REPO%\server'; node src/index.js"
start "ML :8000" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%REPO%\python'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
start "Frontend :3000" /min cmd /c "cd /d "%REPO%" && npm run dev"

echo.
echo [4/4] Waiting for backend, frontend, tunnel, and ML service...
powershell -NoProfile -Command "Write-Output '  backend: waiting...'; $ok=$false; for($i=0;$i -lt 90;$i++){ try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/health' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if($ok){ Write-Output 'backend:  OK   (http://localhost:5000)' } else { Write-Output 'backend:  FAILED - check the Backend window' }"
powershell -NoProfile -Command "Write-Output '  frontend: waiting...'; $ok=$false; for($i=0;$i -lt 120;$i++){ try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if($ok){ Write-Output 'frontend: OK   (http://localhost:3000)' } else { Write-Output 'frontend: STILL COMPILING - first visit may take a while' }"
powershell -NoProfile -Command "Write-Output '  tunnel: waiting...'; try { $t=Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 5; $u=$t.tunnels[0].public_url; if($u -eq '%TUNNEL_URL%'){ Write-Output ('tunnel:   OK   (' + $u + ')') } else { Write-Output ('tunnel:   URL IS ' + $u + ' - if different from expected, update Vercel env NEXT_PUBLIC_API_URL and redeploy!') } } catch { Write-Output 'tunnel:   NOT UP - ngrok window may need attention' }"
powershell -NoProfile -Command "Write-Output '  ml: waiting for model warm-up (up to 90s)...'; $ok=$false; for($i=0;$i -lt 90;$i++){ try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2; if($r.status -eq 'ok'){ Write-Output ('ml:       OK   (http://localhost:8000, ' + $r.vectors + ' vectors)'); $ok=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){ Write-Output 'ml:       NOT UP YET - check the ML window. Search still works (keyword fallback).' }"

echo.
echo ==========================================================
echo   Site:     https://batraverse.vercel.app
echo   API base: %TUNNEL_URL%/api
echo   Backend:  http://localhost:5000  (see 'Backend' window)
echo   ML:       http://localhost:8000  (see 'ML' window - semantic search)
echo   Frontend: http://localhost:3000  (see 'Frontend' window - dev server)
echo   Tunnel:   %TUNNEL_URL%
echo   You can close this window - backend, ML, frontend, and tunnel keep running.
echo ==========================================================
pause