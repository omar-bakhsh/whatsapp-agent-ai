require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const systemPrompt = require('./prompt');
const schedule = require('node-schedule');
const db = require('./database');

// إعداد نظام السجلات المزدوج (Console + File) لمتابعة البوت بدقة
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
const logFile = path.join(logsDir, 'agent.log');

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function formatLog(prefix, args) {
    const time = new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' });
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    return `[${time}] ${prefix} ${text}\n`;
}

console.log = function(...args) {
    originalLog.apply(console, args);
    try { fs.appendFileSync(logFile, formatLog('[INFO]', args), 'utf8'); } catch (e) {}
};
console.error = function(...args) {
    originalError.apply(console, args);
    try { fs.appendFileSync(logFile, formatLog('[ERROR]', args), 'utf8'); } catch (e) {}
};
console.warn = function(...args) {
    originalWarn.apply(console, args);
    try { fs.appendFileSync(logFile, formatLog('[WARN]', args), 'utf8'); } catch (e) {}
};

// تهيئة قاعدة البيانات
db.initDb();

// إعداد Gemini AI والموديلات المتاحة مع دعم التبديل التلقائي عند الضغط
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODELS = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite'
];

// قائمة موديلات Groq الاحتياطية
const GROQ_MODELS = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'allam-2-7b'
];

// أرقام الإدارة
const ADMIN_NUMBERS = {
    asfan: '966535984648@c.us',
    kilo14: '966556565135@c.us',
    abuAli: '966562185308@c.us'
};

function isAdmin(userId, contactNumber = null) {
    if (!userId) return false;
    const phone = (contactNumber || userId.split('@')[0]).replace(/\D/g, '');
    const adminPhones = Object.values(ADMIN_NUMBERS).map(a => a.split('@')[0]);
    return adminPhones.includes(phone) || Object.values(ADMIN_NUMBERS).includes(userId);
}

// تتبع الرسائل المرسلة من البوت لتجنب تفعيل وضع الاستعداد ذاتياً (مع سقف محدد للذاكرة)
const botMessages = new Set();
function trackBotMessage(id) {
    if (!id) return;
    botMessages.add(id);
    if (botMessages.size > 1500) {
        const oldestId = botMessages.values().next().value;
        botMessages.delete(oldestId);
    }
}

// قفل معالجة لكل عميل لمنع التكرار والتداخل عند إرسال رسائل متتالية سريعة
const processingUsers = new Set();

// Crash Prevention Guardians
process.on('uncaughtException', (err) => {
    console.error('⚠️ [Uncaught Exception caught]:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ [Unhandled Rejection caught]:', reason);
});

// Save reminder to database
function saveReminder(userId, apptDate, reminderDate) {
    try {
        db.saveReminder(userId, apptDate, reminderDate);
    } catch (e) { console.error("Error saving reminder:", e); }
}

// Reload and reschedule reminders on startup
function reloadReminders(clientRef) {
    try {
        const pendingReminders = db.getPendingReminders();
        const now = new Date();
        
        pendingReminders.forEach(r => {
            schedule.scheduleJob(new Date(r.reminderDate), () => {
                clientRef.sendMessage(r.userId, `تذكير ⏰: نود تذكيرك بموعدك القادم مع مركز متخصص مازدا بعد ساعة من الآن. ننتظر زيارتك!`)
                    .then(() => db.markReminderSent(r.id))
                    .catch(err => console.error('Error sending scheduled reminder:', err));
            });
        });
        if (pendingReminders.length > 0) console.log(`[Reload] Restored ${pendingReminders.length} reminders from database.`);
    } catch (e) { console.error("Error reloading reminders:", e); }
}

// Check working hours
function isWorkingHours() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    const day = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const time = hours + minutes / 60;

    // Friday closed
    if (day === 5) return false; 
    
    return time >= 8.5 && time <= 17.5; // 8:30 AM to 5:30 PM
}

// Log appointment to database
function logAppointment(userId, apptDate, branch, customerName = null, carModel = null, notes = null) {
    try {
        db.saveAppointment(userId, apptDate, branch, customerName, carModel, notes);
        console.log(`[New Appointment] Recorded appointment for ${userId} (${customerName || 'No Name'}) in database.`);
    } catch (e) { console.error("Error logging appointment:", e); }
}

