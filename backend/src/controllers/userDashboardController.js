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
            .gte('timestamp', startOfDay);

        // Análises de ontem (para calcular mudança)
        const { count: analysesYesterday } = await supabaseAdmin
            .from('analysis_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('timestamp', startOfYesterday)
            .lt('timestamp', startOfDay);

        // Total do mês
        const { count: monthTotal } = await supabaseAdmin
            .from('analysis_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('timestamp', startOfMonth);

        // Análises com sucesso este mês
        const { count: successCount } = await supabaseAdmin
            .from('analysis_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('timestamp', startOfMonth)
            .eq('status', 'completed');

        // Créditos do usuário
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();

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
                credits: profile?.credits || 0,
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

        const { data: analyses, error, count } = await supabaseAdmin
            .from('analysis_logs')
            .select('id, file_name, analysis_type, status, created_at, company', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Erro ao buscar análises:', error);
            return res.status(500).json({ success: false, error: 'Erro ao buscar análises' });
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

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('credits, role')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Erro ao buscar créditos:', error);
            return res.status(500).json({ success: false, error: 'Erro ao buscar créditos' });
        }

        res.json({
            success: true,
            data: {
                credits: profile?.credits || 0,
                unlimited: profile?.role === 'master' || profile?.role === 'admin'
            }
        });
    } catch (error) {
        console.error('Erro ao buscar créditos do usuário:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar créditos' });
    }
};
