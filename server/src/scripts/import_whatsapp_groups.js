import fetch from 'node-fetch';
import pg from 'pg';

const { Client } = pg;

// Credenciais Z-API
const ZAPI_INSTANCE_ID = '3CD723E75E1810AC37A19E692ED0BBB5';
const ZAPI_TOKEN = 'FE40A4039148B278C6D58A38';
const ZAPI_CLIENT_TOKEN = 'F1d62cfb33be84863a5600cb29b9ec05eS';

// Database
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable';

async function importWhatsAppGroups() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('📱 Buscando grupos do WhatsApp via Z-API...\n');

        // 1. Buscar grupos da Z-API
        const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/groups`;

        const response = await fetch(zapiUrl, {
            method: 'GET',
            headers: {
                'Client-Token': ZAPI_CLIENT_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Z-API error: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const apiResponse = await response.json();

        // Debug: mostrar resposta completa
        console.log('🔍 Resposta da Z-API:');
        console.log(JSON.stringify(apiResponse, null, 2));
        console.log('\n');

        // Z-API pode retornar um array direto ou um objeto com propriedades
        let groups = [];
        if (Array.isArray(apiResponse)) {
            groups = apiResponse;
        } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
            groups = apiResponse.data;
        } else if (apiResponse.groups && Array.isArray(apiResponse.groups)) {
            groups = apiResponse.groups;
        }

        console.log(`✅ ${groups.length} grupos encontrados na Z-API\n`);

        if (groups.length === 0) {
            console.log('⚠️  Nenhum grupo encontrado.');
            console.log('   Verifique se:');
            console.log('   - A instância está conectada ao WhatsApp');
            console.log('   - As credenciais estão corretas');
            console.log('   - Há grupos no WhatsApp dessa conta\n');
            return;
        }

        // 2. Conectar ao banco
        console.log('🔌 Conectando ao banco de dados...\n');
        await client.connect();

        // Buscar ID do admin
        const adminResult = await client.query(
            "SELECT id FROM users WHERE email = 'mamoscatelli@gmail.com'"
        );

        if (adminResult.rows.length === 0) {
            console.error('❌ Usuário admin não encontrado.');
            process.exit(1);
        }

        const adminId = adminResult.rows[0].id;

        // 3. Importar grupos
        console.log('📥 Importando grupos para o banco...\n');

        let imported = 0;
        let skipped = 0;

        for (const group of groups) {
            try {
                const groupId = group.id || group.jid || group.groupId;
                const groupName = group.subject || group.name || 'Grupo sem nome';
                const groupDesc = group.description || group.desc || '';
                const groupImage = group.image || group.pictureUrl || null;

                // Verificar se grupo já existe pelo zapi_id
                const existing = await client.query(
                    'SELECT id FROM conversations WHERE zapi_id = $1',
                    [groupId]
                );

                if (existing.rows.length > 0) {
                    console.log(`  ⏭️  Grupo "${groupName}" já existe (skip)`);
                    skipped++;
                    continue;
                }

                // Inserir grupo
                const result = await client.query(
                    `INSERT INTO conversations (
                        name, 
                        description, 
                        is_group, 
                        max_members, 
                        created_by, 
                        zapi_id,
                        photo_url
                    )
                    VALUES ($1, $2, true, 256, $3, $4, $5)
                    RETURNING id, name`,
                    [
                        groupName,
                        groupDesc,
                        adminId,
                        groupId,
                        groupImage
                    ]
                );

                const conversationId = result.rows[0].id;
                console.log(`  ✓ Grupo "${groupName}" importado`);

                // Importar participantes se houver
                const participants = group.participants || group.members || [];
                if (participants.length > 0) {
                    let memberCount = 0;
                    for (const participant of participants) {
                        try {
                            const phone = participant.phone || participant.id || participant._serialized;
                            const name = participant.name || participant.notify || participant.pushname || 'Participante';
                            const isAdmin = participant.isAdmin || participant.admin || false;

                            await client.query(
                                `INSERT INTO participants (
                                    conversation_id, 
                                    phone, 
                                    display_name, 
                                    role
                                )
                                VALUES ($1, $2, $3, $4)
                                ON CONFLICT DO NOTHING`,
                                [
                                    conversationId,
                                    phone,
                                    name,
                                    isAdmin ? 'admin' : 'member'
                                ]
                            );
                            memberCount++;
                        } catch (err) {
                            // Ignorar erros de participantes
                        }
                    }
                    console.log(`    → ${memberCount} participantes adicionados`);
                }

                imported++;

            } catch (error) {
                console.error(`  ❌ Erro ao importar grupo:`, error.message);
            }
        }

        // 4. Estatísticas finais
        console.log('\n📊 Resumo da importação:');
        console.log(`  ✅ Importados: ${imported}`);
        console.log(`  ⏭️  Ignorados: ${skipped}`);
        console.log(`  📱 Total Z-API: ${groups.length}`);

        const totalGroups = await client.query(
            'SELECT COUNT(*) FROM conversations WHERE is_group = true'
        );
        console.log(`  📁 Total no banco: ${totalGroups.rows[0].count}`);

        console.log('\n🎉 Importação concluída!\n');

    } catch (error) {
        console.error('❌ Erro na importação:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        if (client) {
            await client.end();
        }
    }
}

importWhatsAppGroups();
