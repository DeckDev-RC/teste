/**
 * Middleware para verificar se o usuário é master/admin
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Cliente Supabase com SERVICE_KEY para verificar roles
const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * Middleware para verificar se o usuário é master ou admin
 * Deve ser usado APÓS o middleware authenticate
 */
export const requireMaster = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!supabaseAdmin) {
            console.warn('⚠️ Supabase SERVICE_KEY não configurada. Verificação de master desabilitada.');
            return res.status(500).json({
                success: false,
                error: 'Sistema de administração não configurado'
            });
        }

        // Verificar role do usuário na tabela profiles
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (error || !profile) {
            return res.status(403).json({
                success: false,
                error: 'Perfil não encontrado'
            });
        }

        const role = profile.role || 'user';

        // Verificar se é master ou admin
        if (role !== 'master' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado. Apenas administradores podem acessar este recurso.'
            });
        }

        // Adicionar role ao req.user
        req.user.role = role;
        req.user.isMaster = role === 'master';
        req.user.isAdmin = role === 'admin' || role === 'master';

        next();
    } catch (error) {
        console.error('Erro ao verificar permissões de master:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao verificar permissões'
        });
    }
};

/**
 * Middleware opcional - verifica se é master mas não bloqueia
 */
export const optionalMaster = async (req, res, next) => {
    try {
        if (req.user && req.user.id && supabaseAdmin) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', req.user.id)
                .single();

            if (profile) {
                const role = profile.role || 'user';
                req.user.role = role;
                req.user.isMaster = role === 'master';
                req.user.isAdmin = role === 'admin' || role === 'master';
            }
        }
    } catch (error) {
        // Ignora erros em verificação opcional
        console.warn('Verificação opcional de master falhou:', error.message);
    }
    
    next();
};
