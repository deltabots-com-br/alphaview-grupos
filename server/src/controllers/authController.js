import argon2 from 'argon2';
import { query, transaction } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import crypto from 'crypto';

// Register new user
export const register = async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await argon2.hash(password);

        // Insert user
        const result = await query(
            `INSERT INTO users (name, email, password_hash, department, role, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, email, role, department, status, created_at`,
            [name, email, passwordHash, department || null, 'user', 'active']
        );

        const user = result.rows[0];

        // Generate tokens
        const accessToken = generateAccessToken({ userId: user.id, role: user.role });
        const refreshToken = generateRefreshToken({ userId: user.id });

        // Store refresh token hash in database
        const refreshTokenHash = await argon2.hash(refreshToken);
        await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, refreshTokenHash, req.ip, req.get('user-agent')]
        );

        res.status(201).json({
            user,
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// Login
export const login = async (req, res) => {
    console.log('Login attempt for:', req.body.email);
    try {
        const { email, password } = req.body;

        // Get user
        console.log('Fetching user from DB...');
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        console.log('User fetch result:', result.rows.length > 0 ? 'Found' : 'Not found');

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        // Verify password
        console.log('Verifying password...');
        const isValidPassword = await argon2.verify(user.password_hash, password);
        console.log('Password valid:', isValidPassword);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await query(
            'UPDATE users SET last_login_at = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate tokens
        console.log('Generating tokens...');
        const accessToken = generateAccessToken({ userId: user.id, role: user.role });
        const refreshToken = generateRefreshToken({ userId: user.id });

        // Store refresh token
        console.log('Hashing refresh token...');
        const refreshTokenHash = await argon2.hash(refreshToken);

        console.log('Storing refresh token...');
        await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, refreshTokenHash, req.ip, req.get('user-agent')]
        );

        // Remove sensitive data
        delete user.password_hash;

        console.log('Login successful');
        res.json({
            user,
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Login Critical Error Details:', error);
        console.error('Error Stack:', error.stack);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
};

// Refresh token
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);

        // Check if refresh token exists and is not revoked
        const tokenHash = await argon2.hash(refreshToken);
        const result = await query(
            `SELECT * FROM refresh_tokens 
             WHERE user_id = $1 AND expires_at > NOW() AND revoked = false
             LIMIT 1`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Get user
        const userResult = await query(
            'SELECT id, email, name, role, status FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        const user = userResult.rows[0];

        // Generate new tokens
        const newAccessToken = generateAccessToken({ userId: user.id, role: user.role });
        const newRefreshToken = generateRefreshToken({ userId: user.id });

        // Revoke old refresh token (Token Rotation)
        await query(
            'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
            [user.id]
        );

        // Store new refresh token
        const newRefreshTokenHash = await argon2.hash(newRefreshToken);
        await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, newRefreshTokenHash, req.ip, req.get('user-agent')]
        );

        res.json({
            user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
};

// Logout
export const logout = async (req, res) => {
    try {
        const userId = req.user.id;

        // Revoke all refresh tokens for this user
        await query(
            'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
            [userId]
        );

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
};

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        const result = await query(
            'SELECT id, name, email, role, department, status, avatar_url, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};
