/**
 * Rotas do dashboard master (master/admin only)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMaster } from '../middleware/admin.js';
import {
    getDashboardStats,
    getUsersStats,
    getCreditsStats,
    getUsageStats,
    getPerformanceStats,
    getFinancialStats,
    getTopUsers,
    getTimeSeriesData,
    getRecentAnalyses,
    getUserIAStats
} from '../controllers/dashboardController.js';

const router = express.Router();

// Todas as rotas requerem autenticação E permissão de master/admin
router.use(authenticate);
router.use(requireMaster);

// Rotas do dashboard
router.get('/stats', getDashboardStats); // Estatísticas gerais
router.get('/users', getUsersStats); // Estatísticas de usuários
router.get('/credits', getCreditsStats); // Estatísticas de créditos
router.get('/usage', getUsageStats); // Estatísticas de uso
router.get('/performance', getPerformanceStats); // Estatísticas de performance
router.get('/financial', getFinancialStats); // Estatísticas financeiras
router.get('/top-users', getTopUsers); // Top usuários
router.get('/user-ia', getUserIAStats); // Estatísticas usuário x IA
router.get('/timeseries', getTimeSeriesData); // Dados temporais para gráficos
router.get('/recent-analyses', getRecentAnalyses); // Análises recentes

export default router;
