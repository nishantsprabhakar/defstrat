@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=node"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

start "DefStrat Dashboard Server" /min "%NODE_EXE%" server.mjs
timeout /t 2 /nobreak >nul
start "" "http://localhost:4173"

echo DefStrat Dashboard is running at http://localhost:4173
echo Close the server window or run Stop DefStrat Dashboard.cmd to stop it.
pause
