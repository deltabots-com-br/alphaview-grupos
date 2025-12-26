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

        for (const [key, value] of Object.entries(settingsToUpdate)) {
            await query(
                `INSERT INTO system_settings (key, value, updated_by)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (key) 
                 DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
                [key, value, req.user.id]
            );
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// Importar grupos do WhatsApp
export const importWhatsAppGroups = async (req, res) => {
    try {
        // Buscar configurações Z-API
        const settingsResult = await query(
            `SELECT key, value FROM system_settings 
             WHERE key IN ('zapi_instance_id', 'zapi_token', 'zapi_client_token', 'zapi_server')`
        );

        const settings = {};
        settingsResult.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        if (!settings.zapi_instance_id || !settings.zapi_token || !settings.zapi_client_token) {
            return res.status(400).json({ error: 'Z-API not configured. Please configure Z-API settings first.' });
        }

        const server = settings.zapi_server || 'https://api.z-api.io';
        const zapiUrl = `${server}/instances/${settings.zapi_instance_id}/token/${settings.zapi_token}/groups`;

        // Buscar grupos da Z-API
        const response = await fetch(zapiUrl, {
            method: 'GET',
            headers: {
                'Client-Token': settings.zapi_client_token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Z-API error: ${response.status} ${response.statusText}`
            });
        }

        const apiResponse = await response.json();

        // Z-API pode retornar array ou objeto
        let groups = [];
        if (Array.isArray(apiResponse)) {
            groups = apiResponse;
        } else if (apiResponse.data) {
            groups = apiResponse.data;
        } else if (apiResponse.groups) {
            groups = apiResponse.groups;
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

        for (const group of groups) {
            try {
                const groupId = group.id || group.jid || group.groupId;
                const groupName = group.subject || group.name || 'Grupo sem nome';
                const groupDesc = group.description || group.desc || '';
                const groupImage = group.image || group.pictureUrl || null;

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
                const participants = group.participants || group.members || [];
                for (const participant of participants) {
                    try {
                        const phone = participant.phone || participant.id || participant._serialized;
                        const name = participant.name || participant.notify || 'Participante';
                        const isAdmin = participant.isAdmin || participant.admin || false;

                        await query(
                            `INSERT INTO participants (conversation_id, phone, display_name, role)
                             VALUES ($1, $2, $3, $4)
                             ON CONFLICT DO NOTHING`,
                            [conversationId, phone, name, isAdmin ? 'admin' : 'member']
                        );
                    } catch (err) {
                        // Ignorar erros de participantes
                    }
                }

                imported++;
            } catch (error) {
                console.error('Error importing group:', error);
            }
        }

        res.json({
            message: 'Import completed',
            imported,
            skipped,
            total: groups.length
        });

    } catch (error) {
        console.error('Import WhatsApp groups error:', error);
        res.status(500).json({ error: 'Failed to import groups' });
    }
};
