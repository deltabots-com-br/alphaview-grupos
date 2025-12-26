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

                // Importar participantes usando BATCH INSERT
                const participants = group.participants || [];
                let participantsImported = 0;

                if (participants.length > 0) {
                    try {
                        // Preparar dados válidos de participantes
                        const validParticipants = [];
                        for (const participant of participants) {
                            const phone = participant.id || participant.jid || participant.user || participant._serialized;
                            const name = participant.pushName || participant.notify || participant.name || 'Participante';
                            const isAdmin = participant.admin === 'admin' ||
                                participant.admin === 'superadmin' ||
                                participant.admin === 'true' ||
                                participant.isAdmin === true;

                            if (phone) {
                                validParticipants.push({
                                    phone,
                                    name,
                                    isAdmin // ← BOOLEAN, não string
                                });
                            }
                        }

                        // Batch insert de todos os participantes de uma vez
                        if (validParticipants.length > 0) {
                            const values = validParticipants.map((p, index) => {
                                const offset = index * 3;
                                return `($1, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
                            }).join(', ');

                            const params = [conversationId];
                            validParticipants.forEach(p => {
                                params.push(p.phone, p.name, p.isAdmin); // ← is_admin é BOOLEAN
                            });

                            await query(
                                `INSERT INTO participants (conversation_id, phone, name, is_admin)
                                 VALUES ${values}
                                 ON CONFLICT DO NOTHING`,
                                params
                            );
                            participantsImported = validParticipants.length;
                        }
                    } catch (err) {
                        console.error('❌ Error importing participants:', err.message);
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

// Importar mensagens de um grupo específico
export const importGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 100 } = req.body;

        // Buscar grupo e seu zapi_id
        const groupResult = await query(
            'SELECT id, zapi_id, name FROM conversations WHERE id = $1 AND is_group = true',
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const group = groupResult.rows[0];
        if (!group.zapi_id) {
            return res.status(400).json({ error: 'Group does not have WhatsApp ID (zapi_id)' });
        }

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
            return res.status(400).json({ error: 'Evolution API not configured' });
        }

        const cleanBaseUrl = settings.evolution_api_base_url.replace(/\/$/, '');
        const instanceName = settings.evolution_api_instance;
        const evolutionUrl = `${cleanBaseUrl}/chat/findMessages/${instanceName}`;

        console.log(`🔄 Importing messages for group: ${group.name}`);

        // Chamar Evolution API para buscar mensagens
        const response = await fetch(evolutionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': settings.evolution_api_token
            },
            body: JSON.stringify({
                where: {
                    key: {
                        remoteJid: group.zapi_id
                    }
                },
                limit: parseInt(limit)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Evolution API error:', errorText);
            return res.status(response.status).json({
                error: 'Failed to fetch messages from Evolution API',
                details: errorText
            });
        }

        const messages = await response.json();
        console.log(`📨 Received ${messages.length} messages from Evolution API`);

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.json({
                message: 'No messages found for this group',
                imported: 0,
                group: group.name
            });
        }

        // Mapear e inserir mensagens
        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (const msg of messages) {
            try {
                // Extrair dados da mensagem
                const messageId = msg.key?.id;
                const fromMe = msg.key?.fromMe || false;
                const participant = msg.key?.participant || msg.participant;
                const timestamp = msg.messageTimestamp;

                // Extrair conteúdo da mensagem
                let content = null;
                let messageType = 'text';

                if (msg.message) {
                    if (msg.message.conversation) {
                        content = msg.message.conversation;
                    } else if (msg.message.extendedTextMessage?.text) {
                        content = msg.message.extendedTextMessage.text;
                    } else if (msg.message.imageMessage) {
                        messageType = 'image';
                        content = msg.message.imageMessage.caption || '[Imagem]';
                    } else if (msg.message.videoMessage) {
                        messageType = 'video';
                        content = msg.message.videoMessage.caption || '[Vídeo]';
                    } else if (msg.message.audioMessage) {
                        messageType = 'audio';
                        content = '[Áudio]';
                    } else if (msg.message.documentMessage) {
                        messageType = 'document';
                        content = msg.message.documentMessage.fileName || '[Documento]';
                    }
                }

                if (!content) {
                    content = '[Mensagem não suportada]';
                }

                // Determinar remetente
                const senderType = fromMe ? 'user' : 'contact';
                const senderPhone = participant ? participant.replace('@s.whatsapp.net', '') : null;
                const senderName = msg.pushName || 'Desconhecido';

                // Converter timestamp para data
                const createdAt = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();

                // Inserir mensagem
                await query(
                    `INSERT INTO messages (
                        conversation_id, sender_type, sender_phone, sender_name,
                        content, message_type, status, zapi_message_id, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (zapi_message_id) DO NOTHING`,
                    [
                        groupId,
                        senderType,
                        senderPhone,
                        senderName,
                        content,
                        messageType,
                        'sent',
                        messageId,
                        createdAt
                    ]
                );

                imported++;
            } catch (err) {
                skipped++;
                errors.push({
                    messageId: msg.key?.id,
                    error: err.message
                });
                console.error('Error importing message:', err.message);
            }
        }

        console.log(`✅ Imported ${imported} messages for group "${group.name}"`);

        res.json({
            message: 'Messages import completed',
            group: group.name,
            total: messages.length,
            imported,
            skipped,
            errors: errors.length > 0 ? errors.slice(0, 5) : []
        });

    } catch (error) {
        console.error('❌ Import messages error:', error);
        res.status(500).json({
            error: 'Failed to import messages',
            details: error.message
        });
    }
};

