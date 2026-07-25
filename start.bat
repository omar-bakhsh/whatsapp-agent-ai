@echo off
title WhatsApp AI Agent
echo =========================================
echo       Starting WhatsApp AI Agent
echo =========================================

:: إنهاء أي عمليات متصفح عالقة قد تسبب تداخل
taskkill /f /im chrome.exe /fi "memusage lt 100000" >nul 2>&1

:: تنظيف ملفات التخزين المؤقت لضمان بداية نظيفة
if exist ".wwebjs_cache" (
    echo [System] Cleaning browser cache...
    rmdir /s /q ".wwebjs_cache"
)

echo [System] Working on Node.js...
node index.js
pause
