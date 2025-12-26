import { query } from '../config/database.js';
import crypto from 'crypto';

// Handlers para diferentes tipos de eventos
const handleNewMessage = async (eventData) => {
    try {
        console.log('💬 Processing new message:', {
            from: eventData.key?.remoteJid,
            fromMe: eventData.key?.fromMe,
            messageType: Object.keys(eventData.message || {})[0],
            timestamp: eventData.messageTimestamp
        });

        // TODO: Implementar lógica de armazenamento de mensagem
        // Exemplo: Salvar mensagem no banco de dados
        // await query('INSERT INTO messages ...', [...]);

    } catch (error) {
        console.error('❌ Error handling new message:', error);
    }
};

const handleMessageUpdate = async (eventData) => {
    try {
        console.log('🔄 Processing message update:', {
            messageId: eventData.key?.id,
            status: eventData.update
        });

        // TODO: Atualizar status da mensagem (lida, entregue, etc)

    } catch (error) {
        console.error('❌ Error handling message update:', error);
    }
};

const handleConnectionUpdate = async (eventData) => {
    try {
        console.log('🔌 Processing connection update:', {
            state: eventData.state,
            lastDisconnect: eventData.lastDisconnect
        });

        // TODO: Atualizar status da conexão
        // Exemplo: Notificar administradores se conexão cair

    } catch (error) {
        console.error('❌ Error handling connection update:', error);
    }
};

const handleGroupUpdate = async (eventData) => {
    try {
        console.log('👥 Processing group update:', {
            groupId: eventData.id,
            subject: eventData.subject,
            action: eventData.action
        });

        // TODO: Atualizar dados do grupo no banco
        // Exemplo: Atualizar nome, descrição, foto do grupo

    } catch (error) {
        console.error('❌ Error handling group update:', error);
    }
};

const handleParticipantsUpdate = async (eventData) => {
    try {
        console.log('👤 Processing participants update:', {
            groupId: eventData.id,
            participants: eventData.participants,
            action: eventData.action // add, remove, promote, demote
        });

        // TODO: Atualizar participantes do grupo
        // Exemplo: Adicionar/remover participantes conforme ação

    } catch (error) {
        console.error('❌ Error handling participants update:', error);
    }
};

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
            console.warn('⚠️ Webhook received but no local webhook_token configured.');
        } else {
            const configuredToken = settingsResult.rows[0].value;
            if (providedToken !== configuredToken) {
                console.error('❌ Invalid webhook token provided');
                return res.status(401).json({ error: 'Invalid webhook token' });
            }
        }

        // Processar evento
        const event = req.body;
        console.log('📨 Webhook Evolution received:', {
            event: event.event,
            instance: event.instance,
            timestamp: new Date().toISOString()
        });

        // Estrutura Evolution API:
        // event.event -> tipo do evento (ex: 'messages.upsert')
        // event.data -> dados
        // event.instance -> nome da instância

        // Direcionar para handler específico
        switch (event.event) {
            case 'messages.upsert':
                await handleNewMessage(event.data);
                break;

            case 'messages.update':
                await handleMessageUpdate(event.data);
                break;

            case 'connection.update':
                await handleConnectionUpdate(event.data);
                break;

            case 'groups.upsert':
                await handleGroupUpdate(event.data);
                break;

            case 'group-participants.update':
                await handleParticipantsUpdate(event.data);
                break;

            default:
                console.log(`ℹ️ Unhandled event type: ${event.event}`);
                // Log completo do evento não tratado para debug
                console.log('📋 Event data:', JSON.stringify(event, null, 2));
        }

        res.json({
            success: true,
            message: 'Webhook processed',
            eventType: event.event
        });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed', details: error.message });
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
