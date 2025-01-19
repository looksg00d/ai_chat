import itemsPool from './dbConfig';

async function testDbConnection() {
    try {
        const client = await itemsPool.connect();
        console.log('Successfully connected to PostgreSQL');
        
        // Проверяем наличие расширения vector
        const vectorExtension = await client.query(
            "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')"
        );
        console.log('Vector extension installed:', vectorExtension.rows[0].exists);
        
        // Проверяем наличие таблицы memories
        const tableExists = await client.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memories')"
        );
        console.log('Memories table exists:', tableExists.rows[0].exists);
        
        client.release(true);
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await itemsPool.end();
    }
}

testDbConnection(); 