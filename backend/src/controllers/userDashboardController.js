/**
 * Controller para endpoints do dashboard do usuário
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://31.97.164.208:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * GET /api/user/stats - Estatísticas do usuário
 */
export const getUserStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Supabase não configurado' });
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

        // Análises de hoje
        const { count: analysesToday } = await supabaseAdmin
            .from('analysis_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfDay);

        // Análises de ontem (para calcular mudança)
        const { count: analysesYesterday } = await supabaseAdmin
            .from('analysis_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfYesterday)
            .lt('created_at', startOfDay);

        // Total do mês
        const { count: monthTotal } = await supabaseAdmin
            .from('analysis_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfMonth);

        // Análises com sucesso este mês
        const { count: successCount } = await supabaseAdmin
            .from('analysis_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfMonth)
            .eq('success', true);

        // Créditos do usuário do mês atual
        const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const { data: creditsData } = await supabaseAdmin
            .from('user_credits')
            .select('credits_limit, credits_used')
            .eq('user_id', userId)
            .eq('month_year', currentMonthYear)
            .single();

        const remainingCredits = (creditsData?.credits_limit || 2500) - (creditsData?.credits_used || 0);

        // Calcular taxa de sucesso
        const successRate = monthTotal > 0 ? Math.round((successCount / monthTotal) * 100) : 100;

        // Calcular mudança em relação a ontem
        const analysesTodayChange = analysesYesterday > 0
            ? Math.round(((analysesToday - analysesYesterday) / analysesYesterday) * 100)
            : (analysesToday > 0 ? 100 : 0);

        res.json({
            success: true,
            data: {
                analysesToday: analysesToday || 0,
                analysesTodayChange,
                credits: remainingCredits,
                monthTotal: monthTotal || 0,
                successRate
            }
        });
    } catch (error) {
        console.error('Erro ao buscar stats do usuário:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
    }
};

/**
 * GET /api/user/analyses - Últimas análises do usuário
 */
export const getUserAnalyses = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Supabase não configurado' });
        }

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status; // 'completed', 'failed', 'processing'

        let query = supabaseAdmin
            .from('analysis_results')
            .select('id, file_name, file_type, status, created_at, analysis_json, original_file_url', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: analyses, error, count } = await query;

        if (error) {
            console.error('Erro ao buscar análises:', error);
            // Fallback para analysis_logs se analysis_results falhar (retrocompatibilidade)
            return getUserAnalysesFromLogs(req, res);
        }

        res.json({
            success: true,
            data: {
                analyses: analyses || [],
                total: count || 0,
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Erro ao buscar análises do usuário:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar análises' });
    }
};

// Fallback method
const getUserAnalysesFromLogs = async (req, res) => {
    try {
        const userId = req.user?.id;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const { data: analyses, error, count } = await supabaseAdmin
            .from('analysis_logs')
            .select('id, file_name, analysis_type, success, created_at, company', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                analyses: analyses || [],
                total: count || 0,
                limit,
                offset
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Erro ao buscar análises (fallback)' });
    }
}

/**
 * GET /api/user/credits - Créditos restantes do usuário
 */
export const getUserCredits = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Supabase não configurado' });
        }

        const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const { data: creditData, error } = await supabaseAdmin
            .from('user_credits')
            .select('credits_limit, credits_used')
            .eq('user_id', userId)
            .eq('month_year', currentMonthYear)
            .single();

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Erro ao buscar créditos:', error);
            return res.status(500).json({ success: false, error: 'Erro ao buscar créditos' });
        }

        const remainingCredits = (creditData?.credits_limit || 2500) - (creditData?.credits_used || 0);

        res.json({
            success: true,
            data: {
                credits: remainingCredits,
                unlimited: profile?.role === 'master' || profile?.role === 'admin'
            }
        });
    } catch (error) {
        console.error('Erro ao buscar créditos do usuário:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar créditos' });
    }
};
