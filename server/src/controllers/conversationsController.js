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
            `SELECT p.*, u.name as user_name, u.email as user_email
             FROM participants p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.conversation_id = $1
             ORDER BY p.added_at DESC`,
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
        const { phone, name, user_id } = req.body;

        if (!phone && !user_id) {
            return res.status(400).json({ error: 'Phone or user_id is required' });
        }

        const result = await query(
            `INSERT INTO participants (conversation_id, user_id, phone, display_name, is_admin)
             VALUES ($1, $2, $3, $4, false)
             RETURNING *`,
            [id, user_id || null, phone || null, name || null]
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
