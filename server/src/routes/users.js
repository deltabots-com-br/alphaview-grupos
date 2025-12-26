import express from 'express';
import {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/usersController.js';
import { authenticate, requireAdmin } from '../middleware/permissions.js';

const router = express.Router();

// Todas as rotas de users requerem autenticação E admin
router.use(authenticate, requireAdmin);

// CRUD de usuários
router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
