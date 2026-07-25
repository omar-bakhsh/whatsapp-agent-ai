const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'agent.db');
const db = new Database(dbPath);

// تهيئة قاعدة البيانات والجداول
function initDb() {
    // جدول الجلسات (تاريخ المحادثة)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
            userId TEXT PRIMARY KEY,
            history TEXT,
            standbyUntil DATETIME,
            lastUpdate DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // إضافة العمود إذا لم يكن موجوداً (للمشاريع القائمة)
    try {
        db.prepare("ALTER TABLE sessions ADD COLUMN standbyUntil DATETIME").run();
    } catch (e) {}

    // جدول التذكيرات
    db.prepare(`
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            apptDate TEXT,
            reminderDate TEXT,
            status TEXT DEFAULT 'pending'
        )
    `).run();

    // جدول المواعيد (للإحصائيات)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            apptDate TEXT,
            branch TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // جدول سجل البث الترويجي
    db.prepare(`
        CREATE TABLE IF NOT EXISTS broadcasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sentCount INTEGER,
            message TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
}

// وظائف الجلسات
function getHistory(userId) {
    const row = db.prepare('SELECT history FROM sessions WHERE userId = ?').get(userId);
    return row ? JSON.parse(row.history) : [];
}

function saveHistory(userId, history) {
    const historyJson = JSON.stringify(history);
    db.prepare(`
        INSERT INTO sessions (userId, history, lastUpdate)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(userId) DO UPDATE SET
            history = excluded.history,
            lastUpdate = CURRENT_TIMESTAMP
    `).run(userId, historyJson);
}

function setStandby(userId, hours) {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    db.prepare(`
        INSERT INTO sessions (userId, standbyUntil)
        VALUES (?, ?)
        ON CONFLICT(userId) DO UPDATE SET standbyUntil = excluded.standbyUntil
    `).run(userId, until);
}

function getStandby(userId) {
    const row = db.prepare('SELECT standbyUntil FROM sessions WHERE userId = ?').get(userId);
    if (!row || !row.standbyUntil) return false;
    return new Date(row.standbyUntil) > new Date();
}

function getInactiveCustomers(months) {
    return db.prepare(`
        SELECT userId FROM sessions 
        WHERE lastUpdate < DATETIME('now', '-' || ? || ' months')
    `).all(months);
}

// وظائف التذكيرات
function saveReminder(userId, apptDate, reminderDate) {
    db.prepare(`
        INSERT INTO reminders (userId, apptDate, reminderDate)
        VALUES (?, ?, ?)
    `).run(userId, apptDate, reminderDate);
}

function getPendingReminders() {
    return db.prepare("SELECT * FROM reminders WHERE status = 'pending' AND reminderDate > DATETIME('now', 'localtime')").all();
}

function markReminderSent(id) {
    db.prepare("UPDATE reminders SET status = 'sent' WHERE id = ?").run(id);
}

// وظائف المواعيد
function saveAppointment(userId, apptDate, branch) {
    db.prepare(`
        INSERT INTO appointments (userId, apptDate, branch)
        VALUES (?, ?, ?)
    `).run(userId, apptDate, branch);
}

// وظائف الإحصائيات المتقدمة للتقارير
function saveBroadcastLog(count, message) {
    db.prepare("INSERT INTO broadcasts (sentCount, message) VALUES (?, ?)").run(count, message);
}

function getDailyStats() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const appts = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE date(createdAt) = date('now', 'localtime')").get().count;
    const broadcastMsgs = db.prepare("SELECT SUM(sentCount) as count FROM broadcasts WHERE date(createdAt) = date('now', 'localtime')").get().count || 0;
    const newCustomers = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE date(lastUpdate) = date('now', 'localtime')").get().count;

    return {
        date,
        appts,
        broadcastMsgs,
        newCustomers
    };
}

function getMonthlyStats() {
    return db.prepare(`
        SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as total
        FROM appointments
        GROUP BY month
    `).all();
}

module.exports = {
    initDb,
    getHistory,
    saveHistory,
    saveReminder,
    getPendingReminders,
    markReminderSent,
    saveAppointment,
    getMonthlyStats,
    setStandby,
    getStandby,
    getInactiveCustomers,
    saveBroadcastLog,
    getDailyStats
};
