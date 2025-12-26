import express from 'express';
import { handleEvolutionWebhook, generateWebhookToken } from '../controllers/webhookController.js';
import { authenticate, requireAdmin } from '../middleware/permissions.js';

const router = express.Router();

// Webhook público (validado por token no header)
router.post('/evolution', handleEvolutionWebhook);

// Gerar novo token (apenas admin)
router.post('/generate-token', authenticate, requireAdmin, generateWebhookToken);

export default router;
