@echo off
chcp 65001 >nul
title 钢琴服务器 - 版本32

echo ============================================
echo           启动钢琴服务器 - 版本32
echo ============================================
echo.

echo 正在停止现有服务器...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo 正在启动服务器...
cd /d %~dp0\server
start "钢琴服务器 - 版本32" cmd /k npm start

echo 等待服务器启动...
timeout /t 3 /nobreak >nul

echo 正在打开浏览器...
start http://localhost:3000

echo.
echo 版本32服务器已启动！
echo 浏览器将自动打开 http://localhost:3000
echo.
echo 按任意键退出此窗口...
pause >nul