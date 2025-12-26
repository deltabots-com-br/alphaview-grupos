import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';

// Primeiro fazer login para obter o token
async function testConversationsAPI() {
    console.log('🧪 Testando API de Conversations\n');

    try {
        // 1. Login
        console.log('1. Fazendo login...');
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'mamoscatelli@gmail.com',
                password: 'Charly1307!'
            })
        });

        const loginData = await loginResponse.json();
        if (!loginResponse.ok) {
            throw new Error(`Login falhou: ${loginData.error}`);
        }

        const token = loginData.accessToken;
        console.log('✅ Login bem-sucedido\n');

        // 2. Listar conversations (deve estar vazio)
        console.log('2. Listando conversations...');
        const listResponse = await fetch(`${API_URL}/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const conversations = await listResponse.json();
        console.log(`✅ Conversations encontradas: ${conversations.length}`);
        console.log(JSON.stringify(conversations, null, 2));
        console.log('');

        // 3. Criar nova conversation
        console.log('3. Criando novo grupo...');
        const createResponse = await fetch(`${API_URL}/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Equipe Médica - Cardiologia',
                description: 'Grupo de coordenação da equipe de cardiologia',
                max_members: 100
            })
        });

        const newConversation = await createResponse.json();
        if (!createResponse.ok) {
            throw new Error(`Criar conversation falhou: ${newConversation.error}`);
        }

        console.log('✅ Grupo criado:');
        console.log(JSON.stringify(newConversation, null, 2));
        console.log('');

        // 4. Buscar conversation específica
        console.log(`4. Buscando grupo ${newConversation.id}...`);
        const getResponse = await fetch(`${API_URL}/conversations/${newConversation.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const conversation = await getResponse.json();
        console.log('✅ Grupo encontrado:');
        console.log(JSON.stringify(conversation, null, 2));
        console.log('');

        // 5. Listar membros (deve estar vazio)
        console.log(`5. Listando membros do grupo...`);
        const membersResponse = await fetch(`${API_URL}/conversations/${newConversation.id}/members`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const members = await membersResponse.json();
        console.log(`✅ Membros encontrados: ${members.length}`);
        console.log(JSON.stringify(members, null, 2));
        console.log('');

        console.log('🎉 Todos os testes passaram!');

    } catch (error) {
        console.error('❌ Erro nos testes:', error.message);
        process.exit(1);
    }
}

testConversationsAPI();
