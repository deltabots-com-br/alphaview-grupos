import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/index.js';
import pool from './config/database.js';
import redis from './config/redis.js';

// Import routes
import authRoutes from './routes/auth.js';
import conversationsRoutes from './routes/conversations.js';
import usersRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import messagesRoutes from './routes/messages.js';
import tagsRoutes from './routes/tags.js';
import settingsRoutes from './routes/settings.js';
import webhookRoutes from './routes/webhook.js';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: [config.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

// General Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Trust proxy (for IP addresses behind proxy)
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database
        await pool.query('SELECT 1');

        // Check Redis
        await redis.ping();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
            redis: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhook', webhookRoutes);

// Serve Frontend in Production
if (config.NODE_ENV === 'production') {
    const __dirname = path.resolve();
    // The Dockerfile copies dist to /app/server/public/dist
    const buildPath = path.join(__dirname, 'public', 'dist');

    app.use(express.static(buildPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        error: config.NODE_ENV === 'development' ? err.message : 'Internal server error',
        ...(config.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
const PORT = config.PORT;

app.listen(PORT, () => {
    console.log(`
🚀 Server running on port ${PORT}
📦 Environment: ${config.NODE_ENV}
🌐 Frontend URL: ${config.FRONTEND_URL}
    `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    await pool.end();
    await redis.quit();
    process.exit(0);
});