// دالة لتنظيف وتجهيز التاريخ للذكاء الاصطناعي
function getFormattedHistory(userId) {
    return db.getHistory(userId);
}

// دالة ذكية لبناء إرشادات النظام مدمجة بملف العميل وسيارته
function buildSystemPrompt(userId) {
    const nowRiyadh = new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' });
    let promptText = systemPrompt + `\n\nملاحظة هامة: تاريخ ووقت اليوم هو ${nowRiyadh}\nاستخدم هذا التاريخ بدقة عند تحديد المواعيد ولا تنسى إرسال التاج [APPT:YYYY-MM-DD HH:MM] عند الحجز.`;

    try {
        const customer = db.getCustomer(userId);
        if (customer) {
            let profileInfo = [];
            if (customer.name) profileInfo.push(`الاسم: ${customer.name}`);
            if (customer.carModel) profileInfo.push(`نوع وموديل السيارة: ${customer.carModel}`);
            if (customer.plateNumber) profileInfo.push(`رقم اللوحة: ${customer.plateNumber}`);
            if (customer.preferredBranch) profileInfo.push(`الفرع المفضل: ${customer.preferredBranch}`);

            if (profileInfo.length > 0) {
                promptText += `\n\n[معلومات ملف العميل المسجلة مسبقاً في النظام]:\n${profileInfo.join(' | ')}\n(استخدم هذه البيانات للترحيب به بلباقة وخصوصية مثل ذكر اسمه وسيارته إن ناسب السياق دون إشعاره بأنك تقرأ ملفاً آلياً).`;
            }
        }
    } catch (err) {
        console.warn('Warning loading customer profile for prompt:', err.message);
    }

    return promptText;
}

// Gemini response function
async function getGeminiResponse(userId, messageText, media = null) {
    const history = getFormattedHistory(userId);
    const currentSettings = buildSystemPrompt(userId);
    
    let lastError = null;
    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: currentSettings }] },
                    { role: "model", parts: [{ text: "فهمت. سأقوم بدوري كممثل خدمة عملاء لمركز متخصص مازدا بكل احترافية." }] },
                    ...history.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    }))
                ]
            });

            let parts = [];
            if (media) {
                parts.push({
                    inlineData: {
                        data: media.data,
                        mimeType: media.mimetype
                    }
                });
            }
            if (messageText && messageText.trim() !== "") {
                parts.push({ text: messageText });
            } else if (media) {
                parts.push({ text: "حلل هذه الرسالة الصوتية وقم بالرد عليها بناءً على مهامك كموظف خدمة عملاء." });
            }

            const result = await chat.sendMessage(parts);
            const textResponse = result.response.text();
            if (textResponse && textResponse.trim().length > 0) {
                return textResponse;
            }
        } catch (err) {
            console.warn(`[Gemini Warn] Model ${modelName} encountered error (${err.message}). Trying next model...`);
            lastError = err;
        }
    }

    throw lastError || new Error("Failed to get response from Gemini models");
}

// Groq fallback response function
async function getGroqResponse(userId, messageText) {
    if (!process.env.GROQ_API_KEY) throw new Error("Groq API key not set");

    const history = getFormattedHistory(userId);
    const currentSettings = buildSystemPrompt(userId);
    const messages = [
        { role: "system", content: currentSettings },
        ...history,
        { role: "user", content: messageText }
    ];

    let lastError = null;
    for (const modelName of GROQ_MODELS) {
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: modelName,
                messages: messages,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const content = response.data.choices[0].message.content;
            if (content && content.trim().length > 0) {
                return content;
            }
        } catch (err) {
            console.warn(`[Groq Warn] Model ${modelName} encountered error. Trying next fallback...`);
            lastError = err;
        }
    }

    throw lastError || new Error("Failed to get response from Groq models");
}

const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 120000,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 10000,
    puppeteer: {
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-blink-features=AutomationControlled',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        ],
    }
});

let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Smart auto-reconnect function
async function handleAutoReconnect() {
    if (isReconnecting) return;
    isReconnecting = true;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Max reconnect attempts reached. Please restart bot manually.');
        isReconnecting = false;
        return;
    }

    reconnectAttempts++;
    const delay = Math.min(30000, 5000 * reconnectAttempts);
    console.log(`⏳ Reconnecting attempt (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay / 1000} seconds...`);

    setTimeout(async () => {
        try {
            console.log('🔄 Cleaning session and re-initializing client...');
            try {
                await client.destroy();
            } catch (dErr) {
                console.warn('Warning destroying previous browser:', dErr.message);
            }
            await client.initialize();
        } catch (err) {
            console.error('Reconnect attempt failed:', err.message);
            isReconnecting = false;
            handleAutoReconnect();
        }
    }, delay);
}

