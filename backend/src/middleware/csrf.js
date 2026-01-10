/**
 * Middleware CSRF usando Double Submit Cookie pattern
 * Gera um token único e valida que o header corresponde ao cookie
 */
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Gera um token CSRF criptograficamente seguro
 */
const generateToken = () => {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

/**
 * Middleware para gerar e enviar token CSRF
 * Deve ser usado em rotas GET que precedem formulários POST
 */
export const csrfTokenGenerator = (req, res, next) => {
    // Se já existe um token válido, não gera novo
    let token = req.cookies?.[CSRF_COOKIE_NAME];

    if (!token) {
        token = generateToken();

        // Cookie httpOnly=false para que o frontend possa ler e enviar no header
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hora
        });
    }

    // Adiciona o token na resposta para facilitar acesso
    res.locals.csrfToken = token;
    next();
};

/**
 * Middleware para validar token CSRF
 * Compara o token do header com o do cookie
 */
export const csrfValidator = (req, res, next) => {
    // Métodos seguros não precisam de validação CSRF
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];

    // Validação
    if (!cookieToken || !headerToken) {
        return res.status(403).json({
            success: false,
            error: 'Token CSRF ausente',
            code: 'CSRF_MISSING'
        });
    }

    // Comparação timing-safe para prevenir timing attacks
    try {
        const cookieBuffer = Buffer.from(cookieToken);
        const headerBuffer = Buffer.from(headerToken);

        if (cookieBuffer.length !== headerBuffer.length ||
            !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
            return res.status(403).json({
                success: false,
                error: 'Token CSRF inválido',
                code: 'CSRF_INVALID'
            });
        }
    } catch (error) {
        return res.status(403).json({
            success: false,
            error: 'Erro na validação CSRF',
            code: 'CSRF_ERROR'
        });
    }

    next();
};

/**
 * Endpoint para obter token CSRF
 * GET /api/csrf-token
 */
export const csrfTokenEndpoint = (req, res) => {
    let token = req.cookies?.[CSRF_COOKIE_NAME];

    if (!token) {
        token = generateToken();

        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
        });
    }

    res.json({
        success: true,
        csrfToken: token
    });
};
