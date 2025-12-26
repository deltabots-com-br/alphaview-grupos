import express from 'express';
import {
    listConversations,
    getConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    getConversationMembers,
    addMember,
    removeMember
} from '../controllers/conversationsController.js';
import { authenticate, requireAdmin } from '../middleware/permissions.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listar conversas (todos os usuários autenticados)
router.get('/', listConversations);

// Obter conversa específica
router.get('/:id', getConversation);

// Criar conversa (apenas admin)
router.post('/', requireAdmin, createConversation);

// Atualizar conversa (apenas admin)
router.put('/:id', requireAdmin, updateConversation);

// Deletar conversa (apenas admin)
router.delete('/:id', requireAdmin, deleteConversation);

// Gerenciamento de membros

// Listar membros (todos os usuários autenticados)
router.get('/:id/members', getConversationMembers);

// Adicionar membro (apenas admin)
router.post('/:id/members', requireAdmin, addMember);

// Remover membro (apenas admin)
router.delete('/: id/members/:memberId', requireAdmin, removeMember);

export default router;
