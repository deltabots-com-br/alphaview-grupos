import Redis from 'ioredis';
import { config } from './index.js';

// Create Redis client
// Create Redis client
const redisConfig = config.REDIS_URL || {
    host: 'localhost',
    port: 6379,
};

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
