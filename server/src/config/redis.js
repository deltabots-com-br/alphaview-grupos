import Redis from 'ioredis';
import { config } from './index.js';

// Create Redis client
// Create Redis client
// 1. Try to use REDIS_URL
let redisConfig = config.REDIS_URL;

// Helper to check if a string is effectively "default" or invalid
const isInvalidRedisUrl = (url) => {
    if (!url) return true;
    if (typeof url !== 'string') return false;
    const cleanUrl = url.trim();
    if (cleanUrl === 'default') return true;
    if (cleanUrl === 'redis://default') return true;
    if (cleanUrl.includes('@default')) return true; // redis://user:pass@default...
    try {
        const urlObj = new URL(cleanUrl);
        if (urlObj.hostname === 'default') return true;
    } catch (e) {
        // Not a valid URL, might be just a host string
        if (cleanUrl === 'default') return true;
    }
    return false;
};

// 2. If valid REDIS_URL is NOT present, check for discrete variables or fallback
if (isInvalidRedisUrl(redisConfig)) {
    if (config.REDIS_HOST && config.REDIS_HOST !== 'default') {
        console.log(`🔌 Configuring Redis via discrete variables (Host: ${config.REDIS_HOST})`);
        redisConfig = {
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
            username: config.REDIS_USERNAME,
            password: config.REDIS_PASSWORD,
        };
    } else {
        console.warn(`⚠️ REDIS_URL invalid and REDIS_HOST missing. Falling back to localhost:6379`);
        redisConfig = {
            host: 'localhost',
            port: 6379,
        };
    }
} else {
    // Basic obscuring for logs
    const logUrl = typeof redisConfig === 'string'
        ? redisConfig.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
        : JSON.stringify(redisConfig);
    console.log(`🔌 Attempting to connect to Redis using config: ${logUrl}`);
}

export const redis = new Redis(redisConfig, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 0, // Force IPv4 or auto-detect, helps with ECONNREFUSED ::1 issues
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redis.on('connect', () => {
    console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

// Redis helper functions
export const cacheGet = async (key) => {
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Redis GET error:', error);
        return null;
    }
};

export const cacheSet = async (key, value, expirationSeconds = 3600) => {
    try {
        await redis.setex(key, expirationSeconds, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Redis SET error:', error);
        return false;
    }
};

export const cacheDel = async (key) => {
    try {
        await redis.del(key);
        return true;
    } catch (error) {
        console.error('Redis DEL error:', error);
        return false;
    }
};

export default redis;
