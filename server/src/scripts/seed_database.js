import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable';

async function seedDatabase() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('🌱 Iniciando seed do banco de dados...\n');
        await client.connect();

        // Buscar ID do admin
        const adminResult = await client.query(
            "SELECT id FROM users WHERE email = 'mamoscatelli@gmail.com'"
        );

        if (adminResult.rows.length === 0) {
            console.error('❌ Usuário admin não encontrado. Execute create_custom_admin.js primeiro.');
            process.exit(1);
        }

        const adminId = adminResult.rows[0].id;
        console.log('✅ Admin encontrado:', adminId);

        // 1. CRIAR TAGS
        console.log('\n📌 Criando tags...');
        const tags = [
            { name: 'médico', color: '#10b981' },
            { name: 'enfermagem', color: '#8b5cf6' },
            { name: 'urgente', color: '#ef4444' },
            { name: 'cardiologia', color: '#3b82f6' },
            { name: 'uti', color: '#dc2626' },
            { name: 'diagnóstico', color: '#06b6d4' },
            { name: 'radiologia', color: '#14b8a6' },
            { name: 'administrativo', color: '#f59e0b' },
            { name: 'farmácia', color: '#ec4899' },
            { name: 'laboratório', color: '#0ea5e9' }
        ];

        const tagIds = {};
        for (const tag of tags) {
            const result = await client.query(
                'INSERT INTO tags (name, color) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id, name',
                [tag.name, tag.color]
            );
            if (result.rows.length > 0) {
                tagIds[tag.name] = result.rows[0].id;
                console.log(`  ✓ Tag "${tag.name}" criada`);
            }
        }

        // 2. CRIAR GRUPOS
        console.log('\n👥 Criando grupos...');
        const groups = [
            {
                name: 'Equipe Médica - Cardiologia',
                description: 'Coordenação e comunicação da equipe de cardiologia',
                max_members: 100,
                tags: ['médico', 'cardiologia', 'urgente']
            },
            {
                name: 'Enfermagem - UTI',
                description: 'Equipe de enfermagem da Unidade de Terapia Intensiva',
                max_members: 50,
                tags: ['enfermagem', 'uti']
            },
            {
                name: 'Radiologia e Diagnóstico',
                description: 'Equipe de radiologia e exames diagnósticos',
                max_members: 50,
                tags: ['diagnóstico', 'radiologia']
            },
            {
                name: 'Administrativo - Recepção',
                description: 'Equipe administrativa e de atendimento ao paciente',
                max_members: 30,
                tags: ['administrativo']
            },
            {
                name: 'Farmácia Hospitalar',
                description: 'Coordenação da equipe de farmácia e dispensação',
                max_members: 25,
                tags: ['farmácia']
            },
            {
                name: 'Laboratório Clínico',
                description: 'Equipe de análises clínicas e laboratoriais',
                max_members: 40,
                tags: ['laboratório', 'diagnóstico']
            },
            {
                name: 'Equipe Cirúrgica',
                description: 'Coordenação da equipe do centro cirúrgico',
                max_members: 60,
                tags: ['médico', 'urgente']
            },
            {
                name: 'Pediatria',
                description: 'Equipe médica e de enfermagem pediátrica',
                max_members: 50,
                tags: ['médico', 'enfermagem']
            }
        ];

        const groupIds = [];
        for (const group of groups) {
            // Criar grupo
            const groupResult = await client.query(
                `INSERT INTO conversations (name, description, is_group, max_members, created_by)
                 VALUES ($1, $2, true, $3, $4)
                 RETURNING id, name`,
                [group.name, group.description, group.max_members, adminId]
            );

            const groupId = groupResult.rows[0].id;
            groupIds.push(groupId);
            console.log(`  ✓ Grupo "${group.name}" criado`);

            // Adicionar tags ao grupo
            for (const tagName of group.tags) {
                if (tagIds[tagName]) {
                    await client.query(
                        'INSERT INTO conversation_tags (conversation_id, tag_id) VALUES ($1, $2)',
                        [groupId, tagIds[tagName]]
                    );
                }
            }
        }

        // 3. CRIAR PARTICIPANTES DE EXEMPLO
        console.log('\n👤 Adicionando membros aos grupos...');
        const members = [
            { name: 'Dr. João Silva', phone: '+5511999887766' },
            { name: 'Dra. Maria Santos', phone: '+5511988776655' },
            { name: 'Enf. Ana Costa', phone: '+5511977665544' },
            { name: 'Dr. Pedro Lima', phone: '+5511966554433' },
            { name: 'Enf. Carlos Oliveira', phone: '+5511955443322' },
            { name: 'Dra. Julia Rodrigues', phone: '+5511944332211' },
            { name: 'Téc. Roberto Alves', phone: '+5511933221100' },
            { name: 'Atend. Fernanda Costa', phone: '+5511922110099' }
        ];

        let totalMembers = 0;
        for (let i = 0; i < groupIds.length; i++) {
            const groupId = groupIds[i];
            // Adicionar 2-4 membros aleatórios por grupo
            const numMembers = Math.floor(Math.random() * 3) + 2;

            for (let j = 0; j < numMembers && j < members.length; j++) {
                const member = members[(i + j) % members.length];
                await client.query(
                    `INSERT INTO participants (conversation_id, phone, display_name, role)
                     VALUES ($1, $2, $3, 'member')
                     ON CONFLICT DO NOTHING`,
                    [groupId, member.phone, member.name]
                );
                totalMembers++;
            }
        }
        console.log(`  ✓ ${totalMembers} membros adicionados`);

        // 4. ESTATÍSTICAS FINAIS
        console.log('\n📊 Estatísticas:');
        const statsGroups = await client.query('SELECT COUNT(*) FROM conversations WHERE is_group = true');
        const statsTags = await client.query('SELECT COUNT(*) FROM tags');
        const statsMembers = await client.query('SELECT COUNT(*) FROM participants');

        console.log(`  📁 Grupos: ${statsGroups.rows[0].count}`);
        console.log(`  🏷️  Tags: ${statsTags.rows[0].count}`);
        console.log(`  👥 Membros: ${statsMembers.rows[0].count}`);

        console.log('\n🎉 Seed concluído com sucesso!\n');

    } catch (error) {
        console.error('❌ Erro ao popular banco:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedDatabase();
