import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable';

async function clearData() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('🧹 Iniciando limpeza do banco de dados...');
        console.log('⚠️  Preservando: Usuários e Configurações da Empresa');

        await client.connect();

        // Start transaction
        await client.query('BEGIN');

        // 1. Clear Conversations (Cascades to Messages, Participants, ConversationTags, ScheduledMessages)
        console.log('🗑️  Removendo conversas, mensagens e participantes...');
        await client.query('DELETE FROM conversations');

        // 2. Clear Tags
        console.log('🗑️  Removendo tags...');
        await client.query('DELETE FROM tags');

        // 3. Clear Audit Logs
        console.log('🗑️  Removendo logs de auditoria...');
        await client.query('DELETE FROM audit_logs');

        // Commit transaction
        await client.query('COMMIT');

        console.log('\n✅ Limpeza concluída com sucesso!');
        console.log('📊 Estado atual:');

        const countUsers = await client.query('SELECT COUNT(*) FROM users');
        const countSettings = await client.query('SELECT COUNT(*) FROM system_settings');
        const countConversations = await client.query('SELECT COUNT(*) FROM conversations');

        console.log(`  👤 Usuários: ${countUsers.rows[0].count} (Preservados)`);
        console.log(`  ⚙️  Configs:  ${countSettings.rows[0].count} (Preservadas)`);
        console.log(`  💬 Grupos:   ${countConversations.rows[0].count} (Removidos)`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao limpar dados:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

clearData();
