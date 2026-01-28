/**
 * Controller para operações administrativas (master/admin only)
 */

import creditsService from '../services/creditsService.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * Listar todos os usuários e seus créditos
 */
export const getAllUsersCredits = async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Sistema de administração não configurado'
            });
        }

        // Buscar todos os créditos do mês atual
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        const { data: credits, error } = await supabaseAdmin
            .from('user_credits')
            .select('*')
            .eq('month_year', currentMonth)
            .order('credits_used', { ascending: false });

        if (error) throw error;

        // Buscar informações dos perfis separadamente
        let creditsWithProfiles = credits || [];
        if (creditsWithProfiles.length > 0) {
            const userIds = [...new Set(creditsWithProfiles.map(c => c.user_id).filter(Boolean))];

            if (userIds.length > 0) {
                const { data: profiles } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email, full_name, role, allowed_companies')
                    .in('id', userIds);

                const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

                // Adicionar dados do perfil a cada crédito
                creditsWithProfiles = creditsWithProfiles.map(credit => ({
                    ...credit,
                    profiles: profilesMap.get(credit.user_id) || null
                }));
            }
        }

        res.json({
            success: true,
            data: {
                month: currentMonth,
                users: creditsWithProfiles
            }
        });
    } catch (error) {
        console.error('Erro ao listar créditos de usuários:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao listar créditos'
        });
    }
};

/**
 * Resetar créditos de um usuário específico
 */
export const resetUserCredits = async (req, res) => {
    try {
        const { userId } = req.params;
        const { month } = req.body; // Opcional: mês específico (YYYY-MM)

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'ID do usuário não fornecido'
            });
        }

        const targetMonth = month || new Date().toISOString().slice(0, 7);

        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Sistema de administração não configurado'
            });
        }

        // Resetar créditos do usuário para o mês especificado
        const { data, error } = await supabaseAdmin
            .from('user_credits')
            .update({
                credits_used: 0,
                last_reset_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('month_year', targetMonth)
            .select()
            .single();

        if (error) {
            // Se não encontrou registro, criar um novo
            if (error.code === 'PGRST116') {
                const { data: newData, error: insertError } = await supabaseAdmin
                    .from('user_credits')
                    .insert({
                        user_id: userId,
                        credits_used: 0,
                        credits_limit: 2500,
                        month_year: targetMonth,
                        last_reset_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                return res.json({
                    success: true,
                    message: `Créditos resetados para o usuário no mês ${targetMonth}`,
                    data: newData
                });
            }
            throw error;
        }

        res.json({
            success: true,
            message: `Créditos resetados para o usuário no mês ${targetMonth}`,
            data: data
        });
    } catch (error) {
        console.error('Erro ao resetar créditos do usuário:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao resetar créditos'
        });
    }
};

/**
 * Adicionar créditos a um usuário
 */
export const addUserCredits = async (req, res) => {
    try {
        const { userId, amount } = req.body;

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'ID do usuário e quantidade válida são obrigatórios'
            });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Sistema de administração não configurado'
            });
        }

        // Obter créditos atuais do usuário
        const credits = await creditsService.getUserCredits(userId);
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Atualizar créditos (aumentar limite)
        const { data, error } = await supabaseAdmin
            .from('user_credits')
            .update({
                credits_limit: credits.credits_limit + amount,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('month_year', currentMonth)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: `${amount} créditos adicionados ao usuário`,
            data: {
                ...data,
                credits_remaining: data.credits_limit - data.credits_used
            }
        });
    } catch (error) {
        console.error('Erro ao adicionar créditos:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao adicionar créditos'
        });
    }
};

/**
 * Definir role de um usuário (master/admin/user)
 */
export const setUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!userId || !role) {
            return res.status(400).json({
                success: false,
                error: 'ID do usuário e role são obrigatórios'
            });
        }

        if (!['user', 'admin', 'master'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Role inválido. Use: user, admin ou master'
            });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Sistema de administração não configurado'
            });
        }

        // Atualizar role do usuário
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                role: role,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: `Role do usuário atualizado para: ${role}`,
            data: data
        });
    } catch (error) {
        console.error('Erro ao atualizar role do usuário:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao atualizar role'
        });
    }
};

/**
 * Listar todos os usuários
 */
export const getAllUsers = async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Sistema de administração não configurado'
            });
        }

        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, role, allowed_companies, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: {
                users: profiles || []
            }
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao listar usuários'
        });
    }
};

/**
 * Definir empresas permitidas para um usuário
 */
export const setUserCompanies = async (req, res) => {
    try {
        const { userId } = req.params;
        const { allowedCompanies } = req.body;

        if (!userId || !Array.isArray(allowedCompanies)) {
            return res.status(400).json({
                success: false,
                error: 'ID do usuário e lista de empresas (array) são obrigatórios'
            });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Sistema de administração não configurado'
            });
        }

        console.log(`[ADMIN] Updating Companies: User=${userId} Allowed=`, allowedCompanies);

        // Atualizar allowed_companies do usuário
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                allowed_companies: allowedCompanies,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error(`[ADMIN] Error updating user ${userId}:`, error);
            throw error;
        }

        console.log(`[ADMIN] Update successful for user ${userId}. New data:`, data.allowed_companies);

        res.json({
            success: true,
            message: `Permissões de empresas atualizadas para o usuário`,
            data: data
        });
    } catch (error) {
        console.error('Erro ao atualizar empresas do usuário:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao atualizar empresas'
        });
    }
};
