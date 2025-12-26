import argon2 from 'argon2';
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = 'postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable';

async function testLoginLogic() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('🔌 Conectando ao banco...\n');
        await client.connect();

        const email = 'mamoscatelli@gmail.com';
        const password = 'Charly1307!';

        console.log('📧 Buscando usuário:', email);
        const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            console.log('❌ Usuário não encontrado!');
            return;
        }

        const user = result.rows[0];
        console.log('\n✅ Usuário encontrado:');
        console.log('  ID:', user.id);
        console.log('  Nome:', user.name);
        console.log('  Email:', user.email);
        console.log('  Role:', user.role);
        console.log('  Status:', user.status);

        console.log('\n🔐 Testando senha...');
        const isValid = await argon2.verify(user.password_hash, password);

        if (isValid) {
            console.log('✅ Senha correta!');
        } else {
            console.log('❌ Senha incorreta!');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

testLoginLogic();
