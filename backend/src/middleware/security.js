/**
 * Middlewares de segurança
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * Rate limiting para proteção contra brute force
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 tentativas por IP
    message: {
        success: false,
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
});

export const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // Máximo 100 requisições por minuto
    message: {
        success: false,
        error: 'Muitas requisições. Tente novamente em alguns instantes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Configuração do Helmet para headers de segurança
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", process.env.SUPABASE_URL || 'http://31.97.164.208:8000'],
        },
    },
    crossOriginEmbedderPolicy: false, // Permite recursos externos se necessário
    hsts: {
        maxAge: 31536000, // 1 ano
        includeSubDomains: true,
        preload: true
    }
});

/**
 * Sanitização básica de strings
 */
export const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    // Remove caracteres perigosos para XSS
    return str
        .replace(/[<>]/g, '') // Remove < e >
        .trim();
};

/**
 * Validação e sanitização de email
 */
export const sanitizeEmail = (email) => {
    if (typeof email !== 'string') return null;
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return null;
    return email.toLowerCase().trim();
};
