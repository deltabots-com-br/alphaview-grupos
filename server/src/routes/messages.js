import express from 'express';
import { getMessages, sendMessage } from '../controllers/messagesController.js';
import { authenticate } from '../middleware/permissions.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Mensagens de uma conversa
router.get('/:conversationId/messages', getMessages);
router.post('/:conversationId/messages', sendMessage);

export default router;
