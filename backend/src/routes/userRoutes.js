/**
 * Rotas do dashboard do usuário
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getUserStats, getUserAnalyses, getUserCredits, getAnalysisById } from '../controllers/userDashboardController.js';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Estatísticas do usuário
router.get('/stats', getUserStats);

// Últimas análises do usuário
router.get('/analyses', getUserAnalyses);

// Créditos restantes
router.get('/credits', getUserCredits);

// Detalhes de uma análise específica
router.get('/analyses/:id', getAnalysisById);

export default router;
