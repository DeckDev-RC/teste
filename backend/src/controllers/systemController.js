import AIServiceFactory from '../services/AIServiceFactory.js';
import cacheHelper from '../utils/cacheHelper.js';
import analysisStore from '../utils/analysisStore.js';
import usageService from '../services/usageService.js';
import creditsService from '../services/creditsService.js';
import { getAvailableAnalysisTypes } from '../config/prompts.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Usamos a service key para evitar problemas de RLS no backend
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

export const getCompanies = async (req, res) => {
    try {
        // Buscar empresas do banco de dados
        const { data: companiesFromDb, error } = await supabase
            .from('companies')
            .select('id, name, icon')
            .order('name');

        if (error) throw error;

        let companiesList = companiesFromDb.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon
        }));

        // Filtrar por permissão do usuário
        const isAdmin = req.user?.role === 'master' || req.user?.role === 'admin';
        const allowed = req.user?.allowed_companies;

        if (!isAdmin && allowed && Array.isArray(allowed)) {
            console.log(`[SYSTEM] Filtering companies for user ${req.user?.id}. Allowed:`, allowed);
            const beforeCount = companiesList.length;
            companiesList = companiesList.filter(c => allowed.includes(c.id));
            console.log(`[SYSTEM] Filtered from ${beforeCount} to ${companiesList.length} companies.`);
        }

        res.json({
            success: true,
            data: {
                companies: companiesList,
                availableTypes: getAvailableAnalysisTypes()
            }
        });
    } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar empresas' });
    }
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
