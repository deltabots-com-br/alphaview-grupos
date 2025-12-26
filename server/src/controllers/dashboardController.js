import { query } from '../config/database.js';

// Obter métricas do dashboard
export const getDashboardMetrics = async (req, res) => {
    try {
        // Total de grupos
        const groupsResult = await query(
            'SELECT COUNT(*) as total FROM conversations WHERE is_group = true'
        );
        const totalGroups = parseInt(groupsResult.rows[0].total);

        // Total de mensagens
        const messagesResult = await query(
            'SELECT COUNT(*) as total FROM messages'
        );
        const totalMessages = parseInt(messagesResult.rows[0].total);

        // Total de usuários ativos
        const usersResult = await query(
            "SELECT COUNT(*) as total FROM users WHERE status = 'active'"
        );
        const activeUsers = parseInt(usersResult.rows[0].total);

        // Média de membros por grupo
        const avgMembersResult = await query(
            `SELECT AVG(member_count) as avg
             FROM (
                 SELECT COUNT(p.id) as member_count
                 FROM conversations c
                 LEFT JOIN participants p ON c.id = p.conversation_id
                 WHERE c.is_group = true
                 GROUP BY c.id
             ) AS counts`
        );
        const avgMembersPerGroup = parseFloat(avgMembersResult.rows[0].avg || 0);

        // Taxa de resposta - Grupos com mensagens nas últimas 24h
        const responseRateResult = await query(
            `SELECT 
                COUNT(DISTINCT CASE WHEN m.created_at >= NOW() - INTERVAL '24 hours' THEN c.id END) as active_groups_24h,
                COUNT(DISTINCT c.id) as total_groups
             FROM conversations c
             LEFT JOIN messages m ON c.id = m.conversation_id AND m.sender_type != 'system'
             WHERE c.is_group = true`
        );

        const activeGroups24h = parseInt(responseRateResult.rows[0].active_groups_24h || 0);
        const totalGroupsForRate = parseInt(responseRateResult.rows[0].total_groups || 0);
        const responseRate = totalGroupsForRate > 0
            ? Math.round((activeGroups24h / totalGroupsForRate) * 100)
            : 0;

        // Mensagens por dia (últimos 7 dias)
        const messagesPerDayResult = await query(
            `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM messages
             WHERE created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        // Grupos mais ativos (top 5 por última atividade)
        const activeGroupsResult = await query(
            `SELECT c.id, c.name, c.last_message_at, COUNT(m.id) as message_count
             FROM conversations c
             LEFT JOIN messages m ON c.id = m.conversation_id
             WHERE c.is_group = true
             GROUP BY c.id, c.name, c.last_message_at
             ORDER BY c.last_message_at DESC NULLS LAST
             LIMIT 5`
        );

        res.json({
            totalGroups,
            totalMessages,
            activeUsers,
            avgMembersPerGroup: Math.round(avgMembersPerGroup * 10) / 10,
            responseRate,
            messagesPerDay: messagesPerDayResult.rows,
            activeGroups: activeGroupsResult.rows
        });
    } catch (error) {
        console.error('Get dashboard metrics error:', error);
        res.status(500).json({ error: 'Failed to get dashboard metrics' });
    }
};
