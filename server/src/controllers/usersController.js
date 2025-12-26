import argon2 from 'argon2';
import { query } from '../config/database.js';

// Listar todos os usuários (apenas admin)
export const listUsers = async (req, res) => {
    try {
        const result = await query(
            `SELECT id, name, email, role, department, status, avatar_url, last_login_at, created_at, updated_at
             FROM users
             ORDER BY created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
};

// Obter um usuário específico
export const getUser = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT id, name, email, role, department, status, avatar_url, last_login_at, created_at, updated_at
             FROM users
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};

// Criar novo usuário (apenas admin)
export const createUser = async (req, res) => {
    try {
        const { name, email, password, role = 'user', department } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        // Verificar se email já existe
        const existing = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash da senha
        const passwordHash = await argon2.hash(password);

        const result = await query(
            `INSERT INTO users (name, email, password_hash, role, department, status)
             VALUES ($1, $2, $3, $4, $5, 'active')
             RETURNING id, name, email, role, department, status, created_at`,
            [name, email, passwordHash, role, department || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Atualizar usuário (apenas admin)
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, role, department, status, avatar_url } = req.body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (email !== undefined) {
            // Verificar se novo email já existe
            const existing = await query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, id]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use' });
            }
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (password !== undefined) {
            const passwordHash = await argon2.hash(password);
            updates.push(`password_hash = $${paramCount++}`);
            values.push(passwordHash);
        }
        if (role !== undefined) {
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }
        if (department !== undefined) {
            updates.push(`department = $${paramCount++}`);
            values.push(department);
        }
        if (status !== undefined) {
            updates.push(`status = $${paramCount++}`);
            values.push(status);
        }
        if (avatar_url !== undefined) {
            updates.push(`avatar_url = $${paramCount++}`);
            values.push(avatar_url);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);

        const result = await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
             RETURNING id, name, email, role, department, status, avatar_url, created_at, updated_at`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// Deletar usuário (apenas admin)
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Não permitir deletar o próprio usuário
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = await query(
            'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully', user: result.rows[0] });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
