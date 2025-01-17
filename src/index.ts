import 'dotenv/config';
import { CryptoChatRoom } from './cryptoChatRoom';

async function main() {
    const chatRoom = new CryptoChatRoom();
    await chatRoom.simulateMultipleDiscussions();
}

main().catch(console.error); 