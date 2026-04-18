require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const systemPrompt = require('./prompt');

// إعداد Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// كائن لحفظ تاريخ المحادثة بشكل موحد لكل عميل
const sessions = {};

// دالة لتنظيف وتجهيز التاريخ للذكاء الاصطناعي
function getFormattedHistory(userId) {
    if (!sessions[userId]) {
        sessions[userId] = [];
    }
    return sessions[userId];
}

// دالة الرد عبر Gemini
async function getGeminiResponse(userId, messageText) {
    const history = getFormattedHistory(userId);
    const chat = geminiModel.startChat({
        history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "فهمت. سأقوم بدوري كممثل خدمة عملاء لمركز متخصص مازدا بكل احترافية." }] },
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }))
        ]
    });

    const result = await chat.sendMessage(messageText);
    return result.response.text();
}

// دالة الرد البديلة عبر Llama 3 (Groq)
async function getGroqResponse(userId, messageText) {
    if (!process.env.GROQ_API_KEY) throw new Error("رابط Groq غير مفعّل");

    const history = getFormattedHistory(userId);
    const messages = [
        { role: "system", content: systemPrompt },
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
});

client.on('message', async message => {
    const chat = await message.getChat();
    if (chat.isGroup) return;

    const userId = message.from;
    console.log(`[رسالة جديدة] من ${userId}: ${message.body}`);

    try {
        chat.sendStateTyping();
        let aiResponse = "";

        try {
            // المحاولة الأولى: Gemini
            console.log("محاولة الرد عبر Gemini...");
            aiResponse = await getGeminiResponse(userId, message.body);
        } catch (geminiError) {
            console.error("فشل Gemini، جاري التبديل إلى Llama 3...");
            // المحاولة الثانية: Llama 3 عبر Groq
            aiResponse = await getGroqResponse(userId, message.body);
        }

        // حفظ الرسالة ورد البوت في التاريخ الموحد
        if (!sessions[userId]) sessions[userId] = [];
        sessions[userId].push({ role: 'user', content: message.body });
        sessions[userId].push({ role: 'assistant', content: aiResponse });

        // إبقاء التاريخ قصيراً للمحافظة على الأداء (آخر 10 رسائل)
        if (sessions[userId].length > 10) sessions[userId].shift();

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
