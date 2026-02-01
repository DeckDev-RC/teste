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
        const { data, error } = await supabase
            .from('companies')
            .select('*, naming_patterns(pattern)')
            .order('name');

        if (error) throw error;

        // Achata a estrutura do join para facilitar o uso no frontend
        const companies = data.map(company => ({
            ...company,
            naming_pattern: company.naming_patterns?.pattern || null
        }));

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
        const { id, name, icon, financial_receipt_prompt, financial_payment_prompt, naming_pattern_id } = req.body;

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
                financial_payment_prompt,
                naming_pattern_id
            }])
            .select()
            .single();

        if (error) throw error;

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
        const updates = req.body;

        const { data, error } = await supabase
            .from('companies')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

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
