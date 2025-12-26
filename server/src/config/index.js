import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Server
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),

    // Database
    DATABASE_URL: process.env.DATABASE_URL,

    // Redis
    REDIS_URL: process.env.REDIS_URL,

    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // Z-API
    ZAPI_BASE_URL: process.env.ZAPI_BASE_URL || 'https://api.z-api.io',
    ZAPI_INSTANCE_ID: process.env.ZAPI_INSTANCE_ID,
    ZAPI_TOKEN: process.env.ZAPI_TOKEN,

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
    'ZAPI_INSTANCE_ID',
    'ZAPI_TOKEN',
    'WEBHOOK_SECRET'
];

if (config.NODE_ENV === 'production') {
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }
}
