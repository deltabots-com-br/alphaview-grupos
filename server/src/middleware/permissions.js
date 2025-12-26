import { verifyAccessToken } from '../utils/jwt.js';

// Middleware para autenticar requisições
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove "Bearer "
        const decoded = verifyAccessToken(token);

        // Adiciona informações do usuário na requisição
        req.user = {
            id: decoded.userId,
            role: decoded.role
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware para verificar se usuário é admin
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

// Middleware para verificar se usuário pode acessar recurso
// Por enquanto, permite que todos usuários autenticados acessem
export const canAccessResource = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Futuramente: verificar se user é dono do recurso ou tem permissão
    next();
};
