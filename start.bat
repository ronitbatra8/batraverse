@echo off
setlocal

echo ========================================
echo   BATRAVERSE - Restart All Servers
echo ========================================
echo.

:: Kill backend (port 5000)
echo Checking port 5000 (backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo   Killing PID %%a ...
    taskkill /F /PID %%a >nul 2>&1
)
echo   Done.
echo.

:: Kill ML service (port 8000)
echo Checking port 8000 (ML service)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo   Killing PID %%a ...
    taskkill /F /PID %%a >nul 2>&1
)
echo   Done.
echo.

:: Kill frontend (port 3000)
echo Checking port 3000 (frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Killing PID %%a ...
    taskkill /F /PID %%a >nul 2>&1
)
echo   Done.
echo.

:: Wait a moment for ports to free up
timeout /t 2 /nobreak >nul

:: Start ML service (embeds + semantic search; warms the model for ~30-45s)
echo Starting ML service on port 8000...
start "BATRAVERSE-ML" cmd /c "cd /d D:\sites\BATRAVERSE\python && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo.

:: Start backend
echo Starting backend on port 5000...
start "BATRAVERSE-BACKEND" cmd /c "cd /d D:\sites\BATRAVERSE && node server\src\index.js"
echo.

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend
echo Starting frontend on port 3000...
start "BATRAVERSE-FRONTEND" cmd /c "cd /d D:\sites\BATRAVERSE && npm run dev"
echo.

:: Wait for ML service to finish warming the model
echo Waiting for ML service to be ready...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 120;$i++){ try { $r=Invoke-RestMethod -Uri 'http://localhost:8000/health' -TimeoutSec 2; if($r.status -eq 'ok'){ Write-Output '  ML service OK  (port 8000)'; $ok=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){ Write-Output '  ML service NOT UP after 2 minutes - check the BATRAVERSE-ML window' }"

echo.
echo ========================================
echo   All servers starting!
echo   ML:       http://localhost:8000
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Close this window anytime - servers run independently.
pause