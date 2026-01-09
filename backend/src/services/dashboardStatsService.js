/**
 * Serviço centralizado para estatísticas do dashboard master
 * Agrega dados de múltiplas fontes (profiles, user_credits, analysis_logs)
 */

import { createClient } from '@supabase/supabase-js';
import analysisLogService from './analysisLogService.js';
import { COMPANIES } from '../config/prompts.js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * Traduz slug de empresa para nome legível
 * @param {string} companySlug - Slug da empresa (ex: 'enia-marcia-joias')
 * @returns {string} Nome legível (ex: 'Enia Marcia Joias')
 */
function translateCompanyName(companySlug) {
    if (!companySlug || companySlug === 'unknown' || companySlug === 'null') {
        return 'Não especificado';
    }
    const company = COMPANIES[companySlug];
    return company?.name || companySlug;
}

/**
 * Traduz nome de provider para formato legível
 * @param {string} provider - Provider slug (ex: 'gemini', 'openai')
 * @returns {string} Nome legível (ex: 'Google Gemini', 'OpenAI')
 */
function translateProviderName(provider) {
    const providerNames = {
        'gemini': 'Google Gemini',
        'openai': 'OpenAI',
        'nexus': 'Nexus AI',
        'default': 'Padrão'
    };
    return providerNames[provider] || provider || 'Desconhecido';
}

