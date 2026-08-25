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

echo ========================================
echo   Both servers starting!
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Close this window anytime - servers run independently.
pause
