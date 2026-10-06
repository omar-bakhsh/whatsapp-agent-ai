const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3020;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// تشغيل قاعدة البيانات
db.initDb();

// API Endpoints

// 1. 获取所有预约
app.get('/api/appointments', (req, res) => {
    try {
        const BetterSqlite3 = require('better-sqlite3');
        const dbPath = path.join(__dirname, 'agent.db');
        const sqlite = new BetterSqlite3(dbPath);
        const rows = sqlite.prepare('SELECT * FROM appointments ORDER BY createdAt DESC').all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. 获取统计数据
app.get('/api/stats', (req, res) => {
    try {
        const stats = db.getMonthlyStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. 获取会话记录
app.get('/api/sessions', (req, res) => {
    try {
        const BetterSqlite3 = require('better-sqlite3');
        const dbPath = path.join(__dirname, 'agent.db');
        const sqlite = new BetterSqlite3(dbPath);
        const rows = sqlite.prepare('SELECT * FROM sessions ORDER BY lastUpdate DESC').all();
        const sessions = rows.map(row => ({
            ...row,
            history: JSON.parse(row.history)
        }));
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. 获取提醒
app.get('/api/reminders', (req, res) => {
    try {
        const BetterSqlite3 = require('better-sqlite3');
        const dbPath = path.join(__dirname, 'agent.db');
        const sqlite = new BetterSqlite3(dbPath);
        const rows = sqlite.prepare('SELECT * FROM reminders ORDER BY reminderDate ASC').all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. جلب ملفات وسيارات العملاء (Customer Profiles)
app.get('/api/customers', (req, res) => {
    try {
        const customers = db.getAllCustomers();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
