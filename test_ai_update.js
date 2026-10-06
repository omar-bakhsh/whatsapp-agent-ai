require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const systemPrompt = require('./prompt');

async function testUpdate() {
    console.log("--- تجربة رد البوت بعد التحديث (اختبار السمكرة والخدمات) ---");
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const questions = [
        "مرحبا، هل تسوون سمكرة ورش بويات؟",
        "وش الخدمات المتاحة عندكم؟"
    ];

    for (let q of questions) {
        console.log(`\nالعميل: ${q}`);
        try {
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: "فهمت. تفضل." }] }
                ]
            });
            const result = await chat.sendMessage(q);
            console.log(`البوت: ${result.response.text()}`);
        } catch (e) {
            console.log("حدث خطأ في الاختبار، تأكد من مفتاح الـ API.");
        }
    }
}

testUpdate();
