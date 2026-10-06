require('dotenv').config();
const axios = require('axios');
const systemPrompt = require('./prompt');

async function testGroqUpdate() {
    console.log("--- تجربة رد البوت (باستخدام المحرك الاحتياطي Llama 3) بعد التحديث ---");
    
    const questions = [
        "مرحبا، هل تسوون سمكرة ورش بويات؟",
        "وش الخدمات المتاحة عندكم؟"
    ];

    for (let q of questions) {
        console.log(`\nالعميل: ${q}`);
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: q }
                ],
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`البوت: ${response.data.choices[0].message.content}`);
        } catch (e) {
            console.log("حدث خطأ في الاتصال بالمحرك الاحتياطي.");
        }
    }
}

testGroqUpdate();
