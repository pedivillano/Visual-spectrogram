@echo off
title Piano Server v35

echo ============================================
echo         Starting Piano Server v35
echo ============================================
echo.

echo Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Starting server...
cd /d %~dp0\server
start "Piano Server v35" cmd /k npm start

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo.
echo Piano Server v35 started!
echo Browser will open at http://localhost:3000
echo.
echo Press any key to exit...
pause >nul