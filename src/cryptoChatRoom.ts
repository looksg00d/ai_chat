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
import { DataFetchService } from './services/dataFetchService';

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

    private reactions = ['🚀', '💎', '🤔', '👀', '😅', '🤝', '💪', '🎯', '🔥', '⚡️'];

    private client: OpenAI;
    private messageService: MessageService;
    private roomId: string;
    private readonly AUTO_REPLY_CHANCE = 0.8; // 80% шанс ответа
    private readonly MAX_AUTO_REPLIES = 2; // Максимум 2 автоответа
    private rl: readline.Interface;
    private dataFetchService: DataFetchService;

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

        this.dataFetchService = new DataFetchService();

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

    async generateAIResponse(character: Character, prompt: string, topic: string): Promise<string> {
        try {
            console.log('\n=== Generating AI Response ===');
            console.log('Character:', character.name);
            console.log('Topic:', topic);
            console.log('User Prompt:', prompt);
            
            const chatHistory = await this.messageService.getRecentMessages(5, this.roomId);
            const context = chatHistory
                .map(msg => msg.content)
                .join(' ');
            
            console.log('\n=== Chat Context ===');
            console.log(context);

            const topicInfo = await this.dataFetchService.searchInfo(topic, context);
            
            console.log('\n=== Topic Info ===');
            console.log('Tweets:', topicInfo.tweets);
            console.log('Summary:', topicInfo.summary);

            const characterData = {
                name: character.name,
                username: character.username,
                system: character.system,
                bio: character.bio,
                lore: character.lore,
                messageExamples: character.messageExamples,
                adjectives: character.adjectives,
                style: character.style
            };

            console.log('\n=== Full GPT Prompt ===');
            const systemPrompt = `You are a character defined by the following JSON data: ${JSON.stringify(characterData, null, 2)}.
                                Current topic information:
                                ${topicInfo.summary}
                                
                                Use this information to form your opinion, but maintain your character's perspective and style.
                                Reference specific facts or tweets if relevant.
                                Stay true to your character's personality while discussing real information.`;
            
            console.log('System Prompt:', systemPrompt);
            console.log('User Message:', prompt);

            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                model: "gpt-3.5-turbo",
                temperature: 0.8,
                presence_penalty: 0.3,
                frequency_penalty: 0.3,
                max_tokens: 150
            });

            console.log('\n=== GPT Response ===');
            console.log(completion.choices[0].message.content);
            
            return completion.choices[0].message.content || '';
        } catch (error) {
            console.error('Error generating response:', error);
            return '';
        }
    }

    async testCharacter(character: Character) {
        console.log(`=== Тест персонажа: ${character.username} ===\n`);
        const response = await this.generateAIResponse(character, "BeraChain launch", "BeraChain launch");
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

                let currentTopic = topic;
                let discussionHistory: Array<{
                    speaker: Character;
                    message: string;
                    isQuestion: boolean;
                    topic: string;
                }> = [];

                // Отслеживаем, кто уже высказался по текущей теме
                let availableCharacters = [...this.characters];

                // Генерируем первое сообщение
                const firstSpeaker = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
                const firstResponse = await this.generateAIResponse(firstSpeaker, currentTopic, currentTopic);
                const isFirstQuestion = firstResponse.trim().endsWith('?');
                
                console.log(`\n${firstSpeaker.username}: ${firstResponse}\n`);
                discussionHistory.push({
                    speaker: firstSpeaker,
                    message: firstResponse,
                    isQuestion: isFirstQuestion,
                    topic: currentTopic
                });

                availableCharacters = availableCharacters.filter(char => char.username !== firstSpeaker.username);

                while (true) {
                    const continueChat = await this.askQuestion("Продолжить беседу? (yes/no): ");
                    if (continueChat.toLowerCase() !== 'yes') {
                        console.log("\n---\nБеседа завершена\n---\n");
                        break;
                    }

                    // Спрашиваем, хочет ли пользователь сменить тему
                    const changeTopic = await this.askQuestion("Сменить тему? (yes/no): ");
                    if (changeTopic.toLowerCase() === 'yes') {
                        const newTopic = await this.askQuestion("Новая тема: ");
                        if (newTopic.trim()) {
                            currentTopic = newTopic;
                            // При смене темы обновляем список доступных персонажей
                            availableCharacters = [...this.characters];
                            console.log(`\n--- Новая тема: ${currentTopic} ---\n`);
                        }
                    }

                    // Проверяем, изменилась ли тема в последнем сообщении
                    const lastMessage = discussionHistory[discussionHistory.length - 1];
                    const topicChanged = lastMessage.topic !== currentTopic;

                    // Если тема изменилась, обновляем список доступных персонажей
                    if (topicChanged) {
                        availableCharacters = [...this.characters];
                    } else if (availableCharacters.length === 0) {
                        console.log("\n--- Новый круг обсуждения ---\n");
                        availableCharacters = [...this.characters];
                    }

                    const nextSpeaker = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
                    availableCharacters = availableCharacters.filter(char => char.username !== nextSpeaker.username);

                    const shouldAnswerQuestion = lastMessage.isQuestion && Math.random() < 0.7;

                    let prompt = `Topic: ${currentTopic}\n` +
                        `Previous message: ${lastMessage.message}\n` +
                        `${shouldAnswerQuestion ? 'Answer the question above while staying in character.' : 
                        'Continue the discussion while staying in character.'}\n` +
                        `Previous topic was: ${lastMessage.topic}`;

                    const response = await this.generateAIResponse(nextSpeaker, prompt, currentTopic);
                    const isQuestion = response.trim().endsWith('?');

                    console.log(`\n${nextSpeaker.username}: ${response}\n`);
                    discussionHistory.push({
                        speaker: nextSpeaker,
                        message: response,
                        isQuestion,
                        topic: currentTopic
                    });

                    if (Math.random() < 0.15) {
                        const reaction = this.reactions[Math.floor(Math.random() * this.reactions.length)];
                        console.log(`${reaction}\n`);
                    }

                    await this.delay(500);
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
                
                const response = await this.generateAIResponse(character, prompt, topic);
                console.log(`\n${character.username}: ${response}\n`);
                
                repliesCount++;
            } catch (error) {
                console.error(`Ошибка при генерации автоответа от ${character.name}:`, error);
            }
        }
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
} 