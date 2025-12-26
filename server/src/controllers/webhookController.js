import { query } from '../config/database.js';
import crypto from 'crypto';

// Webhook para receber eventos da Z-API
export const handleZapiWebhook = async (req, res) => {
    try {
        // Validar token do webhook
        const providedToken = req.headers['x-webhook-token'] || req.headers['webhook-token'];

        // Buscar token configurado
        const settingsResult = await query(
            "SELECT value FROM system_settings WHERE key = 'webhook_token'"
        );

        if (settingsResult.rows.length === 0 || !settingsResult.rows[0].value) {
            return res.status(401).json({ error: 'Webhook not configured' });
        }

        const configuredToken = settingsResult.rows[0].value;

        if (providedToken !== configuredToken) {
            console.error('Invalid webhook token provided');
            return res.status(401).json({ error: 'Invalid webhook token' });
        }

        // Processar evento
        const event = req.body;
        console.log('📨 Webhook recebido:', JSON.stringify(event, null, 2));

        // Aqui você pode processar diferentes tipos de eventos:
        // - Mensagens recebidas
        // - Status de mensagens
        // - Novos participantes em grupos
        // - etc.

        // Por enquanto, apenas logar
        res.json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

// Gerar novo token de webhook
export const generateWebhookToken = async (req, res) => {
    try {
        // Gerar token seguro
        const newToken = crypto.randomBytes(32).toString('hex');

        // Salvar no banco
        await query(
            `INSERT INTO system_settings (key, value)
             VALUES ('webhook_token', $1)
             ON CONFLICT (key) 
             DO UPDATE SET value = $1, updated_at = NOW()`,
            [newToken]
        );

        res.json({ token: newToken });

    } catch (error) {
        console.error('Generate webhook token error:', error);
        res.status(500).json({ error: 'Failed to generate webhook token' });
    }
};
