import express from 'express';
import { getSettings, updateSettings, importWhatsAppGroups, importGroupMessages } from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middleware/permissions.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Obter configurações (todos podem ver)
router.get('/', getSettings);

// Atualizar configurações (apenas admin)
router.put('/', requireAdmin, updateSettings);

// Importar grupos do WhatsApp (apenas admin)
router.post('/import-whatsapp-groups', requireAdmin, importWhatsAppGroups);

// Importar mensagens de um grupo (apenas admin)
router.post('/import-messages/:groupId', requireAdmin, importGroupMessages);

export default router;
