import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Server
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),

    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    DB_HOST: process.env.POSTGRES_HOST || process.env.DB_HOST,
    DB_PORT: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432', 10),
    DB_USER: process.env.POSTGRES_USER || process.env.DB_USER,
    DB_PASSWORD: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    DB_NAME: process.env.POSTGRES_DB || process.env.DB_NAME,
    DB_SSL: process.env.DB_SSL === 'true',

    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // Evolution API
    EVOLUTION_API_BASE_URL: process.env.EVOLUTION_API_BASE_URL || 'https://api.evolution.com',
    EVOLUTION_API_TOKEN: process.env.EVOLUTION_API_TOKEN, // Global API Key
    EVOLUTION_API_INSTANCE: process.env.EVOLUTION_API_INSTANCE,

    // Webhook
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,

    // Upload
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),

    // CORS
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};

// Validate required config
const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'WEBHOOK_SECRET'
    // Verification of Evolution API vars can be optional if handled dynamically via settings DB
];

if (config.NODE_ENV === 'production') {
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }
}
