import AIServiceFactory from '../services/AIServiceFactory.js';
import cacheHelper from '../utils/cacheHelper.js';
import analysisStore from '../utils/analysisStore.js';
import usageService from '../services/usageService.js';
import creditsService from '../services/creditsService.js';
import { COMPANIES, getAvailableAnalysisTypes } from '../config/prompts.js';

export const getProviders = (req, res) => {
    res.json({
        success: true,
        data: {
            availableProviders: AIServiceFactory.getAvailableProviders(),
            defaultProvider: AIServiceFactory.getDefaultProvider(),
            timestamp: new Date().toISOString()
        }
    });
};

export const getStats = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                cache: cacheHelper.getStats(),
                analysisStore: analysisStore.getStats(),
                providers: AIServiceFactory.getAllStats(),
                usage: await usageService.getStats(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Erro no getStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getCompanies = (req, res) => {
    // Converte o objeto COMPANIES de prompts.js para um formato amigável ao frontend
    const companiesList = Object.entries(COMPANIES).map(([id, data]) => ({
        id,
        name: data.name || id,
        icon: data.icon
    }));

    res.json({
        success: true,
        data: {
            companies: companiesList,
            availableTypes: getAvailableAnalysisTypes()
        }
    });
};

export const setDefaultProvider = (req, res) => {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ success: false, error: 'Provedor não especificado' });

    AIServiceFactory.setDefaultProvider(provider);
    res.json({ success: true, message: `Provedor padrão alterado para ${provider}` });
};

// Obter créditos do usuário autenticado
export const getUserCredits = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuário não autenticado' 
            });
        }

        const credits = await creditsService.getUserCredits(req.user.id);
        res.json({
            success: true,
            data: credits
        });
    } catch (error) {
        console.error('Erro ao obter créditos:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao obter créditos' 
        });
    }
};

// DEV ONLY: Reset usage counter
export const resetUsage = async (req, res) => {
    try {
        const stats = await usageService.reset();
        res.json({ success: true, message: 'Uso resetado com sucesso!', data: { usage: stats } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
