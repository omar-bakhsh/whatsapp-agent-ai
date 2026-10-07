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
            try {
                execSync('powershell -NoProfile -Command "Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*puppeteer*\' } | Stop-Process -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
            } catch (e) {}
        }
        // تنظيف ملفات القفل العالقة في مجلد الجلسة
        const lockfile1 = path.join(__dirname, '.wwebjs_auth', 'session', 'lockfile');
        const lockfile2 = path.join(__dirname, '.wwebjs_auth', 'session', 'Default', 'LOCK');
        if (fs.existsSync(lockfile1)) {
            try { fs.unlinkSync(lockfile1); } catch (e) {}
        }
        if (fs.existsSync(lockfile2)) {
            try { fs.unlinkSync(lockfile2); } catch (e) {}
        }
    } catch (e) {}
}

let childProcess = null;
let restartsCount = 0;
let lastRestartTime = Date.now();
let isExiting = false;

function startBot() {
    if (isExiting) return;

    log('🚀 Starting WhatsApp AI Bot...');
    cleanLingeringChrome();

    childProcess = spawn('node', ['index.js'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });

    childProcess.on('error', (err) => {
        log(`❌ Process execution error: ${err.message}`);
    });

    childProcess.on('exit', (code, signal) => {
        if (isExiting) {
            log('Supervisor stopped cleanly.');
            process.exit(0);
        }

        const now = Date.now();
        if (now - lastRestartTime < 60000) {
            restartsCount++;
        } else {
            restartsCount = 1;
        }
        lastRestartTime = now;

        log(`⚠️ Bot process exited (code: ${code}, signal: ${signal}).`);

        const delay = Math.min(30000, 3000 * Math.min(restartsCount, 10));
        log(`⏳ Auto-restarting bot in ${delay / 1000} seconds...`);

        setTimeout(() => {
            startBot();
        }, delay);
    });
}

function handleSignal(signal) {
    log(`🛑 Signal received (${signal}). Stopping bot and supervisor safely...`);
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
log('🛡️ 24/7 Watchdog and Auto-Supervisor active');
log('==================================================');
startBot();
