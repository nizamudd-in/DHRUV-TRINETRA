@echo off
setlocal
cd /d "%~dp0"

echo =========================================================================
echo    POLARTWIN - Digital Twin Platform for Antarctic Research Stations
echo    MoES / NCPOR - Problem Statement ID: 26060 (Smart India Hackathon)
echo =========================================================================
echo.

:: Check if port 8000 is already in use
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] FastAPI backend is already running on http://127.0.0.1:8000
) else (
    echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
    start "PolarTwin Backend (FastAPI)" cmd /k "cd /d ""%~dp0"" && python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
)

:: Check if port 5173 is already in use
netstat -ano | findstr :5173 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Vite frontend server is already running on http://127.0.0.1:5173
) else (
    echo [2/2] Launching Vite React Frontend on http://127.0.0.1:5173 ...
    start "PolarTwin Frontend (Vite + React)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 127.0.0.1 --port 5173"
)

echo.
echo Waiting for servers to initialize...
ping 127.0.0.1 -n 4 >nul

echo Opening PolarTwin Mission Control in your default browser...
start http://127.0.0.1:5173/

echo.
echo =========================================================================
echo  PolarTwin is ACTIVE and RUNNING!
echo  Web Command Center: http://127.0.0.1:5173/
echo  Backend API Docs:   http://127.0.0.1:8000/docs
echo =========================================================================
echo.
pause