class DashboardStatsService {
    /**
     * Normaliza filtros de data
     * @param {Object} filters - Filtros
     * @returns {Object} Filtros normalizados
     */
    normalizeFilters(filters = {}) {
        const now = new Date();
        const startDate = filters.startDate
            ? new Date(filters.startDate)
            : new Date(now.getFullYear(), 0, 1); // Primeiro dia do ano
        const endDate = filters.endDate
            ? new Date(filters.endDate)
            : now;

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            ...filters
        };
    }

    /**
     * Estatísticas de usuários
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Object>} Estatísticas de usuários
     */
    async getUserStats(filters = {}) {
        if (!supabaseAdmin) {
            return {
                total: 0,
                active: 0,
                new: 0,
                byRole: { user: 0, admin: 0, master: 0 },
                growth: []
            };
        }

        try {
            const normalizedFilters = this.normalizeFilters(filters);

            // Buscar todos os usuários
            const { data: profiles, error } = await supabaseAdmin
                .from('profiles')
                .select('id, email, role, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const stats = {
                total: profiles?.length || 0,
                active: 0,
                new: 0,
                byRole: { user: 0, admin: 0, master: 0 },
                growth: []
            };

            // Contar por role
            profiles?.forEach(profile => {
                const role = profile.role || 'user';
                stats.byRole[role] = (stats.byRole[role] || 0) + 1;
            });

            // Novos usuários no período
            const startDate = new Date(normalizedFilters.startDate);
            stats.new = profiles?.filter(p => new Date(p.created_at) >= startDate).length || 0;

            // Usuários ativos (com análises no período)
            const activeUsers = await analysisLogService.getSystemAnalyses({
                startDate: normalizedFilters.startDate,
                endDate: normalizedFilters.endDate,
                limit: 10000
            });

            const uniqueActiveUsers = new Set(activeUsers.map(a => a.user_id));
            stats.active = uniqueActiveUsers.size;

            // Crescimento ao longo do tempo (por mês)
            if (profiles) {
                const growthMap = new Map();
                profiles.forEach(profile => {
                    const monthKey = new Date(profile.created_at).toISOString().slice(0, 7); // YYYY-MM
                    growthMap.set(monthKey, (growthMap.get(monthKey) || 0) + 1);
                });

                stats.growth = Array.from(growthMap.entries())
                    .map(([month, count]) => ({ month, count }))
                    .sort((a, b) => a.month.localeCompare(b.month));
            }

            return stats;
        } catch (error) {
            console.error('Erro ao buscar estatísticas de usuários:', error);
            return {
                total: 0,
                active: 0,
                new: 0,
                byRole: { user: 0, admin: 0, master: 0 },
                growth: []
            };
        }
    }

    /**
     * Estatísticas de créditos
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Object>} Estatísticas de créditos
     */
    async getCreditsStats(filters = {}) {
        if (!supabaseAdmin) {
            return {
                totalUsed: 0,
                totalAvailable: 0,
                averagePerUser: 0,
                topUsers: [],
                distribution: [],
                byMonth: []
            };
        }

        try {
            const normalizedFilters = this.normalizeFilters(filters);
            const currentMonth = new Date().toISOString().slice(0, 7);

            // Buscar todos os créditos do mês atual
            const { data: credits, error } = await supabaseAdmin
                .from('user_credits')
                .select('*')
                .eq('month_year', currentMonth);

            if (error) throw error;

            const stats = {
                totalUsed: 0,
                totalAvailable: 0,
                averagePerUser: 0,
                topUsers: [],
                distribution: [],
                byMonth: []
            };

            if (credits && credits.length > 0) {
                // Buscar informações dos perfis separadamente
                const userIds = [...new Set(credits.map(c => c.user_id).filter(Boolean))];
                let profilesMap = new Map();

                if (userIds.length > 0) {
                    const { data: profiles } = await supabaseAdmin
                        .from('profiles')
                        .select('id, email, full_name, role')
                        .in('id', userIds);

                    profilesMap = new Map((profiles || []).map(p => [p.id, p]));
                }

                // Calcular totais
                credits.forEach(credit => {
                    stats.totalUsed += credit.credits_used || 0;
                    stats.totalAvailable += credit.credits_limit || 0;
                });

                stats.averagePerUser = stats.totalUsed / credits.length;

                // Top usuários por uso
                const sortedCredits = [...credits]
                    .sort((a, b) => (b.credits_used || 0) - (a.credits_used || 0))
                    .slice(0, 10);

                stats.topUsers = sortedCredits.map(credit => {
                    const profile = profilesMap.get(credit.user_id) || null;
                    return {
                        userId: credit.user_id,
                        email: profile?.email || 'N/A',
                        name: profile?.full_name || 'N/A',
                        creditsUsed: credit.credits_used || 0,
                        creditsLimit: credit.credits_limit || 0,
                        creditsRemaining: (credit.credits_limit || 0) - (credit.credits_used || 0)
                    };
                });

                // Distribuição de uso (faixas)
                const ranges = [
                    { label: '0-100', min: 0, max: 100, count: 0 },
                    { label: '101-500', min: 101, max: 500, count: 0 },
                    { label: '501-1000', min: 501, max: 1000, count: 0 },
                    { label: '1001-2000', min: 1001, max: 2000, count: 0 },
                    { label: '2000+', min: 2001, max: Infinity, count: 0 }
                ];

                credits.forEach(credit => {
                    const used = credit.credits_used || 0;
                    const range = ranges.find(r => used >= r.min && used <= r.max);
                    if (range) range.count++;
                });

                stats.distribution = ranges;
            }

            // Créditos por mês (histórico)
            try {
                const startMonth = normalizedFilters.startDate && typeof normalizedFilters.startDate === 'string'
                    ? normalizedFilters.startDate.slice(0, 7)
                    : null;
                const endMonth = normalizedFilters.endDate && typeof normalizedFilters.endDate === 'string'
                    ? normalizedFilters.endDate.slice(0, 7)
                    : null;

                let allCreditsQuery = supabaseAdmin
                    .from('user_credits')
                    .select('month_year, credits_used, credits_limit');

                if (startMonth) {
                    allCreditsQuery = allCreditsQuery.gte('month_year', startMonth);
                }
                if (endMonth) {
                    allCreditsQuery = allCreditsQuery.lte('month_year', endMonth);
                }

                const { data: allCredits, error: creditsError } = await allCreditsQuery;

                if (!creditsError && allCredits) {
                    const monthMap = new Map();
                    allCredits.forEach(credit => {
                        const month = credit.month_year;
                        if (!monthMap.has(month)) {
                            monthMap.set(month, { used: 0, available: 0 });
                        }
                        const data = monthMap.get(month);
                        data.used += credit.credits_used || 0;
                        data.available += credit.credits_limit || 0;
                    });

                    stats.byMonth = Array.from(monthMap.entries())
                        .map(([month, data]) => ({
                            month,
                            used: data.used,
                            available: data.available
                        }))
                        .sort((a, b) => a.month.localeCompare(b.month));
                }
            } catch (monthlyError) {
                console.warn('Erro ao buscar créditos mensais (não crítico):', monthlyError);
                // Continua sem os dados mensais
            }

            return stats;
        } catch (error) {
            console.error('Erro ao buscar estatísticas de créditos:', error);
            return {
                totalUsed: 0,
                totalAvailable: 0,
                averagePerUser: 0,
                topUsers: [],
                distribution: [],
                byMonth: []
            };
        }
    }

    /**
     * Estatísticas de uso
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Object>} Estatísticas de uso
     */
    async getUsageStats(filters = {}) {
        try {
            const normalizedFilters = this.normalizeFilters(filters);
            const analysisStats = await analysisLogService.getAnalysisStats(normalizedFilters);
            const analyses = await analysisLogService.getSystemAnalyses({
                ...normalizedFilters,
                limit: 10000
            });

            // Agrupar por empresa (com nomes legíveis)
            const byCompanyRaw = {};
            const byCompany = {};
            analyses.forEach(analysis => {
                const companySlug = analysis.company || 'unknown';
                byCompanyRaw[companySlug] = (byCompanyRaw[companySlug] || 0) + 1;
            });

            // Traduzir slugs para nomes legíveis
            Object.entries(byCompanyRaw).forEach(([slug, count]) => {
                const companyName = translateCompanyName(slug);
                byCompany[companyName] = count;
            });

            // Agrupar por Usuário x IA (quem usa qual provedor)
            const byUserIA = {};
            analyses.forEach(analysis => {
                const userId = analysis.user_id;
                const provider = analysis.provider || 'unknown';
                const key = `${userId}_${provider}`;

                if (!byUserIA[key]) {
                    byUserIA[key] = {
                        userId: userId,
                        userEmail: analysis.profiles?.email || 'N/A',
                        userName: analysis.profiles?.full_name || 'N/A',
                        provider: provider,
                        providerName: translateProviderName(provider),
                        count: 0
                    };
                }
                byUserIA[key].count++;
            });

            // Converter objeto byUserIA para array e ordenar por count
            const byUserIAArray = Object.values(byUserIA).sort((a, b) => b.count - a.count);

            // Agrupar por dia/semana/mês para série temporal
            const timeSeries = {};
            const groupBy = filters.groupBy || 'day';

            analyses.forEach(analysis => {
                const date = new Date(analysis.created_at);
                let key;

                if (groupBy === 'day') {
                    key = date.toISOString().slice(0, 10); // YYYY-MM-DD
                } else if (groupBy === 'week') {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().slice(0, 10);
                } else if (groupBy === 'month') {
                    key = date.toISOString().slice(0, 7); // YYYY-MM
                } else {
                    key = date.toISOString().slice(0, 10);
                }

                if (!timeSeries[key]) {
                    timeSeries[key] = { date: key, count: 0, successful: 0, failed: 0 };
                }
                timeSeries[key].count++;
                if (analysis.success) {
                    timeSeries[key].successful++;
                } else {
                    timeSeries[key].failed++;
                }
            });

            const timeSeriesArray = Object.values(timeSeries)
                .sort((a, b) => a.date.localeCompare(b.date));

            // Traduzir nomes de providers nos dados agregados
            const byProviderTranslated = {};
            Object.entries(analysisStats.byProvider || {}).forEach(([provider, count]) => {
                const providerName = translateProviderName(provider);
                byProviderTranslated[providerName] = count;
            });

            // Agrupar Alertas da IA (Erros de dados/auditoria)
            const alertsSummary = {
                total: 0,
                byAlertType: {},
                recentAlerts: [] // Últimos 5 alertas para o dash
            };

            analyses.forEach(analysis => {
                // Garantir que ai_alerts seja um array (pode vir como array do Supabase ou string JSON)
                let alerts = [];
                if (analysis.ai_alerts) {
                    if (Array.isArray(analysis.ai_alerts)) {
                        alerts = analysis.ai_alerts;
                    } else if (typeof analysis.ai_alerts === 'string') {
                        try {
                            const parsed = JSON.parse(analysis.ai_alerts);
                            alerts = Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                            alerts = [];
                        }
                    }
                }

                if (alerts.length > 0) {
                    alertsSummary.total += alerts.length;
                    alerts.forEach(alertType => {
                        if (alertType && typeof alertType === 'string') {
                            alertsSummary.byAlertType[alertType] = (alertsSummary.byAlertType[alertType] || 0) + 1;
                        }
                    });
                }
            });

            // Coletar alertas recentes separadamente (ordenados por data mais recente)
            const analysesWithAlerts = analyses
                .filter(analysis => {
                    const alerts = Array.isArray(analysis.ai_alerts) 
                        ? analysis.ai_alerts 
                        : (typeof analysis.ai_alerts === 'string' ? (() => {
                            try {
                                const parsed = JSON.parse(analysis.ai_alerts);
                                return Array.isArray(parsed) ? parsed : [];
                            } catch { return []; }
                        })() : []);
                    return alerts.length > 0;
                })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Mais recentes primeiro
                .slice(0, 5); // Limitar a 5

            alertsSummary.recentAlerts = analysesWithAlerts.map(analysis => {
                const alerts = Array.isArray(analysis.ai_alerts) 
                    ? analysis.ai_alerts 
                    : [];
                return {
                    fileName: analysis.file_name || 'Arquivo desconhecido',
                    company: translateCompanyName(analysis.company),
                    alerts: alerts.filter(a => a && typeof a === 'string'),
                    timestamp: analysis.created_at
                };
            });

            return {
                totalAnalyses: analysisStats.total,
                byType: analysisStats.byType,
                byProvider: byProviderTranslated,
                byProviderRaw: analysisStats.byProvider,
                byCompany: byCompany,
                byCompanyRaw: byCompanyRaw,
                byUserIA: byUserIAArray,
                alerts: alertsSummary, // Novo: resumo de alertas para auditoria
                successRate: analysisStats.successRate,
                cacheHitRate: analysisStats.cacheHitRate,
                timeSeries: timeSeriesArray
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de uso:', error);
            return {
                totalAnalyses: 0,
                byType: {},
                byProvider: {},
                byProviderRaw: {},
                byCompany: {},
                byCompanyRaw: {},
                byUserIA: [],
                alerts: { total: 0, byAlertType: {}, recentAlerts: [] },
                successRate: 0,
                cacheHitRate: 0,
                timeSeries: []
            };
        }
    }

    /**
     * Estatísticas detalhadas de Usuário x IA (quem usa qual provedor)
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Array>} Array de estatísticas por usuário e IA
     */
    async getUserIAStats(filters = {}) {
        try {
            const normalizedFilters = this.normalizeFilters(filters);
            const analyses = await analysisLogService.getSystemAnalyses({
                ...normalizedFilters,
                limit: 10000
            });

            // Agrupar por usuário e provider
            const userIAMap = new Map();

            analyses.forEach(analysis => {
                const userId = analysis.user_id;
                const provider = analysis.provider || 'unknown';
                const key = `${userId}_${provider}`;

                if (!userIAMap.has(key)) {
                    userIAMap.set(key, {
                        userId: userId,
                        userEmail: analysis.profiles?.email || 'N/A',
                        userName: analysis.profiles?.full_name || 'N/A',
                        userRole: analysis.profiles?.role || 'user',
                        provider: provider,
                        providerName: translateProviderName(provider),
                        totalAnalyses: 0,
                        successfulAnalyses: 0,
                        failedAnalyses: 0,
                        byCompany: {},
                        avgProcessingTime: 0,
                        totalProcessingTime: 0,
                        cacheHits: 0
                    });
                }

                const stat = userIAMap.get(key);
                stat.totalAnalyses++;

                if (analysis.success) {
                    stat.successfulAnalyses++;
                } else {
                    stat.failedAnalyses++;
                }

                if (analysis.is_from_cache) {
                    stat.cacheHits++;
                }

                if (analysis.processing_time_ms) {
                    stat.totalProcessingTime += analysis.processing_time_ms;
                }

                // Agrupar por empresa também
                const companySlug = analysis.company || 'unknown';
                const companyName = translateCompanyName(companySlug);
                stat.byCompany[companyName] = (stat.byCompany[companyName] || 0) + 1;
            });

            // Calcular média de tempo de processamento e converter para array
            const result = Array.from(userIAMap.values()).map(stat => {
                stat.avgProcessingTime = stat.totalAnalyses > 0
                    ? Math.round(stat.totalProcessingTime / stat.totalAnalyses)
                    : 0;
                stat.successRate = stat.totalAnalyses > 0
                    ? parseFloat((stat.successfulAnalyses / stat.totalAnalyses * 100).toFixed(2))
                    : 0;
                stat.cacheHitRate = stat.totalAnalyses > 0
                    ? parseFloat((stat.cacheHits / stat.totalAnalyses * 100).toFixed(2))
                    : 0;
                return stat;
            });

            // Ordenar por total de análises (decrescente)
            return result.sort((a, b) => b.totalAnalyses - a.totalAnalyses);
        } catch (error) {
            console.error('Erro ao buscar estatísticas usuário x IA:', error);
            return [];
        }
    }

    /**
     * Estatísticas de performance
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Object>} Estatísticas de performance
     */
    async getPerformanceStats(filters = {}) {
        try {
            const normalizedFilters = this.normalizeFilters(filters);
            const analyses = await analysisLogService.getSystemAnalyses({
                ...normalizedFilters,
                limit: 10000
            });

            const stats = {
                avgProcessingTime: 0,
                p50ProcessingTime: 0,
                p95ProcessingTime: 0,
                p99ProcessingTime: 0,
                errorRate: 0,
                cacheHitRate: 0,
                errorRateByProvider: {},
                avgTimeByProvider: {}
            };

            if (analyses.length === 0) {
                return stats;
            }

            // Tempos de processamento
            const processingTimes = analyses
                .filter(a => a.processing_time_ms)
                .map(a => a.processing_time_ms)
                .sort((a, b) => a - b);

            if (processingTimes.length > 0) {
                stats.avgProcessingTime = Math.round(
                    processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
                );
                stats.p50ProcessingTime = processingTimes[Math.floor(processingTimes.length * 0.5)];
                stats.p95ProcessingTime = processingTimes[Math.floor(processingTimes.length * 0.95)];
                stats.p99ProcessingTime = processingTimes[Math.floor(processingTimes.length * 0.99)];
            }

            // Taxas de erro e cache
            let errors = 0;
            let cacheHits = 0;
            const providerErrors = {};
            const providerTimes = {};

            analyses.forEach(analysis => {
                if (!analysis.success) errors++;
                if (analysis.is_from_cache) cacheHits++;

                const provider = analysis.provider || 'unknown';
                if (!analysis.success) {
                    providerErrors[provider] = (providerErrors[provider] || 0) + 1;
                }
                if (analysis.processing_time_ms) {
                    if (!providerTimes[provider]) {
                        providerTimes[provider] = [];
                    }
                    providerTimes[provider].push(analysis.processing_time_ms);
                }
            });

            stats.errorRate = (errors / analyses.length) * 100;
            stats.cacheHitRate = (cacheHits / analyses.length) * 100;

            // Taxa de erro por provedor
            Object.keys(providerErrors).forEach(provider => {
                const providerAnalyses = analyses.filter(a => (a.provider || 'unknown') === provider);
                stats.errorRateByProvider[provider] = providerAnalyses.length > 0
                    ? (providerErrors[provider] / providerAnalyses.length) * 100
                    : 0;
            });

            // Tempo médio por provedor
            Object.keys(providerTimes).forEach(provider => {
                const times = providerTimes[provider];
                stats.avgTimeByProvider[provider] = Math.round(
                    times.reduce((a, b) => a + b, 0) / times.length
                );
            });

            return stats;
        } catch (error) {
            console.error('Erro ao buscar estatísticas de performance:', error);
            return {
                avgProcessingTime: 0,
                p50ProcessingTime: 0,
                p95ProcessingTime: 0,
                p99ProcessingTime: 0,
                errorRate: 0,
                cacheHitRate: 0,
                errorRateByProvider: {},
                avgTimeByProvider: {}
            };
        }
    }

    /**
     * Estatísticas financeiras (placeholder - pode ser expandido)
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Object>} Estatísticas financeiras
     */
    async getFinancialStats(filters = {}) {
        // Placeholder - pode ser expandido com dados reais de custo
        // Por enquanto retorna estrutura básica
        try {
            const usageStats = await this.getUsageStats(filters);

            // Estimativas básicas (pode ser substituído por dados reais)
            const costPerAnalysis = {
                gemini: 0.0001, // Exemplo: $0.0001 por análise
                openai: 0.0002,
                default: 0.0001
            };

            let totalCost = 0;
            const costByProvider = {};

            Object.keys(usageStats.byProvider).forEach(provider => {
                const count = usageStats.byProvider[provider];
                const cost = (costPerAnalysis[provider] || costPerAnalysis.default) * count;
                costByProvider[provider] = cost;
                totalCost += cost;
            });

            return {
                totalCost: totalCost,
                costByProvider: costByProvider,
                costPerAnalysis: usageStats.totalAnalyses > 0
                    ? totalCost / usageStats.totalAnalyses
                    : 0,
                estimatedMonthlyCost: totalCost // Pode ser ajustado para período
            };
        } catch (error) {
            console.error('Erro ao calcular estatísticas financeiras:', error);
            return {
                totalCost: 0,
                costByProvider: {},
                costPerAnalysis: 0,
                estimatedMonthlyCost: 0
            };
        }
    }

    /**
     * Calcula comparações e variações percentuais comparando com períodos anteriores
     * @param {Object} filters - Filtros do período atual
     * @returns {Promise<Object>} Variações calculadas
     */
    async calculateComparisons(filters = {}) {
        try {
            const now = new Date();

            // Mês atual vs mês anterior (para usuários)
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);

            // Últimas 24h vs 24h anteriores (para uso)
            const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const previous24hStart = new Date(last24hStart.getTime() - 24 * 60 * 60 * 1000);
            const previous24hEnd = last24hStart;

            // Buscar dados dos períodos anteriores em paralelo
            // Usar Promise.allSettled para não falhar se algum erro ocorrer
            const [
                currentUsersResult,
                previousMonthUsersResult,
                currentCreditsResult,
                previousCreditsResult,
                current24hUsageResult,
                previous24hUsageResult,
                currentUsageResult
            ] = await Promise.allSettled([
                this.getUserStats({ startDate: currentMonthStart.toISOString(), endDate: now.toISOString() }),
                this.getUserStats({ startDate: previousMonthStart.toISOString(), endDate: previousMonthEnd.toISOString() }),
                this.getCreditsStats({ startDate: currentMonthStart.toISOString(), endDate: now.toISOString() }),
                this.getCreditsStats({ startDate: previousMonthStart.toISOString(), endDate: previousMonthEnd.toISOString() }),
                this.getUsageStats({ startDate: last24hStart.toISOString(), endDate: now.toISOString() }),
                this.getUsageStats({ startDate: previous24hStart.toISOString(), endDate: previous24hEnd.toISOString() }),
                this.getUsageStats(filters)
            ]);

            // Extrair dados dos resultados (tratar rejeições)
            const currentUsers = currentUsersResult.status === 'fulfilled' ? currentUsersResult.value : { total: 0 };
            const previousMonthUsers = previousMonthUsersResult.status === 'fulfilled' ? previousMonthUsersResult.value : { total: 0 };
            const currentCredits = currentCreditsResult.status === 'fulfilled' ? currentCreditsResult.value : { totalUsed: 0 };
            const previousCredits = previousCreditsResult.status === 'fulfilled' ? previousCreditsResult.value : { totalUsed: 0 };
            const current24hUsage = current24hUsageResult.status === 'fulfilled' ? current24hUsageResult.value : { totalAnalyses: 0 };
            const previous24hUsage = previous24hUsageResult.status === 'fulfilled' ? previous24hUsageResult.value : { totalAnalyses: 0 };
            const currentUsage = currentUsageResult.status === 'fulfilled' ? currentUsageResult.value : { successRate: 0, totalAnalyses: 0 };

            // Calcular variação de usuários (este mês vs mês anterior)
            const usersChangeThisMonth = previousMonthUsers.total > 0
                ? ((currentUsers.total - previousMonthUsers.total) / previousMonthUsers.total * 100)
                : (currentUsers.total > 0 ? 100 : 0);

            // Calcular variação de créditos (mês atual vs mês anterior)
            const creditsChangeVsPrevious = previousCredits.totalUsed > 0
                ? ((currentCredits.totalUsed - previousCredits.totalUsed) / previousCredits.totalUsed * 100)
                : (currentCredits.totalUsed > 0 ? 100 : 0);

            // Calcular variação de uso (últimas 24h vs 24h anteriores)
            const usageChangeLast24h = previous24hUsage.totalAnalyses > 0
                ? ((current24hUsage.totalAnalyses - previous24hUsage.totalAnalyses) / previous24hUsage.totalAnalyses * 100)
                : (current24hUsage.totalAnalyses > 0 ? 100 : 0);

            // Taxa de disponibilidade baseada em success rate (ou padrão 99.9% se não houver dados)
            const availabilityRate = currentUsage.successRate > 0 && currentUsage.totalAnalyses > 0
                ? currentUsage.successRate
                : 99.9;

            return {
                usersChangeThisMonth: parseFloat(usersChangeThisMonth.toFixed(1)),
                creditsChangeVsPrevious: parseFloat(creditsChangeVsPrevious.toFixed(1)),
                usageChangeLast24h: parseFloat(usageChangeLast24h.toFixed(1)),
                availabilityRate: parseFloat(availabilityRate.toFixed(1))
            };
        } catch (error) {
            console.error('Erro ao calcular comparações:', error);
            // Retorna valores padrão seguros
            return {
                usersChangeThisMonth: 0,
                creditsChangeVsPrevious: 0,
                usageChangeLast24h: 0,
                availabilityRate: 99.9
            };
        }
    }

    /**
     * Top N usuários por uso/créditos
     * @param {number} limit - Número de usuários a retornar
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Array>} Top usuários
     */
    async getTopUsers(limit = 10, filters = {}) {
        try {
            const creditsStats = await this.getCreditsStats(filters);
            return creditsStats.topUsers.slice(0, limit);
        } catch (error) {
            console.error('Erro ao buscar top usuários:', error);
            return [];
        }
    }

    /**
     * Dados temporais para gráficos
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Array>} Dados temporais
     */
    async getTimeSeriesData(filters = {}) {
        try {
            const usageStats = await this.getUsageStats(filters);
            return usageStats.timeSeries;
        } catch (error) {
            console.error('Erro ao buscar dados temporais:', error);
            return [];
        }
    }
}

export default new DashboardStatsService();
