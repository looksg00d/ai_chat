import OpenAI from "openai";
import * as dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';

dotenv.config();

async function testOpenAIWithProxy() {
    try {
        // Формируем URL прокси с аутентификацией
        const proxyUrl = `http://wqnfutnw:a57omrbixk0q@207.244.217.165:6712`;
        
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            httpAgent: new HttpsProxyAgent(proxyUrl)
        });

        console.log("Пробуем подключиться к OpenAI через прокси...");
        
        const completion = await client.chat.completions.create({
            messages: [{ role: "user", content: "Say 'Hello, World!'" }],
            model: "gpt-3.5-turbo",
        });

        console.log("Ответ от API:", completion.choices[0].message.content);
        console.log("API работает корректно!");
        
    } catch (error: any) {
        console.error("Ошибка при подключении к API:");
        console.error("Статус:", error?.status);
        console.error("Сообщение:", error?.message);
        console.error("Полная ошибка:", error);
    }
}

testOpenAIWithProxy(); 