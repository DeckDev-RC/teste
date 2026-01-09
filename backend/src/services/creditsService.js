/**
 * Serviço de gerenciamento de créditos dos usuários
 * Conecta ao Supabase para gerenciar créditos de forma segura
 */

import { createClient } from '@supabase/supabase-js';

class CreditsService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseServiceKey) {
            console.warn('⚠️ SUPABASE_SERVICE_KEY não configurada. Sistema de créditos desabilitado.');
            this.supabase = null;
        } else {
            // Usar service_key para bypass RLS (operações do sistema)
            this.supabase = createClient(supabaseUrl, supabaseServiceKey);
        }
    }

    /**
     * Obtém créditos do usuário para o mês atual
     * @param {string} userId - UUID do usuário
     * @returns {Promise<Object>} { credits_used, credits_limit, credits_remaining, month_year }
     */
    async getUserCredits(userId) {
        if (!this.supabase || !userId) {
            throw new Error('Supabase não configurado ou userId inválido');
        }

        try {
            const { data, error } = await this.supabase.rpc('get_user_credits', {
                p_user_id: userId
            });

            if (error) throw error;

            if (!data || data.length === 0) {
                // Se não retornou dados, criar registro
                return {
                    credits_used: 0,
                    credits_limit: 2500,
                    credits_remaining: 2500,
                    month_year: new Date().toISOString().slice(0, 7)
                };
            }

            return data[0];
        } catch (error) {
            console.error('Erro ao obter créditos do usuário:', error);
            throw error;
        }
    }

    /**
     * Debita créditos do usuário (seguro, verifica antes de debitar)
     * @param {string} userId - UUID do usuário
     * @param {number} amount - Quantidade a debitar (padrão: 1)
     * @returns {Promise<Object>} { success, credits_used, credits_limit, credits_remaining }
     */
    async debitCredit(userId, amount = 1) {
        if (!this.supabase || !userId) {
            throw new Error('Supabase não configurado ou userId inválido');
        }

        if (amount <= 0) {
            throw new Error('Quantidade deve ser maior que zero');
        }

        try {
            const { data, error } = await this.supabase.rpc('debit_user_credit', {
                p_user_id: userId,
                p_amount: amount
            });

            if (error) throw error;

            if (!data.success) {
                throw new Error(data.error || 'Erro ao debitar crédito');
            }

            return data;
        } catch (error) {
            console.error('Erro ao debitar crédito:', error);
            throw error;
        }
    }

    /**
     * Verifica se o usuário tem créditos suficientes
     * @param {string} userId - UUID do usuário
     * @param {number} amount - Quantidade necessária (padrão: 1)
     * @returns {Promise<boolean>}
     */
    async hasEnoughCredits(userId, amount = 1) {
        try {
            const credits = await this.getUserCredits(userId);
            return credits.credits_remaining >= amount;
        } catch (error) {
            console.error('Erro ao verificar créditos:', error);
            return false;
        }
    }

    /**
     * Reseta créditos mensalmente (chamado por script externo ou cron)
     * @returns {Promise<number>} Número de registros criados
     */
    async resetMonthlyCredits() {
        if (!this.supabase) {
            throw new Error('Supabase não configurado');
        }

        try {
            const { data, error } = await this.supabase.rpc('reset_monthly_credits');

            if (error) throw error;

            return data || 0;
        } catch (error) {
            console.error('Erro ao resetar créditos mensais:', error);
            throw error;
        }
    }
}

export default new CreditsService();
