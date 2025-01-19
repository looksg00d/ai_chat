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
import { Message } from './types';
import { MessageService } from './services/messageService';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

// Перемещаем интерфейс на уровень модуля
interface MessageExample {
    user: string;
    assistant: string;
}

interface CharacterData {
    system: string;
    messageExamples: MessageExample[];
    traits: string[];
}

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
    private messageService: MessageService;
    private roomId: string;
    private readonly AUTO_REPLY_CHANCE = 0.8; // 80% шанс ответа
    private readonly MAX_AUTO_REPLIES = 2; // Максимум 2 автоответа
    private rl: readline.Interface;

    constructor() {
        // Можно использовать фиксированную комнату для разработки
        this.roomId = process.env.NODE_ENV === 'development' 
            ? '11111111-1111-1111-1111-111111111111' 
            : uuidv4();
        this.messageService = new MessageService();
        
        const proxyUrl = `http://wqnfutnw:a57omrbixk0q@207.244.217.165:6712`;
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            httpAgent: new HttpsProxyAgent(proxyUrl)
        });

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Создаем комнату при инициализации
        this.initializeRoom().catch(error => {
            console.error("Ошибка при инициализации комнаты:", error);
        });
    }

    private async initializeRoom(): Promise<void> {
        try {
            await this.messageService.createRoom(this.roomId);
        } catch (error) {
            console.error("Не удалось создать комнату:", error);
            throw error;
        }
    }

    private async saveMessage(message: Message) {
        await this.messageService.saveMessage(message);
    }

    async generateAIResponse(character: Character, prompt: string): Promise<string> {
        try {
            const chatHistory = await this.messageService.getRecentMessages(10, this.roomId);
            
            // Создаем объект с контекстом персонажа
            const characterData = {
                name: character.name,
                username: character.username,
                system: character.system,
                bio: character.bio,
                lore: character.lore,
                messageExamples: character.messageExamples,
                adjectives: character.adjectives,
                style: character.style,
                chatHistory: [] // Пустая история
            };

            // Преобразуем в JSON
            const characterContext = JSON.stringify(characterData, null, 2);

            console.log('Формируем запрос для персонажа:', character.name);
            console.log('Контекст персонажа:', characterContext);
            
            console.log('Отправляем запрос к OpenAI...');

            const completion = await this.client.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: `You are a character defined by the following JSON data: ${characterContext}. 
                                 Maintain a neutral, indifferent tone with minimal engagement.
                                 Always use very short responses (1-2 sentences max).
                                 Be dismissive and show minimal interest.
                                 Avoid emojis and excessive punctuation.
                                 Respond in a low-effort, minimal way.` 
                    },
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ],
                model: "gpt-3.5-turbo",
                temperature: 0.7,
                presence_penalty: 0.2,
                frequency_penalty: 0.2,
                max_tokens: 50,
            });

            let responseText = completion.choices[0].message.content || "whatever man";

            await this.saveMessage({
                userName: 'User',
                content: prompt,
                roomId: this.roomId,
            });

            await this.saveMessage({
                userName: character.name,
                content: responseText,
                roomId: this.roomId,
            });

            return responseText;
        } catch (error: any) {
            console.error("OpenAI API Error:", {
                status: error?.status,
                message: error?.message,
                type: error?.type,
                code: error?.code
            });

            if (!process.env.OPENAI_API_KEY) {
                console.error("OPENAI_API_KEY не найден в переменных окружения");
                return "Error: API key not configured";
            }

            return "Sorry, having some technical difficulties. Try again later.";
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

    public async startInteractiveChat(): Promise<void> {
        console.log("=== Интерактивный Крипто Чат ===");
        console.log("Введите тему или '0' для выхода\n");

        try {
            while (true) {
                const topic = await this.askQuestion("Тема: ").catch((e: Error) => '0');
                
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
                        const response = await this.generateAIResponse(speaker, topic);
                        console.log(`\n${speaker.username}: ${response}\n`);
                        
                        // Убираем автоматические ответы
                        // await this.generateAutoReplies(speaker, topic);
                        
                        await this.delay(500);
                    } else {
                        console.log("Неверный номер персонажа. Попробуйте снова.");
                    }
                }
            }
        } catch (error: unknown) {
            console.error("Произошла ошибка:", error);
        } finally {
            this.rl.close();
        }
    }

    private async generateAutoReplies(originalSpeaker: Character, topic: string) {
        const otherCharacters = this.characters.filter(char => char !== originalSpeaker);
        const shuffledCharacters = this.shuffleArray(otherCharacters);
        let repliesCount = 0;
        
        for (const character of shuffledCharacters) {
            if (Math.random() > this.AUTO_REPLY_CHANCE || repliesCount >= this.MAX_AUTO_REPLIES) {
                continue;
            }
            
            try {
                const delay = 1000 + Math.random() * 2000;
                await this.delay(delay);
                
                const prompt = `What do you think about ${topic}?`;
                
                const response = await this.generateAIResponse(character, prompt);
                console.log(`\n${character.username}: ${response}\n`);
                
                repliesCount++;
            } catch (error) {
                console.error(`Ошибка при генерации автоответа от ${character.name}:`, error);
            }
        }
    }
} 