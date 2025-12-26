import { query } from '../config/database.js';

// Listar todas as tags
export const listTags = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM tags ORDER BY name ASC'
        );

        res.json(result.rows);
    } catch (error) {
        console.error('List tags error:', error);
        res.status(500).json({ error: 'Failed to list tags' });
    }
};

// Criar nova tag
export const createTag = async (req, res) => {
    try {
        const { name, color = '#3b82f6' } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Verificar se tag com mesmo nome já existe
        const existing = await query(
            'SELECT id FROM tags WHERE LOWER(name) = LOWER($1)',
            [name]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Tag with this name already exists' });
        }

        const result = await query(
            'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *',
            [name, color]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create tag error:', error);
        res.status(500).json({ error: 'Failed to create tag' });
    }
};

// Atualizar tag
export const updateTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color } = req.body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (color !== undefined) {
            updates.push(`color = $${paramCount++}`);
            values.push(color);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);

        const result = await query(
            `UPDATE tags SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update tag error:', error);
        res.status(500).json({ error: 'Failed to update tag' });
    }
};

// Deletar tag
export const deleteTag = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM tags WHERE id = $1 RETURNING id, name',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        res.json({ message: 'Tag deleted successfully', tag: result.rows[0] });
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
};

// Adicionar tag a uma conversa
export const addTagToConversation = async (req, res) => {
    try {
        const { conversationId, tagId } = req.params;

        // Verificar se tag existe
        const tagCheck = await query('SELECT id FROM tags WHERE id = $1', [tagId]);
        if (tagCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        // Verificar se conversa existe
        const convCheck = await query('SELECT id FROM conversations WHERE id = $1', [conversationId]);
        if (convCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Verificar se relação já existe
        const existing = await query(
            'SELECT * FROM conversation_tags WHERE conversation_id = $1 AND tag_id = $2',
            [conversationId, tagId]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Tag already added to this conversation' });
        }

        const result = await query(
            'INSERT INTO conversation_tags (conversation_id, tag_id) VALUES ($1, $2) RETURNING *',
            [conversationId, tagId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add tag to conversation error:', error);
        res.status(500).json({ error: 'Failed to add tag to conversation' });
    }
};

// Remover tag de uma conversa
export const removeTagFromConversation = async (req, res) => {
    try {
        const { conversationId, tagId } = req.params;

        const result = await query(
            'DELETE FROM conversation_tags WHERE conversation_id = $1 AND tag_id = $2 RETURNING *',
            [conversationId, tagId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found in this conversation' });
        }

        res.json({ message: 'Tag removed from conversation successfully' });
    } catch (error) {
        console.error('Remove tag from conversation error:', error);
        res.status(500).json({ error: 'Failed to remove tag from conversation' });
    }
};
