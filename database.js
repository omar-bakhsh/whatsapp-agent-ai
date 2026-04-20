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
            lastUpdate DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

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

// وظيفة الإحصائيات (مثال)
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
    getMonthlyStats
};
