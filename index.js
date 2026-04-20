require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const systemPrompt = require('./prompt');
const schedule = require('node-schedule');
const db = require('./database');

// تهيئة قاعدة البيانات
db.initDb();

// إعداد Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// أرقام الإدارة
const ADMIN_NUMBERS = {
    asfan: '966535984648@c.us',
    kilo14: '966556565135@c.us',
    abuAli: '966562185308@c.us'
};

// دالة لحفظ التذكيرات في قاعدة البيانات
function saveReminder(userId, apptDate, reminderDate) {
    try {
        db.saveReminder(userId, apptDate, reminderDate);
    } catch (e) { console.error("Error saving reminder:", e); }
}

// دالة لتحميل وإعادة جدولة التذكيرات عند التشغيل
function reloadReminders(clientRef) {
    try {
        const pendingReminders = db.getPendingReminders();
        const now = new Date();
        
        pendingReminders.forEach(r => {
            schedule.scheduleJob(new Date(r.reminderDate), () => {
                clientRef.sendMessage(r.userId, `تذكير ⏰: نود تذكيرك بموعدك القادم مع مركز متخصص مازدا بعد ساعة من الآن. ننتظر زيارتك!`)
                    .then(() => db.markReminderSent(r.id))
                    .catch(err => console.error('خطأ في إرسال التذكير المجدول:', err));
            });
        });
        if (pendingReminders.length > 0) console.log(`[إعادة تحميل] تم استعادة ${pendingReminders.length} تذكير من قاعدة البيانات.`);
    } catch (e) { console.error("Error reloading reminders:", e); }
}

// دالة لمعرفة هل نحن في وقت العمل
function isWorkingHours() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    const day = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const time = hours + minutes / 60;

    // الجمعة مغلق (5 في JS هي الجمعة)
    if (day === 5) return false; 
    
    return time >= 8.5 && time <= 17.5; // 8:30 AM to 5:30 PM
}

// دالة لتسجيل الموعد
function logAppointment(userId, apptDate, branch) {
    try {
        db.saveAppointment(userId, apptDate, branch);
        console.log(`[موعد جديد] تم تسجيل موعد للعميل ${userId} في قاعدة البيانات.`);
    } catch (e) { console.error("Error logging appointment:", e); }
}

// دالة لتنظيف وتجهيز التاريخ للذكاء الاصطناعي
function getFormattedHistory(userId) {
    return db.getHistory(userId);
}

// دالة الرد عبر Gemini (تدعم النصوص والصوت)
async function getGeminiResponse(userId, messageText, media = null) {
    const history = getFormattedHistory(userId);
    const currentSettings = systemPrompt + `\n\nملاحظة هامة: تاريخ ووقت اليوم هو ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })}\nاستخدم هذا التاريخ بدقة عند تحديد المواعيد ولا تنسى إرسال التاج [APPT:YYYY-MM-DD HH:MM] عند الحجز.`;
    
    const chat = geminiModel.startChat({
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
    // إذا كانت رسالة صوتية، قد يكون النص فارغاً، في هذه الحالة نضيف رسالة توضيحية للموديل
    if (messageText && messageText.trim() !== "") {
        parts.push({ text: messageText });
    } else if (media) {
        parts.push({ text: "حلل هذه الرسالة الصوتية وقم بالرد عليها بناءً على مهامك كموظف خدمة عملاء." });
    }

    const result = await chat.sendMessage(parts);
    return result.response.text();
}

// دالة الرد البديلة عبر Llama 3 (Groq)
async function getGroqResponse(userId, messageText) {
    if (!process.env.GROQ_API_KEY) throw new Error("رابط Groq غير مفعّل");

    const history = getFormattedHistory(userId);
    const currentSettings = systemPrompt + `\n\nملاحظة هامة: تاريخ ووقت اليوم هو ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })}\nاستخدم هذا التاريخ بدقة عند تحديد المواعيد ولا تنسى إرسال التاج [APPT:YYYY-MM-DD HH:MM] عند الحجز.`;
    const messages = [
        { role: "system", content: currentSettings },
        ...history,
        { role: "user", content: messageText }
    ];

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].message.content;
}

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('يرجى مسح رمز الاستجابة السريعة (QR Code) التالي باستخدام تطبيق واتساب:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('تم تشغيل البوت مع نظام التبديل الذكي (Gemini + Llama 3) 🚀');
    reloadReminders(client);
});

