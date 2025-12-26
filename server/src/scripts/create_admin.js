import argon2 from 'argon2';
import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable';

// Gera senha aleatória segura
function generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
    }

    return password;
}

async function createAdminUser() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('🔌 Conectando ao banco de dados...\n');
        await client.connect();

        // Verificar se já existe um admin
        const checkResult = await client.query(
            "SELECT id, email FROM users WHERE email = 'admin@alphaview.com'"
        );

        if (checkResult.rows.length > 0) {
            console.log('⚠️  Usuário admin já existe!');
            console.log('📧 Email:', checkResult.rows[0].email);
            console.log('🆔 ID:', checkResult.rows[0].id);
            console.log('\n💡 Para resetar a senha, delete o usuário e execute este script novamente.\n');
            return;
        }

        // Gerar senha
        const password = generateSecurePassword(12);
        const passwordHash = await argon2.hash(password);

        console.log('👤 Criando usuário administrador...\n');

        // Inserir usuário admin
        const result = await client.query(
            `INSERT INTO users (name, email, password_hash, role, status, department)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, email, role, status, created_at`,
            ['Administrador', 'admin@alphaview.com', passwordHash, 'admin', 'active', 'TI']
        );

        const user = result.rows[0];

        console.log('✅ Usuário admin criado com sucesso!\n');
        console.log('═══════════════════════════════════════════════════');
        console.log('📋 CREDENCIAIS DO ADMINISTRADOR');
        console.log('═══════════════════════════════════════════════════');
        console.log('🆔 ID:         ', user.id);
        console.log('👤 Nome:       ', user.name);
        console.log('📧 Email:      ', user.email);
        console.log('🔑 Senha:      ', password);
        console.log('👔 Role:       ', user.role);
        console.log('📊 Status:     ', user.status);
        console.log('📅 Criado em:  ', new Date(user.created_at).toLocaleString('pt-BR'));
        console.log('═══════════════════════════════════════════════════');
        console.log('\n⚠️  IMPORTANTE: Guarde essas credenciais em local seguro!');
        console.log('💡 Use este email e senha para fazer login no sistema.\n');

    } catch (error) {
        console.error('❌ Erro ao criar usuário admin:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('👋 Conexão encerrada.\n');
    }
}

createAdminUser();
