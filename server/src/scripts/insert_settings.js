import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable';

async function insertSettings() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco de dados');

        // Inserir configurações padrão
        await client.query(`
            INSERT INTO system_settings (key, value, description)
            VALUES 
                ('company_name', 'Sistema de Grupos WhatsApp', 'Nome da empresa/sistema exibido no dashboard'),
                ('company_plan', 'basic', 'Plano contratado: basic, professional, enterprise')
            ON CONFLICT (key) DO NOTHING
        `);

        console.log('✅ Configurações padrão inseridas/verificadas');

        // Verificar o que existe no banco
        const result = await client.query('SELECT key, value FROM system_settings ORDER BY key');
        console.log('\n📋 Configurações no banco:');
        result.rows.forEach(row => {
            console.log(`  ${row.key}: ${row.value}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await client.end();
    }
}

insertSettings();
