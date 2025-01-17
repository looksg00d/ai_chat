import { CryptoChatRoom } from './cryptoChatRoom';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSingleDiscussion() {
    const chatRoom = new CryptoChatRoom();
    console.log("=== Тестовая дискуссия ===\n");
    await chatRoom.simulateDiscussion("BeraChain запуск");
}

testSingleDiscussion().catch(console.error); 