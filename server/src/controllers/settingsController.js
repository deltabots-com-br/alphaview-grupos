import { query } from '../config/database.js';

// Obter configurações do sistema
export const getSettings = async (req, res) => {
    try {
        const result = await query(
            'SELECT key, value FROM system_settings ORDER BY key'
        );

        // Converter array de {key, value} para objeto
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        res.json(settings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

// Atualizar configurações do sistema
export const updateSettings = async (req, res) => {
    try {
        const settingsToUpdate = req.body; // Objeto com key-value pairs
        console.log('Update Settings Request:', {
            user: req.user,
            keys: Object.keys(settingsToUpdate)
        });

        if (!req.user || !req.user.id) {
            console.error('User ID missing in request');
            return res.status(401).json({ error: 'User not authenticated' });
        }

        for (const [key, value] of Object.entries(settingsToUpdate)) {
            try {
                await query(
                    `INSERT INTO system_settings (key, value)
                     VALUES ($1, $2)
                     ON CONFLICT (key) 
                     DO UPDATE SET value = $2, updated_at = NOW()`,
                    [key, value]
                );
            } catch (dbError) {
                console.error(`Database error updating key ${key}:`, dbError);
                throw dbError; // Re-throw to hit main catch block
            }
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings', details: error.message });
    }
};

// Importar grupos do WhatsApp
export const importWhatsAppGroups = async (req, res) => {
    try {
        // Buscar configurações Evolution API
        const settingsResult = await query(
            `SELECT key, value FROM system_settings 
             WHERE key IN ('evolution_api_base_url', 'evolution_api_token', 'evolution_api_instance')`
        );

        const settings = {};
        settingsResult.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        if (!settings.evolution_api_base_url || !settings.evolution_api_token || !settings.evolution_api_instance) {
            return res.status(400).json({ error: 'Evolution API not configured. Please configure Evolution API settings first.' });
        }

        const cleanBaseUrl = settings.evolution_api_base_url.replace(/\/$/, '');
        const instanceName = settings.evolution_api_instance;
        const evolutionUrl = `${cleanBaseUrl}/group/fetchAllGroups/${instanceName}?getParticipants=true`;

        // Buscar grupos da Evolution API
        console.log('🔄 Fetching groups from Evolution API:', evolutionUrl);
        const response = await fetch(evolutionUrl, {
            method: 'GET',
            headers: {
                'apikey': settings.evolution_api_token
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Evolution API error: ${response.status} ${response.statusText}`
            });
        }

        const apiResponse = await response.json();

        // Evolution API usually returns an array of groups directly or inside an object depending on version
        let groups = [];
        if (Array.isArray(apiResponse)) {
            groups = apiResponse;
        } else if (Array.isArray(apiResponse.data)) {
            groups = apiResponse.data;
        }

        if (groups.length === 0) {
            return res.json({
                message: 'No groups found in WhatsApp',
                imported: 0,
                skipped: 0
            });
        }

        // Importar grupos
        let imported = 0;
        let skipped = 0;
        const errors = [];

        console.log(`📊 Processing ${groups.length} groups from Evolution API`);

        for (const group of groups) {
            try {
                // Evolution API field mapping com fallbacks múltiplos
                const groupId = group.id || group.jid;
                const groupName = group.subject || group.name || 'Grupo sem nome';
                const groupDesc = group.desc || group.description || '';
                const groupImage = group.profilePicUrl || group.pictureUrl || group.groupMetadata?.pictureUrl || null;

                // Log detalhado para debug
                console.log('📦 Group data:', {
                    id: groupId,
                    name: groupName,
                    hasDescription: !!groupDesc,
                    hasImage: !!groupImage,
                    participantsCount: group.participants?.length || 0,
                    availableFields: Object.keys(group)
                });

                if (!groupId) {
                    console.warn('⚠️ Group without ID, skipping:', group);
                    errors.push({
                        groupName: groupName,
                        error: 'Group ID is missing'
                    });
                    continue;
                }

                // Verificar se já existe
                const existing = await query(
                    'SELECT id FROM conversations WHERE zapi_id = $1',
                    [groupId]
                );

                if (existing.rows.length > 0) {
                    skipped++;
                    continue;
                }

                // Inserir grupo
                const result = await query(
                    `INSERT INTO conversations (
                        name, description, is_group, max_members, 
                        created_by, zapi_id, photo_url
                    )
                    VALUES ($1, $2, true, 256, $3, $4, $5)
                    RETURNING id`,
                    [groupName, groupDesc, req.user.id, groupId, groupImage]
                );

                const conversationId = result.rows[0].id;

                // Importar participantes
                const participants = group.participants || [];
                let participantsImported = 0;
                for (const participant of participants) {
                    try {
                        // Mapeamento robusto de participantes
                        const phone = participant.id || participant.jid || participant.user || participant._serialized;
                        const name = participant.pushName || participant.notify || participant.name || 'Participante';
                        const isAdmin = participant.admin === 'admin' ||
                            participant.admin === 'superadmin' ||
                            participant.admin === true ||
                            participant.isAdmin === true;

                        if (!phone) {
                            console.warn('⚠️ Participant without phone, skipping');
                            continue;
                        }

                        await query(
                            `INSERT INTO participants (conversation_id, phone, display_name, role)
                             VALUES ($1, $2, $3, $4)
                             ON CONFLICT DO NOTHING`,
                            [conversationId, phone, name, isAdmin ? 'admin' : 'member']
                        );
                        participantsImported++;
                    } catch (err) {
                        console.error('❌ Error importing participant:', err.message);
                    }
                }

                console.log(`✅ Imported group "${groupName}" with ${participantsImported} participants`);
                imported++;
            } catch (error) {
                console.error('❌ Error importing group:', error);
                errors.push({
                    groupId: group.id || group.jid,
                    groupName: group.subject || group.name || 'Unknown',
                    error: error.message
                });
            }
        }

        const resultResponse = {
            message: 'Import completed',
            imported,
            skipped,
            total: groups.length
        };

        if (errors.length > 0) {
            resultResponse.errors = errors;
            console.warn(`⚠️ Import completed with ${errors.length} errors`);
        }

        console.log('✅ Import summary:', resultResponse);
        res.json(resultResponse);

    } catch (error) {
        console.error('Import WhatsApp groups error:', error);
        res.status(500).json({ error: 'Failed to import groups' });
    }
};
