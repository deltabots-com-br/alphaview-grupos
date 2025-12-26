import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const DATABASE_URL = 'postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable';

async function runMigration() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('🔌 Conectando ao banco de dados...');
        await client.connect();
        console.log('✅ Conectado!\n');

        console.log('📄 Lendo arquivo init.sql...');
        const sqlFile = path.join(__dirname, '../../database/init.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('🚀 Executando migrations...\n');
        await client.query(sql);

        console.log('✅ Migrations executadas com sucesso!\n');

        // Verificar tabelas criadas
        console.log('📊 Verificando tabelas criadas:');
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        result.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        console.log(`\n🎉 Total de ${result.rows.length} tabelas criadas!`);

    } catch (error) {
        console.error('❌ Erro ao executar migrations:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n👋 Conexão encerrada.');
    }
}

runMigration();
