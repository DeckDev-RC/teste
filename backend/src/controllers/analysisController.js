import fs from 'fs/promises';
import path from 'path';
import AIServiceFactory from '../services/AIServiceFactory.js';
import analysisStore from '../utils/analysisStore.js';
import imageHelper from '../utils/imageHelper.js';
import hashHelper from '../utils/hashHelper.js';
import fileNameHelper from '../utils/fileNameHelper.js';
import { getAvailableAnalysisTypes } from '../config/prompts.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
import usageService from '../services/usageService.js';
import creditsService from '../services/creditsService.js';
import analysisLogService from '../services/analysisLogService.js';
import auditHelper from '../utils/auditHelper.js';

export const analyzeFile = async (req, res) => {
    try {
        // Verificar autenticação e obter user_id
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado. Token JWT necessário.'
            });
        }

        const userId = req.user.id;

        // Verificar créditos do usuário antes de processar (OBRIGATÓRIO - sem fallback)
        let creditsCheck;
        try {
            creditsCheck = await creditsService.getUserCredits(userId);
            if (creditsCheck.credits_remaining < 1) {
                return res.status(403).json({
                    success: false,
                    error: 'Créditos insuficientes',
                    credits_remaining: creditsCheck.credits_remaining,
                    credits_limit: creditsCheck.credits_limit
                });
            }
        } catch (creditsError) {
            console.error('❌ Erro crítico ao verificar créditos:', creditsError);
            // SEGURANÇA: Se não conseguir verificar créditos, BLOQUEIA a requisição
            // Não permite fallback para quota global (vulnerabilidade de segurança)
            return res.status(503).json({
                success: false,
                error: 'Sistema de créditos temporariamente indisponível. Tente novamente mais tarde.'
            });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
        }

        const { analysisType = 'financial-receipt', company = 'enia-marcia-joias', provider } = req.body;

        // SEGURANÇA: Verificar se o usuário tem permissão para esta empresa
        const isAdmin = req.user?.role === 'master' || req.user?.role === 'admin';
        const allowed = req.user?.allowed_companies;

        if (!isAdmin && allowed && Array.isArray(allowed)) {
            if (!allowed.includes(company)) {
                return res.status(403).json({
                    success: false,
                    error: `Acesso negado para a empresa: ${company}`
                });
            }
        }

        const filePath = req.file.path;
        const fileBuffer = await fs.readFile(filePath);
        const fileHash = await hashHelper.generateHash(fileBuffer);
        const batchId = req.body.batchId || 'default';
        const selectedProvider = provider || AIServiceFactory.getDefaultProvider();

        // Registrar início do processamento para medir tempo
        const processingStartTime = Date.now();

        // Verifica cache
        let analysis = analysisStore.getAnalysis(req.file.originalname, fileHash, analysisType);
        let isFromCache = !!analysis;
        let analysisPerformed = false;
        let analysisSuccess = true;
        let errorMessage = null;

        if (!analysis) {
            // SEGURANÇA: Verificar créditos novamente antes de fazer análise (race condition)
            try {
                const recheckCredits = await creditsService.getUserCredits(userId);
                if (recheckCredits.credits_remaining < 1) {
                    return res.status(403).json({
                        success: false,
                        error: 'Créditos insuficientes',
                        credits_remaining: recheckCredits.credits_remaining,
                        credits_limit: recheckCredits.credits_limit
                    });
                }
            } catch (recheckError) {
                console.error('❌ Erro ao re-verificar créditos antes da análise:', recheckError);
                return res.status(503).json({
                    success: false,
                    error: 'Sistema de créditos temporariamente indisponível'
                });
            }

            const aiService = AIServiceFactory.getService(selectedProvider);

            // Buscar prompt da empresa no banco de dados
            let prompt;
            try {
                const { data: companyData, error: companyError } = await supabase
                    .from('companies')
                    .select('financial_receipt_prompt, financial_payment_prompt, naming_patterns(pattern)')
                    .eq('id', company)
                    .single();

                if (companyError || !companyData) {
                    console.warn(`Empresa ${company} não encontrada no DB, usando fallback de prompts.js`);
                    // Fallback para o comportamento antigo se não achar no DB (opcional, melhor erro)
                    const { getPrompt } = await import('../config/prompts.js');
                    prompt = getPrompt(company, analysisType);
                } else {
                    prompt = analysisType === 'financial-payment'
                        ? companyData.financial_payment_prompt
                        : companyData.financial_receipt_prompt;
                }
            } catch (pError) {
                console.error('Erro ao buscar prompt no DB:', pError);
                return res.status(500).json({ success: false, error: 'Erro ao configurar prompt de análise' });
            }

            const isPDF = req.file.mimetype === 'application/pdf';

            try {
                if (isPDF) {
                    analysis = await aiService.analyzePDF(fileBuffer, prompt, true, req.file.originalname, null, company, analysisType);
                } else {
                    const imageData = await imageHelper.prepareImageForAnalysis(filePath, req.file.originalname);
                    analysis = await aiService.analyzeReceipt(imageData.data, imageData.mimeType, prompt, true, req.file.originalname, null, company, analysisType);
                }

                analysisStore.storeAnalysis(req.file.originalname, fileHash, analysisType, analysis, batchId);
                analysisPerformed = true;
                analysisSuccess = true;
            } catch (analysisError) {
                analysisSuccess = false;
                errorMessage = analysisError.message || 'Erro desconhecido na análise';
                // Persistir log do erro antes de re-throw
                const processingTimeMs = Date.now() - processingStartTime;
                try {
                    await analysisLogService.logAnalysis(userId, {
                        analysisType,
                        provider: selectedProvider,
                        company,
                        fileName: req.file.originalname,
                        fileHash,
                        isFromCache: false,
                        processingTimeMs,
                        success: false,
                        errorMessage,
                        creditsDebited: 0
                    });
                } catch (logError) {
                    console.warn('⚠️ Erro ao persistir log de análise com erro (não crítico):', logError);
                }
                throw analysisError; // Re-throw para tratamento no catch externo
            }
        }

        // Calcular tempo de processamento
        const processingTimeMs = Date.now() - processingStartTime;

        // Debitar crédito do usuário (após análise bem-sucedida)
        // SEGURANÇA: Se análise foi do cache, não debita novamente (já foi debitado antes)
        // Se análise foi nova, DEVE debitar obrigatoriamente
        let creditsDebited = 0;
        if (analysisPerformed && analysisSuccess) {
            try {
                const debitResult = await creditsService.debitCredit(userId, 1);

                // SEGURANÇA: Verificar se o débito foi bem-sucedido
                if (!debitResult || !debitResult.success) {
                    console.error('❌ Débito de crédito falhou:', debitResult);
                    // Se o débito falhou, a análise já foi feita mas não foi debitada
                    // Isso é um problema crítico - mas não podemos "desfazer" a análise
                    // Log crítico para monitoramento
                    // SEGURANÇA: Não expor userId em logs
                    console.error(`🚨 ALERTA DE SEGURANÇA: Análise realizada mas débito falhou`);
                    // Retorna erro para não permitir uso sem débito
                    return res.status(500).json({
                        success: false,
                        error: 'Erro ao processar créditos. Análise não pode ser concluída.'
                    });
                }

                creditsDebited = 1;
                // SEGURANÇA: Não expor userId em logs
                console.log(`✅ Crédito debitado. Restantes: ${debitResult.credits_remaining}`);
            } catch (creditsError) {
                console.error('❌ Erro crítico ao debitar crédito:', creditsError);
                // SEGURANÇA: Se falhar ao debitar, NÃO permite continuar
                // Não usa fallback para quota global (vulnerabilidade)
                return res.status(500).json({
                    success: false,
                    error: 'Erro ao processar créditos. Análise não pode ser concluída.'
                });
            }
        } else if (isFromCache) {
            // Análise veio do cache - não debita novamente (já foi debitado na primeira análise)
            // SEGURANÇA: Não expor userId em logs
            console.log(`ℹ️ Análise do cache - crédito já foi debitado anteriormente`);
        }

        // Analisar resposta em busca de alertas/erros de dados
        const aiAlerts = auditHelper.detectAlerts(analysis);
        if (aiAlerts.length > 0) {
            console.log(`⚠️ Alertas detectados na análise de "${req.file.originalname}":`, aiAlerts);
        }

        // Persistir log da análise no banco de dados (não bloqueia resposta)
        try {
            await analysisLogService.logAnalysis(userId, {
                analysisType,
                provider: selectedProvider,
                company,
                fileName: req.file.originalname,
                fileHash,
                isFromCache,
                processingTimeMs,
                success: analysisSuccess,
                errorMessage,
                creditsDebited,
                rawResponse: analysis, // Salvar resposta bruta para auditoria
                aiAlerts: aiAlerts // Salvar alertas detectados
            });
        } catch (logError) {
            // Não quebrar o fluxo se o log falhar
            console.warn('⚠️ Erro ao persistir log de análise (não crítico):', logError);
        }

        // Cleanup
        try { await fs.unlink(filePath); } catch (e) { console.warn('Erro ao remover temporário:', e.message); }

        // Se houve erro na análise, retornar erro
        if (!analysisSuccess) {
            const processingTimeMs = Date.now() - processingStartTime;
            // Log do erro no banco (não bloqueia)
            try {
                await analysisLogService.logAnalysis(userId, {
                    analysisType,
                    provider: selectedProvider,
                    company,
                    fileName: req.file.originalname,
                    fileHash,
                    isFromCache: false,
                    processingTimeMs,
                    success: false,
                    errorMessage: error.message,
                    creditsDebited: 0
                });
            } catch (logError) {
                console.warn('⚠️ Erro ao persistir log de análise com erro (não crítico):', logError);
            }

            if (req.file) try { await fs.unlink(req.file.path); } catch (e) { }
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao processar análise'
            });
        }

        // Gerar nome sugerido usando o sistema de templates
        const pattern = companyData?.naming_patterns?.pattern || null;
        const originalExtension = path.extname(req.file.originalname);
        const suggestedFileName = fileNameHelper.generateFileNameFromAnalysis(analysis, analysisType, originalExtension, pattern);

        res.json({
            success: true,
            data: {
                analysis,
                analysisType,
                provider: selectedProvider,
                originalName: req.file.originalname,
                suggestedFileName,
                batchId
            }
        });
    } catch (error) {
        console.error('Erro no controller de análise:', error);

        // Tentar persistir log de erro (não bloqueia)
        if (req.user && req.user.id) {
            try {
                const processingTimeMs = req.processingStartTime ? Date.now() - req.processingStartTime : 0;
                await analysisLogService.logAnalysis(req.user.id, {
                    analysisType: req.body?.analysisType || 'unknown',
                    provider: req.body?.provider || 'unknown',
                    company: req.body?.company || 'unknown',
                    fileName: req.file?.originalname || 'unknown',
                    fileHash: null,
                    isFromCache: false,
                    processingTimeMs,
                    success: false,
                    errorMessage: error.message,
                    creditsDebited: 0
                });
            } catch (logError) {
                console.warn('⚠️ Erro ao persistir log de erro (não crítico):', logError);
            }
        }

        if (req.file) try { await fs.unlink(req.file.path); } catch (e) { }
        res.status(500).json({ success: false, error: error.message });
    }
};

export const downloadRenamed = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Arquivo não enviado' });
        }

        const { analysis, analysisType = 'financial-receipt' } = req.body;
        if (!analysis) {
            return res.status(400).json({ success: false, error: 'Resultado da análise não fornecido' });
        }

        const originalExtension = path.extname(req.file.originalname);
        const newFileName = fileNameHelper.generateFileNameFromAnalysis(analysis, analysisType, originalExtension);

        // Envair o arquivo com o novo nome
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(newFileName)}"`);
        res.setHeader('Content-Type', req.file.mimetype);

        const fileBuffer = await fs.readFile(req.file.path);
        res.send(fileBuffer);

        // Cleanup
        try { await fs.unlink(req.file.path); } catch (e) { }
    } catch (error) {
        console.error('Erro no download renomeado:', error);
        if (req.file) try { await fs.unlink(req.file.path); } catch (e) { }
        res.status(500).json({ success: false, error: error.message });
    }
};
