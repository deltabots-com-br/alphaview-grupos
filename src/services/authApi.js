const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper para fazer requisições HTTP
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// API de Autenticação
export const authApi = {
    // Login
    async login(email, password) {
        const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        return data;
    },

    // Registro
    async register(userData) {
        const data = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        return data;
    },

    // Obter usuário atual
    async getCurrentUser(accessToken) {
        const data = await request('/auth/me', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return data;
    },

    // Refresh token
    async refreshToken(refreshToken) {
        const data = await request('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
        return data;
    },

    // Logout
    async logout(accessToken) {
        const data = await request('/auth/logout', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return data;
    },
};

export default authApi;
