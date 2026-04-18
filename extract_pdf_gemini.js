require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function extractText() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const pdfData = fs.readFileSync('جدول صيانات الدورية/جدول صيانات الدورية-متخصص مازدا.pdf');
        
        const result = await model.generateContent([
            {
                inlineData: {
                    data: pdfData.toString('base64'),
                    mimeType: "application/pdf"
                }
            },
            "قم باستخراج جميع بيانات صيانة السيارة الدورية (من 10 آلاف إلى 160 ألف كم) الموجودة في هذا الملف وتلخيصها في شكل نصي منظم ودقيق ومختصر جداً، لا تضف أي حشو بل اكتب الجدول باختصار ليستفيد منه بوت واتساب."
        ]);
        
        console.log("=== EXTRACTION RESULT ===");
        console.log(result.response.text());
        console.log("=========================");
    } catch(e) {
        console.error(e);
    }
}

extractText();
