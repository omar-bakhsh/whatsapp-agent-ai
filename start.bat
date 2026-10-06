@echo off
chcp 65001 >nul
title WhatsApp AI Agent - متخصص مازدا
echo =======================================================
echo       نظام بوت واتساب الذكي - مركز متخصص مازدا
echo             وضع الحماية والتشغيل المستمر 24/7
echo =======================================================

:: إنهاء أي عمليات متصفح عالقة قد تسبب تداخل
taskkill /f /im chrome.exe /fi "memusage lt 120000" >nul 2>&1

:: تنظيف ملفات التخزين المؤقت لضمان بداية نظيفة
if exist ".wwebjs_cache" (
    echo [System] تنظيف ملفات الكاش المؤقتة...
    rmdir /s /q ".wwebjs_cache"
)

echo [System] جاري بدء التشغيل مع نظام المراقبة التلقائية...
node supervisor.js
pause
