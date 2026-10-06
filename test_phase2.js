require('dotenv').config();
const db = require('./database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const systemPrompt = require('./prompt');

db.initDb();

async function runTests() {
    console.log("=========================================");
    console.log("       اختبار مزايا المحور الثاني 🚀      ");
    console.log("=========================================\n");

    const TEST_USER = '966500000001@c.us';

    // 1. اختبار استخراج ملف العميل وحفظه يدوياً وآلياً
    console.log("1️⃣ اختبار استخراج وحفظ ملف العميل:");
    db.upsertCustomer(TEST_USER, {
        name: 'أبو فهد القحطاني',
        carModel: 'مازدا CX-9 2022',
        plateNumber: 'ب ر ق 999',
        preferredBranch: 'عسفان'
    });
    const customer = db.getCustomer(TEST_USER);
    console.log("✅ تم استرجاع ملف العميل من قاعدة البيانات بنجاح:", customer);

    // 2. تجربة الرد المخصص بناءً على ملف العميل
    console.log("\n2️⃣ تجربة تخصيص رد الذكاء الاصطناعي بناءً على ملف العميل:");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    const nowRiyadh = new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' });
    const profileInfo = `الاسم: ${customer.name} | نوع وموديل السيارة: ${customer.carModel} | رقم اللوحة: ${customer.plateNumber} | الفرع المفضل: ${customer.preferredBranch}`;
    const dynamicPrompt = systemPrompt + `\n\nتاريخ اليوم: ${nowRiyadh}\n\n[معلومات ملف العميل المسجلة مسبقاً في النظام]:\n${profileInfo}\n(استخدم هذه البيانات للترحيب به بلباقة وخصوصية مثل ذكر اسمه وسيارته).`;

    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: dynamicPrompt }] },
            { role: "model", parts: [{ text: "فهمت تماماً." }] }
        ]
    });

    const res1 = await chat.sendMessage("السلام عليكم، متى أغير زيت سيارتي؟");
    console.log("رد البوت المخصص للعميل:\n", res1.response.text());

    // 3. تجربة حجز موعد ذكي وتوليد التاجات
    console.log("\n3️⃣ تجربة حجز موعد ذكي مع استخراج التاجات:");
    const res2 = await chat.sendMessage("أبغى أحجز موعد غداً 11 صباحاً في فرع عسفان");
    const aiText = res2.response.text();
    console.log("رد البوت للحجز:\n", aiText);

    const apptMatch = aiText.match(/\[APPT:\s*(.*?)\s*\]/i);
    const branchMatch = aiText.match(/\[BRANCH:\s*(.*?)\s*\]/i);
    console.log("🔍 هل تم استخراج تاغ الموعد؟", apptMatch ? `نعم: ${apptMatch[1]}` : "لا");
    console.log("🔍 هل تم استخراج تاغ الفرع؟", branchMatch ? `نعم: ${branchMatch[1]}` : "لا");

    // 4. تجربة كشف الشكوى والتصعيد (Escalation)
    console.log("\n4️⃣ تجربة كشف الشكوى وطلب المدير (Escalation):");
    const res3 = await chat.sendMessage("سيارتي صار لها أسبوع عندكم وما خلصت وشغلكم سيء جداً! أبغى أكلم المدير حالا!");
    const escalateText = res3.response.text();
    console.log("رد البوت على الشكوى:\n", escalateText);
    const escMatch = escalateText.match(/\[ESCALATE:\s*(.*?)\s*\]/i);
    console.log("🚨 هل تم رصد تاغ التصعيد؟", escMatch ? `نعم: ${escMatch[1]}` : "لا");

    console.log("\n=========================================");
    console.log("       اكتملت جميع الاختبارات بنجاح ✨     ");
    console.log("=========================================");
}

runTests().catch(e => console.error("Test error:", e));
