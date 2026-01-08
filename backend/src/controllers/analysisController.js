import fs from 'fs/promises';
import path from 'path';
import AIServiceFactory from '../services/AIServiceFactory.js';
import analysisStore from '../utils/analysisStore.js';
import imageHelper from '../utils/imageHelper.js';
import hashHelper from '../utils/hashHelper.js';
import fileNameHelper from '../utils/fileNameHelper.js';
import { getPrompt, getAvailableAnalysisTypes } from '../config/prompts.js';
import usageService from '../services/usageService.js';

export const analyzeFile = async (req, res) => {
    try {
        // Verifica quota antes de processar
        const stats = await usageService.getStats();
        if (stats.remaining <= 0) {
            return res.status(403).json({ success: false, error: 'Cota mensal esgotada' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
        }

        const { analysisType = 'financial-receipt', company = 'enia-marcia-joias', provider } = req.body;
        const filePath = req.file.path;
        const fileBuffer = await fs.readFile(filePath);
        const fileHash = await hashHelper.generateHash(fileBuffer);
        const batchId = req.body.batchId || 'default';

        // Verifica cache
        let analysis = analysisStore.getAnalysis(req.file.originalname, fileHash, analysisType);

        if (!analysis) {
            const aiService = AIServiceFactory.getService(provider);
            const prompt = getPrompt(analysisType);
            const isPDF = req.file.mimetype === 'application/pdf';

            if (isPDF) {
                analysis = await aiService.analyzePDF(fileBuffer, prompt, true, req.file.originalname, null, company, analysisType);
            } else {
                const imageData = await imageHelper.prepareImageForAnalysis(filePath, req.file.originalname);
                analysis = await aiService.analyzeReceipt(imageData.data, imageData.mimeType, prompt, true, req.file.originalname, null, company, analysisType);
            }

            analysisStore.storeAnalysis(req.file.originalname, fileHash, analysisType, analysis, batchId);
        }

        // Incrementa contador de uso
        await usageService.increment();

        // Cleanup
        try { await fs.unlink(filePath); } catch (e) { console.warn('Erro ao remover temporário:', e.message); }

        res.json({
            success: true,
            data: {
                analysis,
                analysisType,
                provider: provider || AIServiceFactory.getDefaultProvider(),
                originalName: req.file.originalname,
                batchId
            }
        });
    } catch (error) {
        console.error('Erro no controller de análise:', error);
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
