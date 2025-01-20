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
            console.log('Character System:', character.system);
            console.log('Character Bio:', character.bio);
            console.log('Character Style:', JSON.stringify(character.style, null, 2));
            console.log('Character Adjectives:', character.adjectives);
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

            console.log('\n=== Character Data Sent to GPT ===');
            console.log(JSON.stringify(characterData, null, 2));

            // Первый запрос - генерация ответа
            const generationPrompt = `You are in a casual crypto group chat.
                                    Topic: ${topicInfo.summary}
                                    
                                    STRICT RULES:
                                    - Keep responses VERY short (max 10 words)
                                    - NO punctuation at all (no commas no dots)
                                    - Write like you're too lazy to use shift or punctuation
                                    - No introductions or explanations
                                    - React naturally to: "${prompt}"`;

            console.log('\n=== Generation Prompt ===');
            console.log(generationPrompt);

            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: "system", content: generationPrompt },
                    { role: "user", content: prompt }
                ],
                model: "gpt-3.5-turbo",
                temperature: 0.8,
                max_tokens: 150
            });

            const generatedResponse = completion.choices[0].message.content || '';
            console.log('\n=== Generated Response ===');
            console.log(generatedResponse);

            // Обработка ответа
            let cleanedResponse = generatedResponse
                .replace(/[.,!?;:'"]/g, '') // убираем пунктуацию
                .replace(/^"/, '')  // убираем кавычки в начале
                .replace(/"$/, '')  // убираем кавычки в конце
                .trim();

            // Получаем последние сообщения из БД
            const recentMessages = await this.messageService.getRecentMessages(20, this.roomId);
            
            // Проверяем схожесть с предыдущими ответами
            const similarityPrompt = `Compare these messages and return similarity score (0.0 to 1.0):
            Message 1: "${cleanedResponse}"
            Message 2: "${recentMessages.map(m => m.content).join('" "')}"\n
            Return only the number.`;

            const similarity = await this.client.chat.completions.create({
                messages: [{ role: "user", content: similarityPrompt }],
                model: "gpt-3.5-turbo",
                temperature: 0.1,
                max_tokens: 10
            });

            const similarityScore = parseFloat(similarity.choices[0].message.content || '0');
            console.log('\n=== Similarity Score ===');
            console.log(similarityScore);

            // Если ответ слишком похож на предыдущие, генерируем новый
            if (similarityScore > 0.7) {
                console.log('\n=== Response too similar, generating alternative ===');
                const alternativePrompt = `Generate a completely different response about ${topic}.
                                         Must be unique and not similar to: "${cleanedResponse}"
                                         Keep it very short and casual, no punctuation.`;

                const alternative = await this.client.chat.completions.create({
                    messages: [
                        { role: "system", content: character.system },
                        { role: "user", content: alternativePrompt }
                    ],
                    model: "gpt-3.5-turbo",
                    temperature: 1.0, // Увеличиваем температуру для большей вариативности
                    max_tokens: 150
                });

                return alternative.choices[0].message.content || cleanedResponse;
            }

            // Только 10% шанс на эмодзи, хештеги полностью запрещены
            const canUseEmoji = Math.random() < 0.1;

            // Валидация
            const validationPrompt = `You are a chat quality validator for crypto messages.

Review this response: "${cleanedResponse}"

STRICT RULES:
1. Must be EXTREMELY short (max 10 words)
2. NO punctuation at all:
   - no commas
   - no dots
   - no ellipsis
   - no exclamation marks
3. Emojis: ${canUseEmoji ? 'max 1 allowed' : 'not allowed'}
4. Must feel super lazy
5. Write like typing takes too much effort

Bad examples (with punctuation):
- "yeah, saw it, crazy stuff"
- "melania token? meh, maybe later"
- "interesting, but not sure..."
- "pump looks good, might ape in"

Good examples (no punctuation):
- "yeah saw it crazy stuff"
- "melania token meh maybe later"
- "interesting but not sure"
- "pump looks good might ape"
- "nah im good"
- "same shit different day"

Fix any response that has ANY punctuation marks.
If it's good, return "VALID"`;

            console.log('\n=== Validation Prompt ===');
            console.log(validationPrompt);

            const validation = await this.client.chat.completions.create({
                messages: [{ role: "user", content: validationPrompt }],
                model: "gpt-3.5-turbo",
                temperature: 0.3,
                max_tokens: 150
            });

            const validationResult = validation.choices[0].message.content || '';
            console.log('\n=== Validation Result ===');
            console.log(validationResult);

            // Возвращаем исправленный ответ или оригинальный, если он прошел валидацию
            return validationResult === 'VALID' ? cleanedResponse : validationResult;

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