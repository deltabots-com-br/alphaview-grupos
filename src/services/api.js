const API_URL = import.meta.env.VITE_API_URL || '/api';

// Helper para fazer requisições autenticadas
async function request(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// API real conectada ao backend
export const api = {
    // ===== INITIAL DATA =====
    async getInitialData() {
        try {
            const token = localStorage.getItem('accessToken');

            if (!token) {
                return {
                    currentUser: null,
                    company: null,
                    groups: [],
                    chats: [],
                    metrics: { totalGroups: 0, totalMessages: 0, activeUsers: 0, responseRate: 0 }
                };
            }

            // Buscar dados em paralelo - usando request diretamente
            const [user, conversations, metrics, settings] = await Promise.all([
                request('/auth/me').catch(() => null),
                request('/conversations').catch(() => []),
                request('/dashboard/metrics').catch(() => ({
                    totalGroups: 0, totalMessages: 0, activeUsers: 0, responseRate: 0
                })),
                request('/settings').catch(() => ({}))
            ]);

            // Processar conversas para formato compatível
            const groups = conversations.map(conv => ({
                id: conv.id,
                name: conv.name,
                description: conv.description || '',
                members: parseInt(conv.member_count) || 0,
                maxMembers: conv.max_members || 256,
                status: 'active',
                lastActivity: conv.last_message_at ? new Date(conv.last_message_at).toLocaleString('pt-BR') : '',
                image: conv.name.substring(0, 2).toUpperCase(),
                tags: [],
                membersList: []
            }));

            return {
                currentUser: user,
                company: {
                    name: settings.company_name || '',
                    plan: settings.company_plan || ''
                },
                groups,
                chats: groups, // Por enquanto, chats é igual a groups
                metrics: {
                    totalGroups: metrics.totalGroups || 0,
                    totalMessages: metrics.totalMessages || 0,
                    activeUsers: metrics.activeUsers || 0,
                    responseRate: metrics.responseRate || 0
                }
            };
        } catch (error) {
            console.error('getInitialData error:', error);
            return {
                currentUser: null,
                company: null,
                groups: [],
                chats: [],
                metrics: { totalGroups: 0, totalMessages: 0, activeUsers: 0, responseRate: 0 }
            };
        }
    },

    // ===== USERS =====
    getUsers: () => request('/users'),

    createUser: (userData) => request('/users', {
        method: 'POST',
        body: userData
    }),

    updateUser: (id, userData) => request(`/users/${id}`, {
        method: 'PUT',
        body: userData
    }),

    deleteUser: (id) => request(`/users/${id}`, {
        method: 'DELETE'
    }),

    // ===== CONVERSATIONS/GROUPS =====
    getConversations: () => request('/conversations'),

    getConversation: (id) => request(`/conversations/${id}`),

    createGroup: async (name, description = '', participants = []) => {
        return request('/conversations/create-whatsapp-group', {
            method: 'POST',
            body: {
                name,
                description,
                participants
            }
        });
    },

    updateConversation: (id, data) => request(`/conversations/${id}`, {
        method: 'PUT',
        body: data
    }),

    deleteConversation: (id) => request(`/conversations/${id}`, {
        method: 'DELETE'
    }),

    // ===== MEMBERS =====
    getGroupMembers: (groupId) => request(`/conversations/${groupId}/members`),

    addMemberToGroup: (groupId, memberData) => request(`/conversations/${groupId}/members`, {
        method: 'POST',
        body: {
            phone: memberData.phone,
            name: memberData.name,
            user_id: memberData.user_id || null
        }
    }),

    removeMemberFromGroup: (groupId, memberId) => request(`/conversations/${groupId}/members/${memberId}`, {
        method: 'DELETE'
    }),

    // ===== MESSAGES =====
    getMessages: (conversationId, limit = 50, offset = 0) =>
        request(`/messages/${conversationId}/messages?limit=${limit}&offset=${offset}`),

    sendMessage: async (chatId, content, type = 'text') => {
        return request(`/messages/${chatId}/messages`, {
            method: 'POST',
            body: {
                content,
                message_type: type
            }
        });
    },

    // ===== TAGS =====
    getTags: () => request('/tags'),

    createTag: (tagData) => request('/tags', {
        method: 'POST',
        body: tagData
    }),

    updateTag: (id, tagData) => request(`/tags/${id}`, {
        method: 'PUT',
        body: tagData
    }),

    deleteTag: (id) => request(`/tags/${id}`, {
        method: 'DELETE'
    }),

    addTagToConversation: (conversationId, tagId) => request(`/tags/conversations/${conversationId}/tags/${tagId}`, {
        method: 'POST'
    }),

    removeTagFromConversation: (conversationId, tagId) => request(`/tags/conversations/${conversationId}/tags/${tagId}`, {
        method: 'DELETE'
    }),

    // ===== DASHBOARD =====
    getDashboardMetrics: () => request('/dashboard/metrics'),

    // ===== SETTINGS =====
    getSettings: () => request('/settings'),

    updateSettings: (settings) => request('/settings', {
        method: 'PUT',
        body: settings
    }),

    importWhatsAppGroups: () => request('/settings/import-whatsapp-groups', {
        method: 'POST'
    }),

    importGroupMessages: (groupId, limit = 100) => request(`/settings/import-messages/${groupId}`, {
        method: 'POST',
        body: { limit }
    }),

    generateWebhookToken: () => request('/webhook/generate-token', {
        method: 'POST'
    })
};

export default api;
