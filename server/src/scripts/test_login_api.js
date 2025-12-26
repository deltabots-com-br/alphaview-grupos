import fetch from 'node-fetch';

async function testLoginAPI() {
    console.log('🧪 Testando API de Login\n');
    console.log('='.repeat(50));

    const loginData = {
        email: 'mamoscatelli@gmail.com',
        password: 'Charly1307!'
    };

    try {
        console.log('\n📤 Enviando requisição POST para /api/auth/login...\n');
        console.log('  Email:', loginData.email);
        console.log('  URL: http://localhost:3001/api/auth/login');

        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        console.log('\n📥 Resposta recebida:');
        console.log('  Status:', response.status, response.statusText);
        console.log('  Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

        const data = await response.json();

        if (response.ok) {
            console.log('\n✅ LOGIN BEM-SUCEDIDO!\n');
            console.log('  Usuário:', data.user?.name);
            console.log('  Email:', data.user?.email);
            console.log('  Role:', data.user?.role);
            console.log('  Access Token:', data.accessToken ? '✓ Gerado' : '✗ Faltando');
            console.log('  Refresh Token:', data.refreshToken ? '✓ Gerado' : '✗ Faltando');
        } else {
            console.log('\n❌ LOGIN FALHOU!\n');
            console.log('  Erro:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('\n❌ Erro na requisição:', error.message);
        console.error('\n  Stack:', error.stack);
    }
}

testLoginAPI();
