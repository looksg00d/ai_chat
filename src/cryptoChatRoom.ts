import { Character } from "./types";
import { cryptoDegen } from "./characters/cryptoDegen";
import { cryptoOG } from "./characters/cryptoOG";
import { mevDev } from "./characters/mevDev";
import { retroDropper } from "./characters/retroDropper";
import { chatGrinder } from "./characters/chatGrinder";
import { chainAmbassador } from "./characters/chainAmbassador";
import OpenAI from "openai";
import * as dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as readline from 'readline';

dotenv.config();

export class CryptoChatRoom {
    private characters: Character[] = [
        cryptoDegen,
        cryptoOG,
        mevDev,
        retroDropper,
        chatGrinder,
        chainAmbassador
    ];

    private topics = [
        "BeraChain launch",
        "Base token rumors",
        "Linea TVL growth",
        "Monad testnet",
        "0G AI integrations",
        "Sahara Labs update",
        "MegaETH architecture",
        "BOB on Bitcoin"
    ];

    private reactions = ['🚀', '💎', '🤔', '👀', '😅', '🤝', '💪', '🎯', '🔥', '⚡️'];

    private client: OpenAI;

    private rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    constructor() {
        const proxyUrl = `http://wqnfutnw:a57omrbixk0q@207.244.217.165:6712`;
        
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            httpAgent: new HttpsProxyAgent(proxyUrl)
        });
    }

    async generateAIResponse(character: Character, prompt: string): Promise<string> {
        try {
            const characterContext = `
                You are ${character.name}, a person who answers questions on crypto forums for money.
                You don't really care about helping people, you just want to get paid.
                Your responses should be:
                - Short and minimal effort (why write more if payment is the same?)
                - Sometimes slightly incorrect (you don't really verify information)
                - Often dismissive or bored
                - Without emojis or hashtags (that's too much effort)
                - Sometimes you might even contradict yourself
                - You might give incomplete answers to encourage more questions (more money)
                
                Your background:
                ${character.system}
                
                Your typical expressions:
                ${character.adjectives.slice(0, 5).join(', ')}
                
                Remember: You're not here to help, you're here for the money. Keep responses under 2 sentences usually.
            `;

            const completion = await this.client.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: characterContext 
                    },
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ],
                model: "gpt-3.5-turbo",
                temperature: 1.2,
                presence_penalty: 0.4,
                frequency_penalty: 0.4,
                max_tokens: 40,
            });

            let response = completion.choices[0].message.content || "whatever man";
            
            // Иногда обрываем ответ на полуслове
            if (Math.random() < 0.1) {
                response = response.split(' ').slice(0, -1).join(' ') + "...";
            }

            // Иногда добавляем признаки спешки или невнимательности
            if (Math.random() < 0.15) {
                response = response.toLowerCase();
            }

            return response;
        } catch (error: any) {
            console.error("API Error:", error?.status);
            return "cant be bothered to answer rn";
        }
    }

    async simulateDiscussion(topic: string) {
        console.log(`=== New Discussion: ${topic} ===\n`);

        interface Message {
            username: string;
            content: string;
            isQuestion: boolean;
        }
        
        let discussionHistory: Message[] = [];
        
        // 2-3 participants
        const participants = this.shuffleArray(this.characters)
            .slice(0, 2 + Math.floor(Math.random() * 2));

        // Track message count per user
        const userMessageCount: Record<string, number> = {};
        participants.forEach(p => userMessageCount[p.username] = 0);

        // Start discussion (50/50 question or statement)
        const starter = participants[Math.floor(Math.random() * participants.length)];
        const isQuestion = Math.random() < 0.5;
        const startMessage = isQuestion ? 
            `what's up with ${topic}?` : 
            `checking out ${topic}`;

        console.log(`${starter.username}: ${startMessage}`);
        userMessageCount[starter.username]++;
        
        discussionHistory.push({
            username: starter.username,
            content: startMessage,
            isQuestion
        });

        // 2-4 messages
        const messageCount = 2 + Math.floor(Math.random() * 3);

        for (let i = 0; i < messageCount; i++) {
            // Select speaker with least messages
            const minMessages = Math.min(...Object.values(userMessageCount));
            const eligibleSpeakers = participants.filter(p => 
                userMessageCount[p.username] === minMessages && 
                p.username !== discussionHistory[discussionHistory.length - 1]?.username
            );

            if (eligibleSpeakers.length === 0) continue;

            const speaker = eligibleSpeakers[Math.floor(Math.random() * eligibleSpeakers.length)];
            const lastMessage = discussionHistory[discussionHistory.length - 1];
            
            // Lower chance to ask questions (30% normally, 10% if last message was a question)
            const shouldAskQuestion = Math.random() < (lastMessage?.isQuestion ? 0.1 : 0.3);

            const prompt = `You are ${speaker.name}.
                
                Your recent chat history:
                ${discussionHistory.slice(-3).map(m => `${m.username}: ${m.content}`).join('\n')}
                
                Topic: ${topic}
                ${lastMessage?.isQuestion ? 'Answer the question above.' : 'Continue the discussion.'}
                ${shouldAskQuestion ? 'End your response with a question.' : ''}
                
                Remember to stay in character and use your typical style.
                Sometimes be brief, unclear or ignore messages - just like real chat.
                
                Generate a response:`;

            const response = await this.generateAIResponse(speaker, prompt);
            console.log(`${speaker.username}: ${response}`);
            userMessageCount[speaker.username]++;
            
            const isQuestion = response.trim().endsWith('?');
            discussionHistory.push({
                username: speaker.username,
                content: response,
                isQuestion
            });

            if (Math.random() < 0.15) {
                const reaction = this.reactions[Math.floor(Math.random() * this.reactions.length)];
                console.log(`${reaction}`);
            }
            
            await this.delay(500 + Math.random() * 1500);
        }

        console.log("\n=== End of Discussion ===");
    }

    private shuffleArray<T>(array: T[]): T[] {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async simulateMultipleDiscussions() {
        for (const topic of this.topics) {
            await this.simulateDiscussion(topic);
            await this.delay(2000);
            console.log("\n");
        }
    }

    async testCharacter(character: Character) {
        console.log(`=== Тест персонажа: ${character.username} ===\n`);
        const response = await this.generateAIResponse(character, "BeraChain launch");
        console.log(`${character.username}: ${response}\n`);
    }

    private async askQuestion(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async startInteractiveChat() {
        console.log("=== Интерактивный Крипто Чат ===");
        console.log("Введите тему или '0' для выхода\n");

        try {
            while (true) {
                const topic = await this.askQuestion("Тема: ").catch(e => '0');
                
                if (topic === '0' || !topic.trim()) {
                    console.log("Чат завершен");
                    this.rl.close();
                    break;
                }

                while (true) {
                    console.log("\nВыберите отвечающего:");
                    this.characters.forEach((char, index) => {
                        console.log(`${index + 1} - ${char.name}`);
                    });

                    const speakerInput = await this.askQuestion("Номер персонажа (или 0 для новой темы): ");
                    const speakerIndex = parseInt(speakerInput) - 1;
                    
                    if (speakerInput === '0' || isNaN(speakerIndex) || !speakerInput.trim()) {
                        console.log("\n---\n");
                        break;
                    }

                    if (speakerIndex >= 0 && speakerIndex < this.characters.length) {
                        const speaker = this.characters[speakerIndex];
                        const response = await this.generateAIResponse(speaker, `What do you think about ${topic}?`);
                        console.log(`\n${speaker.username}: ${response}\n`);
                        await this.delay(500); // Небольшая пауза между сообщениями
                    } else {
                        console.log("Неверный номер персонажа. Попробуйте снова.");
                    }
                }
            }
        } catch (error) {
            console.error("Произошла ошибка:", error);
        } finally {
            this.rl.close();
        }
    }
} 