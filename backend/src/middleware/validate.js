import { z } from 'zod';

/**
 * Middleware para validar o corpo da requisição usando um schema Zod
 * @param {z.ZodSchema} schema - Schema de validação
 */
export const validateRequest = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            details: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message
            }))
        });
    }
};

// Schemas comuns
export const analysisSchema = z.object({
    body: z.object({
        analysisType: z.string().min(1, 'Tipo de análise é obrigatório'),
        company: z.string().min(1, 'Empresa é obrigatória'),
        provider: z.string().optional(),
        prompt: z.string().optional()
    })
});
