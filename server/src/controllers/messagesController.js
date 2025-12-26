import { query } from '../config/database.js';

// Listar mensagens de uma conversa
export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const result = await query(
            `SELECT m.*, u.name as sender_user_name
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at DESC
             LIMIT $2 OFFSET $3`,
            [conversationId, limit, offset]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
};

// Enviar mensagem
export const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content, message_type = 'text', media_url, media_type } = req.body;
        const senderId = req.user.id;

        if (!content && !media_url) {
            return res.status(400).json({ error: 'Content or media_url is required' });
        }

        // Verificar se conversa existe
        const conversationCheck = await query(
            'SELECT id FROM conversations WHERE id = $1',
            [conversationId]
        );

        if (conversationCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const result = await query(
            `INSERT INTO messages (conversation_id, sender_type, sender_id, content, media_url, media_type, message_type, status)
             VALUES ($1, 'user', $2, $3, $4, $5, $6, 'sent')
             RETURNING *`,
            [conversationId, senderId, content || null, media_url || null, media_type || null, message_type]
        );

        // Atualizar last_message_at da conversa
        await query(
            'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
            [conversationId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};