client.on('qr', (qr) => {
    console.log('Scan the QR Code below with WhatsApp:');
    try {
        fs.writeFileSync(path.join(logsDir, 'last_qr.txt'), qr, 'utf8');
    } catch (e) {}
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('✅ Existing session found. Connecting to WhatsApp...');
    reconnectAttempts = 0;
    isReconnecting = false;
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth Failure:', msg);
    console.log('💡 If this persists, delete .wwebjs_auth folder and re-scan QR code.');
});

client.on('loading_screen', (percent, message) => {
    if (percent >= 99) {
        console.log(`⏳ Syncing chats: 100% ✅ (Sync completed successfully)`);
        console.log(`🚀 Final loading and system preparation...`);
    } else {
        console.log(`⏳ Syncing chats: ${percent}%`);
    }
});

client.on('change_state', (state) => {
    console.log(`🔄 WhatsApp connection state changed to: ${state}`);
});

client.on('disconnected', (reason) => {
    console.warn(`⚠️ WhatsApp disconnected (${reason}). Triggering auto-reconnect...`);
    handleAutoReconnect();
});

client.on('ready', () => {
    console.log('==================================================');
    console.log('✅ Bot started successfully 100%! Ready to receive customer messages 🚀');
    console.log('==================================================');
    reconnectAttempts = 0;
    isReconnecting = false;
    reloadReminders(client);

    // Schedule daily report at 9 PM Riyadh time
    schedule.scheduleJob({ hour: 21, minute: 0, tz: 'Asia/Riyadh' }, () => {
        sendDailyReport();
    });
});

// Standby mode detection when employee replies manually
client.on('message_create', async (message) => {
    if (message.fromMe && !botMessages.has(message.id._serialized)) {
        const userId = message.to;
        // If bot is actively handling this user, this is bot reply, not human reply
        if (processingUsers.has(userId)) return;

        if (userId && (userId.includes('@c.us') || userId.includes('@lid')) && !isAdmin(userId)) {
            console.log(`[Standby Mode] Manual reply detected for ${userId}. Standby enabled for 2 hours.`);
            db.setStandby(userId, 2);
        }
    }
});

// Promotional broadcast function
async function runBroadcast(months, text) {
    const customers = db.getInactiveCustomers(months);
    console.log(`[Broadcast] Sending ${customers.length} messages...`);
    let sentCount = 0;
    for (let i = 0; i < customers.length; i++) {
        try {
            const msg = await client.sendMessage(customers[i].userId, text);
            trackBotMessage(msg.id._serialized);
            sentCount++;
            console.log(`[Broadcast] Sent to ${customers[i].userId} (${i+1}/${customers.length})`);
            // Anti-ban delay between 5-10 seconds
            await new Promise(res => setTimeout(res, 5000 + Math.random() * 5000));
        } catch (e) { console.error(`[Broadcast] Failed sending to ${customers[i].userId}:`, e.message); }
    }
    db.saveBroadcastLog(sentCount, text);
    console.log('[Broadcast] Completed.');
}

// Daily report function
async function sendDailyReport() {
    try {
        const stats = db.getDailyStats();
        const reportMsg = `📊 *التقرير اليومي لنظام متخصص مازدا* 📊\n\n` +
            `📅 التاريخ: ${stats.date}\n` +
            `---------------------------\n` +
            `✅ المواعيد المحجوزة اليوم: ${stats.appts}\n` +
            `📢 رسائل البث الترويجي: ${stats.broadcastMsgs}\n` +
            `👤 عملاء جدد/متفاعلون: ${stats.newCustomers}\n\n` +
            `✨ نظامك يعمل بكفاءة!`;

        await client.sendMessage(ADMIN_NUMBERS.abuAli, reportMsg);
        console.log('[Daily Report] Daily report sent successfully.');
    } catch (e) { console.error('[Daily Report] Failed sending report:', e); }
}

