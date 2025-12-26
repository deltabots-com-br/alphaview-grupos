import React, { createContext, useContext, useState, useEffect } from 'react';
import authApi from '../services/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar se há sessão armazenada
        const checkSession = async () => {
            const storedUser = localStorage.getItem('user');
            const accessToken = localStorage.getItem('accessToken');

            if (storedUser && accessToken) {
                try {
                    // Validar token obtendo usuário atual
                    const userData = await authApi.getCurrentUser(accessToken);
                    setUser(userData);
                } catch (error) {
                    // Token inválido ou expirado
                    console.error('Sessão expirada:', error);
                    localStorage.removeItem('user');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                }
            }
            setLoading(false);
        };

        checkSession();
    }, []);

    const login = async (email, password) => {
        setLoading(true);

        try {
            const response = await authApi.login(email, password);

            // Armazenar dados do usuário e tokens
            setUser(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);

            setLoading(false);
            return { success: true };
        } catch (error) {
            setLoading(false);
            return {
                success: false,
                message: error.message || 'Erro ao fazer login'
            };
        }
    };

    const logout = async () => {
        const accessToken = localStorage.getItem('accessToken');

        try {
            if (accessToken) {
                await authApi.logout(accessToken);
            }
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        } finally {
            // Limpar estado e localStorage
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
