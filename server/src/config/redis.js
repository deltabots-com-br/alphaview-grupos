import Redis from 'ioredis';
import { config } from './index.js';

// Create Redis client
// Create Redis client
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

if (isInvalidRedisUrl(redisConfig)) {
    console.warn(`⚠️ REDIS_URL is invalid or set to "default" (Value: ${redisConfig}). Falling back to localhost:6379`);
    redisConfig = {
        host: 'localhost',
        port: 6379,
    };
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
