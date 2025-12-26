import authApi from '../services/authApi.js';

async function testLogin() {
    console.log('🧪 Testando login com API...\n');

    try {
        console.log('📧 Email: admin@alphaview.com');
        console.log('🔑 Senha: IFKC43MJlo4t\n');

        const response = await authApi.login('admin@alphaview.com', 'IFKC43MJlo4t');

        console.log('✅ Login bem-sucedido!\n');
        console.log('Resposta:');
        console.log(JSON.stringify(response, null, 2));

    } catch (error) {
        console.error('❌ Erro no login:');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
    }
}

testLogin();
