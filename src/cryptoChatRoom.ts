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
                You are ${character.name}.
                
                Your personality and background:
                ${character.system}
                
                Your style traits:
                ${character.style.all.join(', ')}
                
                Chat style specifics:
                ${character.style.chat.join(', ')}
                
                Common topics you discuss:
                ${character.topics.join(', ')}
                
                Your typical expressions and words:
                ${character.adjectives.join(', ')}
                
                Example of how you talk:
                ${character.messageExamples.map(([q, a]) => 
                    `Q: ${q.content.text}\nA: ${a.content.text}`
                ).join('\n')}
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
                temperature: 1.4,
                presence_penalty: 0.3,
                frequency_penalty: 0.3,
                max_tokens: 60,
            });

            let response = completion.choices[0].message.content || "...";
            
            if (Math.random() < 0.2) {
                response = response.split('.')[0];
            }
            
            if (Math.random() < 0.3) {
                const randomAdjective = character.adjectives[Math.floor(Math.random() * character.adjectives.length)];
                response = `${response} ${randomAdjective}`;
            }

            return response;
        } catch (error: any) {
            console.error("API Error:", error?.status);
            return "...";
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
}

// Использование:
const chatRoom = new CryptoChatRoom();
chatRoom.simulateMultipleDiscussions(); 