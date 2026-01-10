/**
 * Logger estruturado usando Winston
 * - Em produção: JSON para facilitar parsing por ferramentas de monitoramento
 * - Em desenvolvimento: Colorido e legível
 */
import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Formato customizado para desenvolvimento
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Configuração baseada no ambiente
const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        isProduction ? json() : combine(colorize(), devFormat)
    ),
    transports: [
        new winston.transports.Console()
    ],
    // Não encerrar em exceções não tratadas (deixar o process manager lidar)
    exitOnError: false
});

// Helpers para logging estruturado
logger.request = (req, message, meta = {}) => {
    logger.info(message, {
        ...meta,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.user?.id
    });
};

logger.analysis = (analysisId, event, meta = {}) => {
    logger.info(`Analysis ${event}`, {
        ...meta,
        analysisId,
        event
    });
};

export default logger;
