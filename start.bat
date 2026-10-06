@echo off
title WhatsApp AI Agent - Mazda Specialist
echo =======================================================
echo          WhatsApp AI Agent - Auto Supervisor
echo =======================================================

taskkill /f /im chrome.exe /fi "memusage lt 150000" >nul 2>&1

if exist ".wwebjs_cache" (
    rmdir /s /q ".wwebjs_cache" >nul 2>&1
)

node supervisor.js
pause
