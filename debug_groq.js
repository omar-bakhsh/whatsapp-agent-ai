require('dotenv').config();
const axios = require('axios');
const systemPrompt = require('./prompt');

async function testGroq() {
    try {
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: "مرحبا" }
        ];

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama3-8b-8192",
            messages: messages,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Success:", response.data.choices[0].message.content);
    } catch (e) {
        if (e.response) {
            console.error("GROQ ERROR DATA:", JSON.stringify(e.response.data, null, 2));
        } else {
            console.error("GROQ ERROR:", e.message);
        }
    }
}
testGroq();
