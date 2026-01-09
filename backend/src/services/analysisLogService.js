/**
 * Serviço para persistir e consultar logs de análises
 * Conecta ao Supabase para armazenar histórico de análises
 */

import { createClient } from '@supabase/supabase-js';

class AnalysisLogService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseServiceKey) {
            console.warn('⚠️ SUPABASE_SERVICE_KEY não configurada. Sistema de logs de análises desabilitado.');
            this.supabase = null;
        } else {
            // Usar service_key para bypass RLS (operações do sistema)
            this.supabase = createClient(supabaseUrl, supabaseServiceKey);
        }
    }

    /**
     * Persiste uma análise no banco de dados
     * @param {string} userId - UUID do usuário
     * @param {Object} data - Dados da análise
     * @param {string} data.analysisType - Tipo de análise (financial-receipt, financial-payment, etc.)
     * @param {string} data.provider - Provedor usado (gemini, openai, etc.)
     * @param {string} data.company - Empresa selecionada
     * @param {string} data.fileName - Nome do arquivo original
     * @param {string} data.fileHash - Hash do arquivo
     * @param {boolean} data.isFromCache - Se veio do cache
     * @param {number} data.processingTimeMs - Tempo de processamento em ms
     * @param {boolean} data.success - Se análise foi bem-sucedida
     * @param {string} data.errorMessage - Mensagem de erro se houver
     * @param {number} data.creditsDebited - Créditos debitados
     * @returns {Promise<Object>} Registro inserido
     */
    async logAnalysis(userId, data) {
        if (!this.supabase || !userId) {
            console.warn('⚠️ Supabase não configurado ou userId inválido. Log de análise não persistido.');
            return null;
        }

        try {
            // Converter rawResponse para JSONB se necessário
            let rawResponseJson = null;
            if (data.rawResponse) {
                if (typeof data.rawResponse === 'string') {
                    try {
                        rawResponseJson = JSON.parse(data.rawResponse);
                    } catch (e) {
                        rawResponseJson = { raw: data.rawResponse };
                    }
                } else if (typeof data.rawResponse === 'object') {
                    rawResponseJson = data.rawResponse;
                }
            }

            // Garantir que aiAlerts seja um array de strings
            let aiAlertsArray = [];
            if (data.aiAlerts && Array.isArray(data.aiAlerts)) {
                aiAlertsArray = data.aiAlerts.filter(a => a && typeof a === 'string');
            } else if (data.aiAlerts && typeof data.aiAlerts === 'string') {
                try {
                    const parsed = JSON.parse(data.aiAlerts);
                    if (Array.isArray(parsed)) {
                        aiAlertsArray = parsed.filter(a => a && typeof a === 'string');
                    }
                } catch (e) {
                    aiAlertsArray = [data.aiAlerts];
                }
            }

            const logData = {
                user_id: userId,
                analysis_type: data.analysisType || 'unknown',
                provider: data.provider || null,
                company: data.company || null,
                file_name: data.fileName || null,
                file_hash: data.fileHash || null,
                is_from_cache: data.isFromCache || false,
                processing_time_ms: data.processingTimeMs || null,
                success: data.success !== undefined ? data.success : true,
                error_message: data.errorMessage || null,
                credits_debited: data.creditsDebited || 1,
                raw_response: rawResponseJson,
                ai_alerts: aiAlertsArray // Array vazio [] é aceito pelo Supabase
            };

            const { data: inserted, error } = await this.supabase
                .from('analysis_logs')
                .insert(logData)
                .select()
                .single();

            if (error) {
                // Se a tabela não existe, apenas logar aviso mas não quebrar
                if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                    console.warn('⚠️ Tabela analysis_logs não existe. Execute a migration create_analysis_logs.sql');
                    return null;
                }
                throw error;
            }

            return inserted;
        } catch (error) {
            // Não quebrar o fluxo se o log falhar
            console.error('❌ Erro ao persistir log de análise:', error);
            return null;
        }
    }

    /**
     * Busca análises de um usuário específico
     * @param {string} userId - UUID do usuário
     * @param {Object} filters - Filtros opcionais
     * @param {string} filters.startDate - Data início (ISO string)
     * @param {string} filters.endDate - Data fim (ISO string)
     * @param {string} filters.analysisType - Filtrar por tipo
     * @param {string} filters.provider - Filtrar por provedor
     * @param {number} filters.limit - Limite de resultados
     * @param {number} filters.offset - Offset para paginação
     * @returns {Promise<Array>} Array de análises
     */
    async getUserAnalyses(userId, filters = {}) {
        if (!this.supabase || !userId) {
            return [];
        }

        try {
            let query = this.supabase
                .from('analysis_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }

            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            if (filters.analysisType) {
                query = query.eq('analysis_type', filters.analysisType);
            }

            if (filters.provider) {
                query = query.eq('provider', filters.provider);
            }

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            if (filters.offset) {
                query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar análises do usuário:', error);
            return [];
        }
    }

    /**
     * Busca todas as análises do sistema (master/admin only)
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Array>} Array de análises
     */
    async getSystemAnalyses(filters = {}) {
        if (!this.supabase) {
            return [];
        }

        try {
            let query = this.supabase
                .from('analysis_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }

            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            if (filters.analysisType) {
                query = query.eq('analysis_type', filters.analysisType);
            }

            if (filters.provider) {
                query = query.eq('provider', filters.provider);
            }

            if (filters.userId) {
                query = query.eq('user_id', filters.userId);
            }

            if (filters.success !== undefined) {
                query = query.eq('success', filters.success);
            }

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            if (filters.offset) {
                query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
            }

            const { data, error } = await query;

            if (error) {
                // Se a tabela não existe (código PGRST116 ou 42P01), retornar array vazio
                if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                    console.warn('⚠️ Tabela analysis_logs não existe. Execute a migration create_analysis_logs.sql');
                    return [];
                }
                throw error;
            }

            const analyses = data || [];

            // Buscar informações dos perfis separadamente e fazer merge
            if (analyses.length > 0) {
                const userIds = [...new Set(analyses.map(a => a.user_id).filter(Boolean))];

                if (userIds.length > 0) {
                    const { data: profiles } = await this.supabase
                        .from('profiles')
                        .select('id, email, full_name, role')
                        .in('id', userIds);

                    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

                    // Adicionar dados do perfil a cada análise
                    return analyses.map(analysis => ({
                        ...analysis,
                        profiles: profilesMap.get(analysis.user_id) || null
                    }));
                }
            }

            return analyses;
        } catch (error) {
            console.error('Erro ao buscar análises do sistema:', error);
            return [];
        }
    }

    /**
     * Obtém estatísticas agregadas de análises
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Object>} Estatísticas agregadas
     */
    async getAnalysisStats(filters = {}) {
        if (!this.supabase) {
            return {
                total: 0,
                successful: 0,
                failed: 0,
                successRate: 0,
                byType: {},
                byProvider: {},
                avgProcessingTime: 0
            };
        }

        try {
            // Buscar todas as análises no período
            const analyses = await this.getSystemAnalyses({
                ...filters,
                limit: 10000 // Limite alto para agregação
            });

            const stats = {
                total: analyses.length,
                successful: 0,
                failed: 0,
                successRate: 0,
                byType: {},
                byProvider: {},
                avgProcessingTime: 0,
                cacheHitRate: 0,
                totalProcessingTime: 0
            };

            let totalProcessingTime = 0;
            let cacheHits = 0;

            analyses.forEach(analysis => {
                // Contagem de sucesso/falha
                if (analysis.success) {
                    stats.successful++;
                } else {
                    stats.failed++;
                }

                // Por tipo
                const type = analysis.analysis_type || 'unknown';
                stats.byType[type] = (stats.byType[type] || 0) + 1;

                // Por provedor
                const provider = analysis.provider || 'unknown';
                stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;

                // Tempo de processamento
                if (analysis.processing_time_ms) {
                    totalProcessingTime += analysis.processing_time_ms;
                }

                // Cache hits
                if (analysis.is_from_cache) {
                    cacheHits++;
                }
            });

            // Calcular taxas e médias
            stats.successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;
            stats.cacheHitRate = stats.total > 0 ? (cacheHits / stats.total) * 100 : 0;
            stats.avgProcessingTime = stats.total > 0
                ? Math.round(totalProcessingTime / stats.total)
                : 0;

            return stats;
        } catch (error) {
            console.error('Erro ao calcular estatísticas de análises:', error);
            return {
                total: 0,
                successful: 0,
                failed: 0,
                successRate: 0,
                byType: {},
                byProvider: {},
                avgProcessingTime: 0
            };
        }
    }
}

export default new AnalysisLogService();
