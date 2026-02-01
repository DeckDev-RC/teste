import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Listar todos os padrões de renomeação
 */
export const getAllNamingPatterns = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('naming_patterns')
            .select('*')
            .order('name');

        if (error) throw error;

        res.json({
            success: true,
            data: { patterns: data }
        });
    } catch (error) {
        console.error('Erro ao listar padrões:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar padrões' });
    }
};

/**
 * Criar um novo padrão
 */
export const createNamingPattern = async (req, res) => {
    try {
        const { name, pattern, description } = req.body;

        if (!name || !pattern) {
            return res.status(400).json({ success: false, error: 'Nome e Padrão são obrigatórios' });
        }

        const { data, error } = await supabase
            .from('naming_patterns')
            .insert([{ name, pattern, description }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Padrão criado com sucesso',
            data
        });
    } catch (error) {
        console.error('Erro ao criar padrão:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Atualizar um padrão
 */
export const updateNamingPattern = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('naming_patterns')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Padrão atualizado com sucesso',
            data
        });
    } catch (error) {
        console.error('Erro ao atualizar padrão:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Deletar um padrão
 */
export const deleteNamingPattern = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('naming_patterns')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Padrão removido com sucesso'
        });
    } catch (error) {
        console.error('Erro ao remover padrão:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
