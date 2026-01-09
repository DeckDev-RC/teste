/**
 * Controller para endpoints do dashboard master
 * Todas as rotas requerem autenticação + role master/admin
 */

import dashboardStatsService from '../services/dashboardStatsService.js';
import analysisLogService from '../services/analysisLogService.js';

/**
 * Estatísticas gerais do dashboard
 */
export const getDashboardStats = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        const filters = {
            startDate,
            endDate,
            groupBy: groupBy || 'day'
        };

        // Buscar todas as estatísticas em paralelo
        const [usersStats, creditsStats, usageStats, performanceStats, financialStats] = await Promise.all([
            dashboardStatsService.getUserStats(filters),
            dashboardStatsService.getCreditsStats(filters),
            dashboardStatsService.getUsageStats(filters),
            dashboardStatsService.getPerformanceStats(filters),
            dashboardStatsService.getFinancialStats(filters)
        ]);

        // Calcular variações comparando com período anterior
        const comparisons = await dashboardStatsService.calculateComparisons(filters);

        res.json({
            success: true,
            data: {
                lastUpdate: new Date().toISOString(),
                period: {
                    start: filters.startDate || null,
                    end: filters.endDate || null,
                    groupBy: filters.groupBy
                },
                users: {
                    ...usersStats,
                    changeThisMonth: comparisons.usersChangeThisMonth,
                    changeLabel: 'este mês'
                },
                credits: {
                    ...creditsStats,
                    changeVsPrevious: comparisons.creditsChangeVsPrevious,
                    changeLabel: 'vs anterior'
                },
                usage: {
                    ...usageStats,
                    changeLast24h: comparisons.usageChangeLast24h,
                    changeLabel: 'últ. 24h'
                },
                performance: {
                    ...performanceStats,
                    availabilityRate: comparisons.availabilityRate || 99.9
                },
                financial: financialStats
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar estatísticas do dashboard'
        });
    }
};

/**
 * Estatísticas detalhadas de usuários
 */
export const getUsersStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filters = { startDate, endDate };
        const stats = await dashboardStatsService.getUserStats(filters);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de usuários:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar estatísticas de usuários'
        });
    }
};

/**
 * Estatísticas detalhadas de créditos
 */
export const getCreditsStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filters = { startDate, endDate };
        const stats = await dashboardStatsService.getCreditsStats(filters);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de créditos:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar estatísticas de créditos'
        });
    }
};

/**
 * Estatísticas detalhadas de uso
 */
export const getUsageStats = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        const filters = {
            startDate,
            endDate,
            groupBy: groupBy || 'day'
        };
        const stats = await dashboardStatsService.getUsageStats(filters);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de uso:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar estatísticas de uso'
        });
    }
};

/**
 * Estatísticas de performance
 */
export const getPerformanceStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filters = { startDate, endDate };
        const stats = await dashboardStatsService.getPerformanceStats(filters);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de performance:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar estatísticas de performance'
        });
    }
};

/**
 * Estatísticas financeiras
 */
export const getFinancialStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filters = { startDate, endDate };
        const stats = await dashboardStatsService.getFinancialStats(filters);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas financeiras:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar estatísticas financeiras'
        });
    }
};

/**
 * Top N usuários por uso/créditos
 */
export const getTopUsers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const { startDate, endDate } = req.query;

        const filters = { startDate, endDate };
        const topUsers = await dashboardStatsService.getTopUsers(limit, filters);

        res.json({
            success: true,
            data: {
                limit,
                users: topUsers
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar top usuários:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar top usuários'
        });
    }
};

/**
 * Dados temporais para gráficos
 */
export const getTimeSeriesData = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        const filters = {
            startDate,
            endDate,
            groupBy: groupBy || 'day'
        };
        const data = await dashboardStatsService.getTimeSeriesData(filters);

        res.json({
            success: true,
            data: {
                groupBy: filters.groupBy,
                series: data
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar dados temporais:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar dados temporais'
        });
    }
};

/**
 * Estatísticas detalhadas de Usuário x IA
 */
export const getUserIAStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filters = { startDate, endDate };
        const stats = await dashboardStatsService.getUserIAStats(filters);

        res.json({
            success: true,
            data: {
                stats,
                total: stats.length
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas usuário x IA:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar estatísticas usuário x IA'
        });
    }
};

/**
 * Lista análises recentes (últimas N análises)
 */
export const getRecentAnalyses = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const { startDate, endDate, userId, analysisType, provider, success } = req.query;

        const filters = {
            startDate,
            endDate,
            userId,
            analysisType,
            provider,
            success: success !== undefined ? success === 'true' : undefined,
            limit,
            offset: 0
        };

        const analyses = await analysisLogService.getSystemAnalyses(filters);

        res.json({
            success: true,
            data: {
                count: analyses.length,
                analyses
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar análises recentes:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar análises recentes'
        });
    }
};