client.on('message', async message => {
    // Ignore status updates
    if (message.isStatus || message.from === 'status@broadcast') return;

    // Handle audio/voice messages
    let mediaData = null;
    if (message.hasMedia) {
        if (message.type === 'ptt' || message.type === 'audio') {
            try {
                mediaData = await message.downloadMedia();
            } catch (err) {
                console.error("Audio download error:", err);
            }
        } else {
            return;
        }
    }

    // Ignore empty messages
    if (!mediaData && (!message.body || message.body.trim() === "")) return;

    // Ignore groups only (support both @c.us and @lid for 1-to-1 customer chats)
    if (message.from.endsWith('@g.us')) return;

    const userId = message.from;

    // Concurrency lock: prevent parallel message overlap for same user
    if (processingUsers.has(userId)) {
        console.log(`[Queue] User ${userId} already has a message in processing.`);
        return;
    }
    processingUsers.add(userId);

    try {
        let chat = null;
        try {
            chat = await message.getChat();
            if (chat && chat.isGroup) return;
        } catch (chatError) {
            console.warn(`[Warning] Could not get chat details (${message.from}):`, chatError.message || chatError);
        }

        // Get contact details (real phone number for @lid accounts)
        let contactNumber = null;
        try {
            const contact = await message.getContact();
            if (contact && contact.number) contactNumber = contact.number;
        } catch (cErr) {}

        // --- Admin Commands System ---
        if (isAdmin(userId, contactNumber)) {
            if (message.body.startsWith('!بث')) {
                const parts = message.body.split(' ');
                if (parts.length < 3) {
                    message.reply('استخدم الصيغة: !بث [الأشهر] [النص]');
                    return;
                }
                const months = parseInt(parts[1]);
                const text = parts.slice(2).join(' ');
                message.reply(`جاري بدء البث لـ ${months} أشهر...`);
                runBroadcast(months, text);
                return;
            }
            if (message.body.startsWith('!تفعيل')) {
                 const target = message.body.split(' ')[1];
                 if (!target || target === 'الكل' || target === 'all') {
                     db.clearStandby();
                     message.reply('تم إلغاء وضع الاستعداد لجميع العملاء بنجاح. البوت سيعاود الرد على الجميع.');
                 } else {
                     db.clearStandby(target);
                     message.reply(`تم إلغاء وضع الاستعداد للرقم ${target}. البوت سيعاود الرد.`);
                 }
                 return;
            }
            if (message.body.startsWith('!تعطيل')) {
                const target = message.body.split(' ')[1];
                if (target) {
                    const targetJid = target.includes('@') ? target : target + '@c.us';
                    db.setStandby(targetJid, 24);
                    message.reply(`تم تعطيل البوت للرقم ${target} لمدة 24 ساعة.`);
                }
                return;
           }
        }

        // Check standby mode (Human-in-the-Loop)
        if (db.getStandby(userId)) {
            console.log(`[Skipped] User ${userId} is in standby mode. Manual chat active.`);
            return;
        }

        console.log(`[New Message] from ${contactNumber ? `${contactNumber} (${userId})` : userId}: ${message.body || '[Voice Message]'}`);

        if (chat) {
            chat.sendStateTyping().catch(() => {});
        }
        let aiResponse = "";

        try {
            // Primary attempt: Gemini
            console.log(mediaData ? "[Voice Analysis] Processing via Gemini..." : "Processing response via Gemini...");
            aiResponse = await getGeminiResponse(userId, message.body, mediaData);
        } catch (geminiError) {
            console.error("Gemini failed:", geminiError.message);
            if (mediaData) {
                aiResponse = "نعتذر منك، لم أتمكن من معالجة الرسالة الصوتية حالياً. هل يمكنك كتابة استفسارك نصياً؟";
            } else {
                console.log("Switching to fallback engine (Groq)...");
                aiResponse = await getGroqResponse(userId, message.body);
            }
        }

        // --- 1. Customer Profiling ---
        const profileMatch = aiResponse.match(/\[PROFILE:\s*(.*?)\s*\]/i);
        if (profileMatch) {
            try {
                const parts = profileMatch[1].split('|');
                const profileData = {};
                for (const part of parts) {
                    const [k, v] = part.split('=');
                    if (k && v && v.trim().length > 0) {
                        const key = k.trim().toLowerCase();
                        const val = v.trim();
                        if (key === 'name') profileData.name = val;
                        else if (key === 'car') profileData.carModel = val;
                        else if (key === 'plate') profileData.plateNumber = val;
                        else if (key === 'branch') profileData.preferredBranch = val;
                    }
                }
                if (Object.keys(profileData).length > 0) {
                    db.upsertCustomer(userId, profileData);
                    console.log(`[Customer Profile] Updated profile for ${userId}:`, profileData);
                }
            } catch (pErr) {
                console.error("Error processing customer profile:", pErr);
            }
        }

        // --- 2. Escalation & Complaint Detection ---
        const escalateMatch = aiResponse.match(/\[ESCALATE:\s*(.*?)\s*\]/i);
        if (escalateMatch) {
            try {
                const reason = escalateMatch[1].trim();
                console.log(`[Urgent Escalation] Complaint detected for ${userId}: ${reason}`);
                
                // Set standby mode for 3 hours for human intervention
                db.setStandby(userId, 3);
                
                const customer = db.getCustomer(userId);
                const adminEscalateMsg = `🚨 *تنبيه شكوى / طلب إدارة عاجل* 🚨\n\n` +
                    `👤 العميل: ${userId.split('@')[0]}${customer && customer.name ? ` (${customer.name})` : ''}\n` +
                    `🚗 السيارة: ${customer && customer.carModel ? customer.carModel : 'غير مسجلة'}\n` +
                    `⚠️ سبب التصعيد: ${reason}\n\n` +
                    `*تم إيقاف الرد الآلي وتوجيه المحادثة للإدارة للرد المباشر.*`;

                client.sendMessage(ADMIN_NUMBERS.abuAli, adminEscalateMsg).catch(e => console.error('Failed notifying admin of escalation:', e));
            } catch (escErr) {
                console.error("Error processing escalation:", escErr);
            }
        }

        // --- 3. Smart Booking Parsing ---
        const apptMatch = aiResponse.match(/\[APPT:\s*(.*?)\s*\]/i);
        const branchMatch = aiResponse.match(/\[BRANCH:\s*(.*?)\s*\]/i);
        const customerMatch = aiResponse.match(/\[CUSTOMER:\s*(.*?)\s*\]/i);
        const carMatch = aiResponse.match(/\[CAR:\s*(.*?)\s*\]/i);
        
        if (apptMatch) {
            let apptTimeStr = apptMatch[1];
            let branchName = branchMatch ? branchMatch[1] : "غير محدد";
            let customerName = customerMatch ? customerMatch[1].trim() : null;
            let carModel = carMatch ? carMatch[1].trim() : null;

            // Complete info from customer record if missing
            const existingCust = db.getCustomer(userId);
            if (!customerName && existingCust && existingCust.name) customerName = existingCust.name;
            if (!carModel && existingCust && existingCust.carModel) carModel = existingCust.carModel;

            if (customerName || carModel || branchName) {
                db.upsertCustomer(userId, {
                    name: customerName,
                    carModel: carModel,
                    preferredBranch: branchName
                });
            }

            apptTimeStr = apptTimeStr.replace(' ', 'T'); 
            const apptDate = new Date(apptTimeStr);

            if (!isNaN(apptDate.getTime())) {
                const now = new Date();
                
                // Schedule customer reminder
                const reminderDate = new Date(apptDate.getTime() - 60 * 60 * 1000); 
                if (reminderDate > now) {
                    saveReminder(userId, apptDate, reminderDate);
                    schedule.scheduleJob(reminderDate, () => {
                        client.sendMessage(userId, `تذكير ⏰: نود تذكيرك بموعدك القادم مع مركز متخصص مازدا بعد ساعة من الآن. ننتظر زيارتك!`).catch(e => {});
                    });
                } else if (apptDate > now) {
                    const diffMins = Math.round((apptDate.getTime() - now.getTime()) / 60000);
                    setTimeout(() => {
                        client.sendMessage(userId, `تذكير ⏰: نود تذكيرك بموعدك القادم بعد ${diffMins} دقيقة تقريباً من الآن.`).catch(e => {});
                    }, 5000);
                }

                // Log appointment to DB
                logAppointment(userId, apptTimeStr, branchName, customerName, carModel);

                // Notify admin
                let adminToNotify = ADMIN_NUMBERS.abuAli;
                if (isWorkingHours()) {
                    if (branchName.includes("عسفان")) adminToNotify = ADMIN_NUMBERS.asfan;
                    else if (branchName.includes("كيلو")) adminToNotify = ADMIN_NUMBERS.kilo14;
                }
                
                let displayPhone = contactNumber || userId.split('@')[0];
                const adminMsg = `🚨 *حجز موعد جديد* 🚨\n\n` +
                    `👤 العميل: ${displayPhone}${customerName ? ` (${customerName})` : ''}\n` +
                    `🚗 السيارة: ${carModel || 'غير محدد'}\n` +
                    `📅 الموعد: ${apptMatch[1]}\n` +
                    `📍 الفرع: ${branchName}\n\n` +
                    `يرجى مراجعة الحجز وتأكيده مع العميل.`;

                client.sendMessage(adminToNotify, adminMsg).then(() => {
                    console.log(`[Admin Alert] Booking alert sent to ${adminToNotify}`);
                }).catch(err => console.error('Admin notification error:', err));

                // Schedule review prompt (24 hours after appointment)
                const reviewDate = new Date(apptDate.getTime() + 24 * 60 * 60 * 1000);
                schedule.scheduleJob(reviewDate, () => {
                    client.sendMessage(userId, `مرحباً بك مجدداً من مركز متخصص مازدا ✨\n\nنأمل أن تكون قد حظيت بتجربة ممتازة معنا. كيف تقيم خدمتنا؟ رأيك يهمنا جداً لتطوير المركز.`).catch(e => {});
                });
            }
        }

        // Clean internal tags from AI response
        aiResponse = aiResponse
            .replace(/\[APPT:.*?\]/gi, '')
            .replace(/\[BRANCH:.*?\]/gi, '')
            .replace(/\[CUSTOMER:.*?\]/gi, '')
            .replace(/\[CAR:.*?\]/gi, '')
            .replace(/\[PROFILE:.*?\]/gi, '')
            .replace(/\[ESCALATE:.*?\]/gi, '')
            .trim();

        // Anti-ban natural typing delay
        const naturalDelay = Math.min(3000, Math.max(1000, aiResponse.length * 15 + Math.random() * 500));
        await new Promise(r => setTimeout(r, naturalDelay));

        // Save conversation history in DB
        const history = db.getHistory(userId);
        const userContent = mediaData ? `[رسالة صوتية]: ${message.body || ""}` : message.body;
        history.push({ role: 'user', content: userContent });
        history.push({ role: 'assistant', content: aiResponse });

        if (history.length > 20) history.shift();
        db.saveHistory(userId, history);

        let responseMsg = null;
        try {
            responseMsg = await message.reply(aiResponse);
        } catch (replyErr) {
            console.warn(`[Warning] message.reply failed (${replyErr.message}), attempting client.sendMessage...`);
            responseMsg = await client.sendMessage(userId, aiResponse);
        }
        if (responseMsg && responseMsg.id) {
            trackBotMessage(responseMsg.id._serialized);
        }

    } catch (finalError) {
        console.error("Message processing failed:", finalError);
        const fallbackMessage = `نشكر تواصلك مع مركز متخصص مازدا 🛠️\n\nنعتذر منك، نظام الرد الآلي يواجه ضغطاً مؤقتاً حالياً. \n\n*للمساعدة العاجلة، يمكنك التواصل معنا مباشرة عبر الاتصال:*
📍 عسفان: 0535984648
📍 كيلو 14: 0556565135

أو يمكنك ترك استفسارك هنا وسيقوم أحد موظفينا بالرد عليك يدوياً في أقرب وقت. شكراً لتفهمك! ✨`;
        message.reply(fallbackMessage).catch(() => {
            client.sendMessage(userId, fallbackMessage).catch(() => {});
        });
    } finally {
        processingUsers.delete(userId);
    }
});

// Graceful process shutdown
async function gracefulShutdown(signal) {
    console.log(`\n🛑 Signal received (${signal}). Closing browser session and freeing memory...`);
    try {
        await client.destroy();
    } catch (e) {}
    console.log('✅ System shutdown cleanly.');
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

console.log('Initializing WhatsApp client... (May take 30-40 seconds with existing session)');

client.initialize().catch(err => {
    console.error('Initial initialization error:', err);
    handleAutoReconnect();
});
