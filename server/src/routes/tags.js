import express from 'express';
import {
    listTags,
    createTag,
    updateTag,
    deleteTag,
    addTagToConversation,
    removeTagFromConversation
} from '../controllers/tagsController.js';
import { authenticate, requireAdmin } from '../middleware/permissions.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// CRUD de tags
router.get('/', listTags);  // Qualquer usuário pode listar
router.post('/', requireAdmin, createTag);  // Apenas admin pode criar
router.put('/:id', requireAdmin, updateTag);  // Apenas admin pode atualizar
router.delete('/:id', requireAdmin, deleteTag);  // Apenas admin pode deletar

// Gerenciar tags de conversas (apenas admin)
router.post('/conversations/:conversationId/tags/:tagId', requireAdmin, addTagToConversation);
router.delete('/conversations/:conversationId/tags/:tagId', requireAdmin, removeTagFromConversation);

export default router;
