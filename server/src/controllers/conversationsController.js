import { query, transaction } from '../config/database.js';

// Listar todas as conversas/grupos
export const listConversations = async (req, res) => {
    try {
        const result = await query(
            `SELECT c.*, COUNT(p.id) as member_count
             FROM conversations c
             LEFT JOIN participants p ON c.id = p.conversation_id
             WHERE c.is_group = true
             GROUP BY c.id
             ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('List conversations error:', error);
        res.status(500).json({ error: 'Failed to list conversations' });
    }
};

// Obter uma conversa específica
export const getConversation = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT c.*, COUNT(p.id) as member_count
             FROM conversations c
             LEFT JOIN participants p ON c.id = p.conversation_id
             WHERE c.id = $1
             GROUP BY c.id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Failed to get conversation' });
    }
};

// Criar nova conversa/grupo
export const createConversation = async (req, res) => {
    try {
        const { name, description, max_members = 256, zapi_id } = req.body;
        const createdBy = req.user.id;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = await query(
            `INSERT INTO conversations (name, description, is_group, max_members, created_by, zapi_id)
             VALUES ($1, $2, true, $3, $4, $5)
             RETURNING *`,
            [name, description || null, max_members, createdBy, zapi_id || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
};

// Atualizar conversa/grupo
export const updateConversation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, max_members, photo_url, zapi_id } = req.body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (max_members !== undefined) {
            updates.push(`max_members = $${paramCount++}`);
            values.push(max_members);
        }
        if (photo_url !== undefined) {
            updates.push(`photo_url = $${paramCount++}`);
            values.push(photo_url);
        }
        if (zapi_id !== undefined) {
            updates.push(`zapi_id = $${paramCount++}`);
            values.push(zapi_id);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);

        const result = await query(
            `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ error: 'Failed to update conversation' });
    }
};

// Deletar conversa/grupo
export const deleteConversation = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM conversations WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({ message: 'Conversation deleted successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
};

// Obter membros de uma conversa
export const getConversationMembers = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT id, conversation_id, phone, name, is_admin, notes, added_at
             FROM participants
             WHERE conversation_id = $1
             ORDER BY added_at DESC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get conversation members error:', error);
        res.status(500).json({ error: 'Failed to get conversation members' });
    }
};

// Adicionar membro a uma conversa
export const addMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone, name } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone is required' });
        }

        const result = await query(
            `INSERT INTO participants (conversation_id, phone, name, is_admin)
             VALUES ($1, $2, $3, false)
             RETURNING *`,
            [id, phone, name || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
};

// Remover membro de uma conversa
export const removeMember = async (req, res) => {
    try {
        const { id, memberId } = req.params;

        const result = await query(
            'DELETE FROM participants WHERE id = $1 AND conversation_id = $2 RETURNING id',
            [memberId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found in this conversation' });
        }

        res.json({ message: 'Member removed successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
};

// Criar grupo via Evolution API
export const createGroupViaEvolution = async (req, res) => {
    try {
        const { name, description, participants } = req.body;
        const createdBy = req.user.id;

        // Validações básicas
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ error: 'At least one participant is required to create a WhatsApp group' });
        }

        // Validar formato dos telefones
        const invalidPhones = participants.filter(phone => !/^\d+$/.test(phone));
        if (invalidPhones.length > 0) {
            return res.status(400).json({
                error: 'Invalid phone numbers. Use only digits (e.g., 5531900000000)',
                invalidPhones
            });
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
            return res.status(400).json({
                error: 'Evolution API not configured. Please configure Evolution API settings first.'
            });
        }

        // Preparar chamada à Evolution API
        const cleanBaseUrl = settings.evolution_api_base_url.replace(/\/$/, '');
        const instanceName = settings.evolution_api_instance;
        const evolutionUrl = `${cleanBaseUrl}/group/create/${instanceName}`;

        console.log('🔄 Creating group via Evolution API:', evolutionUrl);
        console.log('📋 Group data:', { subject: name, description, participants: participants.length });

        // Chamar Evolution API
        const response = await fetch(evolutionUrl, {
            method: 'POST',
            headers: {
                'apikey': settings.evolution_api_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: name,
                description: description || '',
                participants: participants
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Evolution API error:', response.status, errorText);
            return res.status(response.status).json({
                error: 'Failed to create group in WhatsApp',
                details: errorText
            });
        }

        const evolutionGroup = await response.json();
        console.log('✅ Group created in WhatsApp:', evolutionGroup.id || evolutionGroup.groupId);

        // Extrair ID do grupo retornado pela Evolution
        const whatsappGroupId = evolutionGroup.id || evolutionGroup.groupId || null;

        // Salvar grupo no banco de dados local
        const dbResult = await query(
            `INSERT INTO conversations (name, description, is_group, max_members, created_by, zapi_id)
             VALUES ($1, $2, true, 256, $3, $4)
             RETURNING *`,
            [name, description || null, createdBy, whatsappGroupId]
        );

        const localGroup = dbResult.rows[0];

        // Salvar participantes no banco
        if (participants.length > 0) {
            const participantValues = participants.map((phone, index) =>
                `($1, $${index + 2}, false)`
            ).join(', ');

            await query(
                `INSERT INTO participants (conversation_id, phone, is_admin)
                 VALUES ${participantValues}`,
                [localGroup.id, ...participants]
            );
        }

        console.log('✅ Group saved to database:', localGroup.id);

        res.status(201).json({
            ...localGroup,
            whatsappGroupId,
            participantsCount: participants.length,
            message: 'Group created successfully in WhatsApp and synced to database'
        });

    } catch (error) {
        console.error('❌ Create group via Evolution error:', error);
        res.status(500).json({
            error: 'Failed to create group',
            details: error.message
        });
    }
};
