const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const SUPERVISOR_LOG = path.join(LOGS_DIR, 'supervisor.log');

function log(msg) {
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const line = `[Supervisor ${time}] ${msg}\n`;
    process.stdout.write(line);
    try {
        fs.appendFileSync(SUPERVISOR_LOG, line, 'utf8');
    } catch (e) {}
}

function cleanLingeringChrome() {
    try {
        if (process.platform === 'win32') {
            execSync('taskkill /f /im chrome.exe /fi "memusage lt 120000" >nul 2>&1');
        }
    } catch (e) {}
}

let childProcess = null;
let restartsCount = 0;
let lastRestartTime = Date.now();
let isExiting = false;

function startBot() {
    if (isExiting) return;

    log('🚀 جاري بدء تشغيل بوت واتساب الذكي...');
    cleanLingeringChrome();

    childProcess = spawn('node', ['index.js'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });

    childProcess.on('error', (err) => {
        log(`❌ خطأ في تشغيل العملية: ${err.message}`);
    });

    childProcess.on('exit', (code, signal) => {
        if (isExiting) {
            log('تم إيقاف المراقب بنجاح.');
            process.exit(0);
        }

        const now = Date.now();
        if (now - lastRestartTime < 60000) {
            restartsCount++;
        } else {
            restartsCount = 1;
        }
        lastRestartTime = now;

        log(`⚠️ توقفت عملية البوت (كود: ${code}, إشارة: ${signal}).`);

        const delay = Math.min(30000, 3000 * Math.min(restartsCount, 10));
        log(`⏳ سيتم إعادة التشغيل التلقائي بعد ${delay / 1000} ثانية...`);

        setTimeout(() => {
            startBot();
        }, delay);
    });
}

function handleSignal(signal) {
    log(`🛑 استلام إشارة (${signal}). جاري إيقاف البوت والمراقب بأمان...`);
    isExiting = true;
    if (childProcess) {
        childProcess.kill(signal);
    }
    setTimeout(() => {
        process.exit(0);
    }, 3000);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

log('==================================================');
log('🛡️ تم تفعيل نظام المراقبة والحماية التلقائية 24/7');
log('==================================================');
startBot();