client.on('message', async message => {
    // تجاهل الحالات (الستوري) وعدم الرد عليها
    if (message.isStatus || message.from === 'status@broadcast') return;

    // التعامل مع الوسائط (الصوتيات)
    let mediaData = null;
    if (message.hasMedia) {
        if (message.type === 'ptt' || message.type === 'audio') {
            try {
                mediaData = await message.downloadMedia();
            } catch (err) {
                console.error("خطأ في تحميل الرسالة الصوتية:", err);
            }
        } else {
            // تجاهل الصور والفيديوهات والملفات الأخرى حالياً
            return;
        }
    }

    // تجاهل الرسائل الفارغة (إذا لم تكن صوتية)
    if (!mediaData && (!message.body || message.body.trim() === "")) return;

    const chat = await message.getChat();
    if (chat.isGroup) return;

    const userId = message.from;
    console.log(`[رسالة جديدة] من ${userId}: ${message.body}`);

    try {
        chat.sendStateTyping();
        let aiResponse = "";

        try {
            // المحاولة الأولى: Gemini
            console.log(mediaData ? "[تحليل صوتي] جاري المعالجة عبر Gemini..." : "محاولة الرد عبر Gemini...");
            aiResponse = await getGeminiResponse(userId, message.body, mediaData);
        } catch (geminiError) {
            console.error("فشل Gemini:", geminiError.message);
            if (mediaData) {
                aiResponse = "نعتذر منك، لم أتمكن من معالجة الرسالة الصوتية حالياً. هل يمكنك كتابة استفسارك نصياً؟";
            } else {
                console.log("جاري التبديل إلى Llama 3...");
                // المحاولة الثانية: Llama 3 عبر Groq (للنصوص فقط)
                aiResponse = await getGroqResponse(userId, message.body);
            }
        }

        // --- Appointment Parsing & Notifications ---
        const apptMatch = aiResponse.match(/\[APPT:\s*(.*?)\s*\]/i);
        const branchMatch = aiResponse.match(/\[BRANCH:\s*(.*?)\s*\]/i);
        
        if (apptMatch) {
            let apptTimeStr = apptMatch[1];
            let branchName = branchMatch ? branchMatch[1] : "غير محدد";
            
            // تنظيف الرد من التاجات
            aiResponse = aiResponse.replace(/\[APPT:.*?\]/gi, '').replace(/\[BRANCH:.*?\]/gi, '').trim();

            apptTimeStr = apptTimeStr.replace(' ', 'T'); 
            const apptDate = new Date(apptTimeStr);

            if (!isNaN(apptDate.getTime())) {
                const now = new Date();
                
                // 1. برمجة تذكير للعميل
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

                // 2. تسجيل الموعد في قاعدة البيانات
                logAppointment(userId, apptTimeStr, branchName);

                // 3. تنبيه الإدارة
                let adminToNotify = ADMIN_NUMBERS.abuAli; // افتراضياً أبو علي
                if (isWorkingHours()) {
                    if (branchName.includes("عسفان")) adminToNotify = ADMIN_NUMBERS.asfan;
                    else if (branchName.includes("كيلو")) adminToNotify = ADMIN_NUMBERS.kilo14;
                }
                
                const adminMsg = `🚨 *حجز جديد* 🚨\n\n👤 العميل: ${userId.split('@')[0]}\n📅 الموعد: ${apptMatch[1]}\n📍 الفرع: ${branchName}\n\nيرجى مراجعة الحجز وتأكيده مع العميل.`;
                client.sendMessage(adminToNotify, adminMsg).then(() => {
                    console.log(`[تنبيه الإدارة] تم إرسال تنبيه إلى ${adminToNotify}`);
                }).catch(err => console.error('خطأ في تنبيه الإدارة:', err));

                // 4. جدولة رسالة تقييم (بعد 24 ساعة من الموعد)
                const reviewDate = new Date(apptDate.getTime() + 24 * 60 * 60 * 1000);
                schedule.scheduleJob(reviewDate, () => {
                    client.sendMessage(userId, `مرحباً بك مجدداً من مركز متخصص مازدا ✨\n\nنأمل أن تكون قد حظيت بتجربة ممتازة معنا. كيف تقيم خدمتنا؟ رأيك يهمنا جداً لتطوير المركز.`).catch(e => {});
                });
            }
        }

        // حفظ الرسالة ورد البوت في قاعدة البيانات
        const history = db.getHistory(userId);
        const userContent = mediaData ? `[رسالة صوتية]: ${message.body || ""}` : message.body;
        history.push({ role: 'user', content: userContent });
        history.push({ role: 'assistant', content: aiResponse });

        if (history.length > 20) history.shift(); // زيادة الذاكرة إلى 20 رسالة
        db.saveHistory(userId, history);

        message.reply(aiResponse);

    } catch (finalError) {
        console.error("فشل كلا الموديلين:", finalError);
        const fallbackMessage = `نشكر تواصلك مع مركز متخصص مازدا 🛠️\n\nنعتذر منك، نظام الرد الآلي يواجه ضغطاً مؤقتاً حالياً. \n\n*للمساعدة العاجلة، يمكنك التواصل معنا مباشرة عبر الاتصال:*
📍 عسفان: 0535984648
📍 كيلو 14: 0556565135

أو يمكنك ترك استفسارك هنا وسيقوم أحد موظفينا بالرد عليك يدوياً في أقرب وقت. شكراً لتفهمك! ✨`;
        message.reply(fallbackMessage);
    }
});

client.initialize();
