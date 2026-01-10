/**
 * Middleware de autenticação para extrair user_id do token JWT do Supabase
 */

import { createClient } from '@supabase/supabase-js';
import auditLogService from '../services/auditLogService.js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Cliente Supabase para validar tokens
const supabase = supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Middleware para autenticar requisições e extrair user_id
 * Verifica o token JWT do Supabase no header Authorization
 */
export const authenticate = async (req, res, next) => {
    try {
        // Obter token do header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Log de tentativa sem token
            auditLogService.log({
                event: auditLogService.events.TOKEN_MISSING,
                ...auditLogService.extractRequestInfo(req),
                metadata: { path: req.path }
            });

            return res.status(401).json({
                success: false,
                error: 'Token de autenticação não fornecido'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer '

        if (!supabase) {
            console.warn('⚠️ Supabase não configurado. Autenticação desabilitada.');
            // Em desenvolvimento, pode permitir continuar sem autenticação
            if (process.env.NODE_ENV === 'development') {
                req.user = { id: 'dev-user-id' }; // ID temporário para desenvolvimento
                return next();
            }
            return res.status(500).json({
                success: false,
                error: 'Sistema de autenticação não configurado'
            });
        }

        // Verificar token com Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            // Log de token inválido
            auditLogService.log({
                event: error?.message?.includes('expired')
                    ? auditLogService.events.TOKEN_EXPIRED
                    : auditLogService.events.TOKEN_INVALID,
                ...auditLogService.extractRequestInfo(req),
                metadata: {
                    path: req.path,
                    errorType: error?.message || 'unknown'
                }
            });

            return res.status(401).json({
                success: false,
                error: 'Token inválido ou expirado'
            });
        }

        // SEGURANÇA: Adicionar apenas ID do usuário (não expor email em logs/erros)
        req.user = {
            id: user.id
            // email removido para evitar vazamento em logs
        };

        next();
    } catch (error) {
        // Log de erro de autenticação
        auditLogService.log({
            event: auditLogService.events.AUTH_FAILED,
            ...auditLogService.extractRequestInfo(req),
            metadata: {
                path: req.path,
                error: error.message
            }
        });

        console.error('Erro na autenticação:', error);
        return res.status(401).json({
            success: false,
            error: 'Erro ao autenticar usuário'
        });
    }
};

/**
 * Middleware opcional - tenta autenticar mas não bloqueia se falhar
 * Útil para rotas que funcionam com ou sem autenticação
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ') && supabase) {
            const token = authHeader.substring(7);
            const { data: { user } } = await supabase.auth.getUser(token);

            if (user) {
                // SEGURANÇA: Adicionar apenas ID (não expor email)
                req.user = {
                    id: user.id
                };
            }
        }
    } catch (error) {
        // Ignora erros de autenticação opcional
        console.warn('Autenticação opcional falhou:', error.message);
    }

    next();
};

