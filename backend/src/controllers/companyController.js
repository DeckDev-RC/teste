import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Usamos a service key para operações administrativas se necessário, 
// ou o cliente normal se as políticas de RLS estiverem corretas.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Lista todas as empresas (Visão Admin)
 */
export const getAllCompanies = async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'master' || req.user?.role === 'admin';
        const allowed = req.user?.allowed_companies;

        let query = supabase
            .from('companies')
            .select(`
                *,
                company_naming_patterns(
                    priority,
                    naming_patterns(id, name, pattern)
                )
            `);

        // SE não for admin e tiver lista de permitidas, filtra
        if (!isAdmin && allowed && Array.isArray(allowed)) {
            query = query.in('id', allowed);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;

        // Achata a estrutura para manter compatibilidade e facilitar uso
        const companies = data.map(company => {
            const associatedPatterns = company.company_naming_patterns
                ?.sort((a, b) => (a.priority || 0) - (b.priority || 0))
                .map(p => ({
                    id: p.naming_patterns?.id,
                    name: p.naming_patterns?.name,
                    pattern: p.naming_patterns?.pattern,
                    priority: p.priority
                })) || [];

            return {
                ...company,
                naming_patterns: associatedPatterns,
                // Mantém naming_pattern_id original para compatibilidade temporária se necessário
                // ou simplesmente o primeiro/principal padrão
                naming_pattern: associatedPatterns[0]?.pattern || null,
                // Flags indicando quais prompts estão configurados
                hasReceiptPrompt: !!(company.financial_receipt_prompt && company.financial_receipt_prompt.trim()),
                hasPaymentPrompt: !!(company.financial_payment_prompt && company.financial_payment_prompt.trim())
            };
        });

        res.json({
            success: true,
            data: { companies }
        });
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar empresas' });
    }
};

/**
 * Cria uma nova empresa
 */
export const createCompany = async (req, res) => {
    try {
        const { id, name, icon, financial_receipt_prompt, financial_payment_prompt, naming_pattern_ids } = req.body;

        if (!id || !name) {
            return res.status(400).json({ success: false, error: 'ID e Nome são obrigatórios' });
        }

        const { data, error } = await supabase
            .from('companies')
            .insert([{
                id,
                name,
                icon,
                financial_receipt_prompt,
                financial_payment_prompt
            }])
            .select()
            .single();

        if (error) throw error;

        // Se houver padrões, criar associações
        if (naming_pattern_ids && Array.isArray(naming_pattern_ids)) {
            const associations = naming_pattern_ids.map((patternId, index) => ({
                company_id: id,
                naming_pattern_id: patternId,
                priority: index
            }));

            const { error: assocError } = await supabase
                .from('company_naming_patterns')
                .insert(associations);

            if (assocError) console.error('Erro ao associar padrões na criação:', assocError);
        }

        res.status(201).json({
            success: true,
            message: 'Empresa criada com sucesso',
            data: data
        });
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Atualiza uma empresa existente
 */
export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { naming_pattern_ids, ...upgrades } = req.body;

        const { data, error } = await supabase
            .from('companies')
            .update(upgrades)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Atualizar associações de padrões se fornecido
        if (naming_pattern_ids && Array.isArray(naming_pattern_ids)) {
            // Remove associações antigas
            await supabase
                .from('company_naming_patterns')
                .delete()
                .eq('company_id', id);

            // Insere novas
            if (naming_pattern_ids.length > 0) {
                const associations = naming_pattern_ids.map((patternId, index) => ({
                    company_id: id,
                    naming_pattern_id: patternId,
                    priority: index
                }));

                const { error: assocError } = await supabase
                    .from('company_naming_patterns')
                    .insert(associations);

                if (assocError) throw assocError;
            }
        }

        res.json({
            success: true,
            message: 'Empresa atualizada com sucesso',
            data: data
        });
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Remove uma empresa
 */
export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Empresa removida com sucesso'
        });
    } catch (error) {
        console.error('Erro ao remover empresa:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
