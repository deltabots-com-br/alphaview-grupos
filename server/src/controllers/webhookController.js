import { query } from '../config/database.js';
import crypto from 'crypto';

// Webhook para receber eventos da Z-API
// Webhook para receber eventos da Evolution API
export const handleEvolutionWebhook = async (req, res) => {
    try {
        // Validar token do webhook
        // Evolution API might send it in 'apikey' header or we configure a custom header
        const providedToken = req.headers['x-webhook-token'] || req.headers['webhook-token'] || req.headers['apikey'];

        // Buscar token configurado
        const settingsResult = await query(
            "SELECT value FROM system_settings WHERE key = 'webhook_token'"
        );

        if (settingsResult.rows.length === 0 || !settingsResult.rows[0].value) {
            // Se não tiver token configurado, pode ser inseguro, mas vamos aceitar se for dev ou logar aviso
            console.warn('Webhook received but no local webhook_token service configured.');
        } else {
            const configuredToken = settingsResult.rows[0].value;
            if (providedToken !== configuredToken) {
                console.error('Invalid webhook token provided');
                return res.status(401).json({ error: 'Invalid webhook token' });
            }
        }

        // Processar evento
        const event = req.body;
        console.log('📨 Webhook Evolution recebido:', JSON.stringify(event, null, 2));

        // Estrutura Evolution API:
        // event.event -> tipo do evento (ex: 'messages.upsert')
        // event.data -> dados

        // Logar tipo
        if (event.event) {
            console.log(`Evento tipo: ${event.event}`);
        }

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
