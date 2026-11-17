@echo off
title My Vault Launcher
color 0E

echo =====================================================================
echo                     MY VAULT — LOCAL-FIRST ENGINE
echo      Decoupled High-DPI PDF Study Environment ^& Scholarly Vault
echo =====================================================================
echo.

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend
set FRONTEND_DIR=%SCRIPT_DIR%frontend

:: 1. Ensure Backend Environment
echo [*] Checking Python Virtual Environment...
if not exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
    echo [*] Creating virtualenv in %BACKEND_DIR%\venv...
    py -m venv "%BACKEND_DIR%\venv" || python -m venv "%BACKEND_DIR%\venv"
    echo [*] Installing backend dependencies...
    "%BACKEND_DIR%\venv\Scripts\python.exe" -m pip install -r "%BACKEND_DIR%\requirements.txt"
)

:: 2. Initialize and Seed Vault Data if first run
echo [*] Verifying Athenaeum Study Vault...
"%BACKEND_DIR%\venv\Scripts\python.exe" "%BACKEND_DIR%\seed_data.py"

:: 3. Launch Backend API Server (Port 8000)
echo [*] Launching Uvicorn FastAPI Backend on http://127.0.0.1:8000 ...
start "Athenaeum Backend (FastAPI)" /D "%BACKEND_DIR%" cmd /k "venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

:: 4. Launch Frontend (Port 5173)
echo [*] Launching Vite Frontend on http://localhost:5173 ...
start "Athenaeum Frontend (Vite)" /D "%FRONTEND_DIR%" cmd /k "call npm.cmd run dev"

:: 5. Open Web Browser
timeout /t 3 /nobreak >nul
echo [*] Opening Athenaeum Studio in browser...
start http://localhost:5173

echo.
echo =====================================================================
echo    Athenaeum Studio is actively running!
echo    - Frontend UI : http://localhost:5173
echo    - Backend API : http://127.0.0.1:8000
echo    - API Swagger : http://127.0.0.1:8000/docs
echo.
echo    Close the terminal windows or press Ctrl+C to terminate services.
echo =====================================================================
pause
