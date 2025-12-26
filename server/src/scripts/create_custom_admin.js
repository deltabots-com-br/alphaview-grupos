import argon2 from 'argon2';
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable';

async function createCustomAdmin() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('🔌 Conectando ao banco de dados...\n');
        await client.connect();

        const email = 'mamoscatelli@gmail.com';
        const password = 'Charly1307!';
        const name = 'Administrador';

        console.log('👤 Criando usuário administrador...\n');

        const passwordHash = await argon2.hash(password);

        const result = await client.query(
            `INSERT INTO users (name, email, password_hash, role, status, department)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, email, role, status, created_at`,
            [name, email, passwordHash, 'admin', 'active', 'Administração']
        );

        const user = result.rows[0];

        console.log('✅ Usuário admin criado com sucesso!\n');
        console.log('═══════════════════════════════════════════════════');
        console.log('📋 CREDENCIAIS DO ADMINISTRADOR');
        console.log('═══════════════════════════════════════════════════');
        console.log('🆔 ID:         ', user.id);
        console.log('👤 Nome:       ', user.name);
        console.log('📧 Email:      ', user.email);
        console.log('🔑 Senha:       Charly1307!');
        console.log('👔 Role:       ', user.role);
        console.log('📊 Status:     ', user.status);
        console.log('📅 Criado em:  ', new Date(user.created_at).toLocaleString('pt-BR'));
        console.log('═══════════════════════════════════════════════════');
        console.log('\n✅ Use este email e senha para fazer login no sistema.\n');

    } catch (error) {
        console.error('❌ Erro ao criar usuário admin:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('👋 Conexão encerrada.\n');
    }
}

createCustomAdmin();
