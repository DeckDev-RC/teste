/**
 * Serviço de Audit Logging para registrar eventos de segurança
 */
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Cliente Supabase com service key para bypass RLS
const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

class AuditLogService {
    /**
     * Registra um evento de segurança
     * @param {Object} params
     * @param {string} params.event - Tipo do evento (auth_failed, token_invalid, rate_limited, etc)
     * @param {string} params.ip - IP do cliente
     * @param {string} params.userAgent - User-Agent do cliente
     * @param {string} [params.userId] - ID do usuário (se disponível)
     * @param {Object} [params.metadata] - Metadados adicionais
     */
    async log({ event, ip, userAgent, userId = null, metadata = {} }) {
        try {
            // Log local sempre (para debug e casos onde Supabase não está disponível)
            logger.info(`Security Event: ${event}`, {
                event,
                ip: this.maskIp(ip),
                userId,
                ...metadata
            });

            // Se Supabase não estiver configurado, apenas log local
            if (!supabaseAdmin) {
                return { success: true, local: true };
            }

            // Inserir no banco de dados
            const { error } = await supabaseAdmin
                .from('security_audit_logs')
                .insert({
                    event_type: event,
                    ip_address: this.maskIp(ip), // Mascara IP por privacidade
                    user_agent: this.truncate(userAgent, 500),
                    user_id: userId,
                    metadata: metadata,
                    created_at: new Date().toISOString()
                });

            if (error) {
                // Falha silenciosa - não queremos quebrar o fluxo por causa de logging
                logger.warn('Failed to save audit log to database', { error: error.message });
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            logger.error('Audit log error', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Eventos pré-definidos para consistência
     */
    events = {
        AUTH_FAILED: 'auth_failed',
        TOKEN_INVALID: 'token_invalid',
        TOKEN_EXPIRED: 'token_expired',
        TOKEN_MISSING: 'token_missing',
        RATE_LIMITED: 'rate_limited',
        CSRF_FAILED: 'csrf_failed',
        ADMIN_ACCESS_DENIED: 'admin_access_denied',
        SUSPICIOUS_ACTIVITY: 'suspicious_activity'
    };

    /**
     * Mascara IP para privacidade (mantém apenas os 3 primeiros octetos)
     */
    maskIp(ip) {
        if (!ip) return 'unknown';
        // IPv4: 192.168.1.100 -> 192.168.1.xxx
        // IPv6: simplificado
        const parts = ip.split('.');
        if (parts.length === 4) {
            parts[3] = 'xxx';
            return parts.join('.');
        }
        return ip.substring(0, Math.min(ip.length, 20)) + '...';
    }

    /**
     * Trunca strings longas
     */
    truncate(str, maxLength) {
        if (!str) return null;
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }

    /**
     * Extrai informações relevantes do request
     */
    extractRequestInfo(req) {
        return {
            ip: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            path: req.path,
            method: req.method
        };
    }
}

export default new AuditLogService();
