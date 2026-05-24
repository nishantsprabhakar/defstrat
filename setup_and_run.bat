@echo off
title India Defence Investor Hub - Setup & Launch
color 1F

echo.
echo  =====================================================
echo   India Defence Investor Hub - First-time Setup
echo  =====================================================
echo.

:: ── Check for Python ─────────────────────────────────────────────────────────
where python >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] Python found.
    set PYTHON=python
    goto :install
)

where python3 >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] Python3 found.
    set PYTHON=python3
    goto :install
)

:: Try known install locations
if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    set PYTHON="%LocalAppData%\Programs\Python\Python312\python.exe"
    echo [OK] Found Python 3.12
    goto :install
)
if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
    set PYTHON="%LocalAppData%\Programs\Python\Python311\python.exe"
    echo [OK] Found Python 3.11
    goto :install
)
if exist "%LocalAppData%\Programs\Python\Python310\python.exe" (
    set PYTHON="%LocalAppData%\Programs\Python\Python310\python.exe"
    echo [OK] Found Python 3.10
    goto :install
)
if exist "C:\Python312\python.exe" (
    set PYTHON="C:\Python312\python.exe"
    goto :install
)

:: Winget install
echo.
echo [!] Python not found. Installing via winget...
winget install --id Python.Python.3.12 --source winget --silent --accept-package-agreements --accept-source-agreements
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Auto-install failed.
    echo Please download Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

:: Reload PATH
call refreshenv >nul 2>&1
set PYTHON=python
echo [OK] Python installed.

:install
echo.
echo [*] Installing required packages...
%PYTHON% -m pip install --upgrade pip -q
%PYTHON% -m pip install -r requirements.txt -q
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Package installation failed. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] All packages installed.

:launch
echo.
echo [*] Launching India Defence Investor Hub...
echo     Open your browser at: http://localhost:8501
echo     Press Ctrl+C in this window to stop the app.
echo.
%PYTHON% -m streamlit run app.py --server.port 8501 --browser.gatherUsageStats false
pause
