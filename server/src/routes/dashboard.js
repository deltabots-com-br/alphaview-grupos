import express from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/permissions.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Obter métricas do dashboard
router.get('/metrics', getDashboardMetrics);

export default router;
