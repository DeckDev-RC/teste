/**
 * Controller para endpoints WhatsApp/Evolution
 */
import evolutionService from '../services/evolutionService.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

/**
 * POST /api/whatsapp/instance - Criar nova instância
 */
export const createInstance = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autenticado' });
        }

        const { instanceName } = req.body;
        if (!instanceName) {
            return res.status(400).json({ success: false, error: 'Nome da instância é obrigatório' });
        }

        // Verificar se usuário já tem instância ativa
        if (supabaseAdmin) {
            const { data: existing } = await supabaseAdmin
                .from('whatsapp_instances')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Você já possui uma instância WhatsApp ativa'
                });
            }
        }

        const result = await evolutionService.createInstance(userId, instanceName);
        if (result.success) {
            res.json({ success: true, data: { instance: result.data } });
        } else {
            res.json(result);
        }
    } catch (error) {
        console.error('Erro ao criar instância:', error);
        res.status(500).json({ success: false, error: 'Erro ao criar instância' });
    }
};

/**
 * GET /api/whatsapp/instance - Obter instância do usuário
 */
export const getInstance = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId || !supabaseAdmin) {
            return res.status(401).json({ success: false, error: 'Não autenticado' });
        }

        const { data: instance, error } = await supabaseAdmin
            .from('whatsapp_instances')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        res.json({ success: true, data: { instance } });
    } catch (error) {
        console.error('Erro ao buscar instância:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar instância' });
    }
};

/**
 * GET /api/whatsapp/qrcode/:instanceId - Obter QR Code
 */
export const getQrCode = async (req, res) => {
    try {
        const { instanceId } = req.params;
        if (!instanceId) {
            return res.status(400).json({ success: false, error: 'Instance ID obrigatório' });
        }

        const result = await evolutionService.getQrCode(instanceId);
        res.json(result);
    } catch (error) {
        console.error('Erro ao obter QR code:', error);
        res.status(500).json({ success: false, error: 'Erro ao obter QR code' });
    }
};

/**
 * GET /api/whatsapp/status/:instanceId - Status da conexão
 */
export const getStatus = async (req, res) => {
    try {
        const { instanceId } = req.params;
        if (!instanceId) {
            return res.status(400).json({ success: false, error: 'Instance ID obrigatório' });
        }

        const result = await evolutionService.getConnectionStatus(instanceId);
        res.json(result);
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        res.status(500).json({ success: false, error: 'Erro ao verificar status' });
    }
};

/**
 * GET /api/whatsapp/groups/:instanceId - Listar grupos
 */
export const getGroups = async (req, res) => {
    try {
        const { instanceId } = req.params;
        if (!instanceId) {
            return res.status(400).json({ success: false, error: 'Instance ID obrigatório' });
        }

        const result = await evolutionService.fetchGroups(instanceId);
        res.json(result);
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar grupos' });
    }
};

/**
 * POST /api/whatsapp/groups/monitor - Ativar/desativar monitoramento
 */
export const toggleGroupMonitor = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId || !supabaseAdmin) {
            return res.status(401).json({ success: false, error: 'Não autenticado' });
        }

        const { instanceId, groupJid, groupName, active, company } = req.body;

        if (!instanceId || !groupJid) {
            return res.status(400).json({ success: false, error: 'Dados incompletos' });
        }

        // Verificar se instância pertence ao usuário
        const { data: instance } = await supabaseAdmin
            .from('whatsapp_instances')
            .select('id')
            .eq('instance_id', instanceId)
            .eq('user_id', userId)
            .single();

        if (!instance) {
            return res.status(403).json({ success: false, error: 'Instância não encontrada' });
        }

        if (active) {
            // Ativar monitoramento
            await supabaseAdmin.from('monitored_groups').upsert({
                instance_id: instance.id,
                group_jid: groupJid,
                group_name: groupName,
                company: company || 'default',
                active: true,
            }, { onConflict: 'group_jid' });
        } else {
            // Desativar monitoramento
            await supabaseAdmin
                .from('monitored_groups')
                .update({ active: false })
                .eq('instance_id', instance.id)
                .eq('group_jid', groupJid);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao configurar monitoramento:', error);
        res.status(500).json({ success: false, error: 'Erro ao configurar monitoramento' });
    }
};

/**
 * GET /api/whatsapp/monitored-groups - Grupos monitorados do usuário
 */
export const getMonitoredGroups = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId || !supabaseAdmin) {
            return res.status(401).json({ success: false, error: 'Não autenticado' });
        }

        const { data: groups, error } = await supabaseAdmin
            .from('monitored_groups')
            .select(`
                *,
                whatsapp_instances!inner(user_id)
            `)
            .eq('whatsapp_instances.user_id', userId)
            .eq('active', true);

        if (error) throw error;

        res.json({ success: true, data: { groups } });
    } catch (error) {
        console.error('Erro ao buscar grupos monitorados:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar grupos' });
    }
};

/**
 * DELETE /api/whatsapp/instance/:instanceId - Remover instância
 */
export const deleteInstance = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { instanceId } = req.params;

        if (!userId || !supabaseAdmin) {
            return res.status(401).json({ success: false, error: 'Não autenticado' });
        }

        // Verificar se pertence ao usuário
        const { data: instance } = await supabaseAdmin
            .from('whatsapp_instances')
            .select('id')
            .eq('instance_id', instanceId)
            .eq('user_id', userId)
            .single();

        if (!instance) {
            return res.status(403).json({ success: false, error: 'Instância não encontrada' });
        }

        const result = await evolutionService.deleteInstance(instanceId);
        res.json(result);
    } catch (error) {
        console.error('Erro ao deletar instância:', error);
        res.status(500).json({ success: false, error: 'Erro ao deletar instância' });
    }
};

/**
 * POST /api/whatsapp/webhook - Webhook para receber mensagens do Evolution
 */
export const handleWebhook = async (req, res) => {
    try {
        const { event, instance, data } = req.body;

        console.log(`[WhatsApp Webhook] ${event} from ${instance}`);

        // Processa apenas mensagens com mídia
        if (event === 'messages.upsert' && data?.message) {
            const message = data.message;
            const hasMedia = message.imageMessage || message.documentMessage;

            if (hasMedia && supabaseAdmin) {
                // Verificar se é de um grupo monitorado
                const remoteJid = data.key?.remoteJid;

                const { data: monitoredGroup } = await supabaseAdmin
                    .from('monitored_groups')
                    .select('id, company')
                    .eq('group_jid', remoteJid)
                    .eq('active', true)
                    .single();

                if (monitoredGroup) {
                    // Salva mensagem para processamento
                    await supabaseAdmin.from('processed_messages').insert({
                        group_id: monitoredGroup.id,
                        message_id: data.key?.id,
                        sender_jid: data.key?.participant || remoteJid,
                        file_type: message.imageMessage ? 'image' : 'document',
                        file_name: message.documentMessage?.fileName || 'image.jpg',
                        status: 'pending',
                    });

                    console.log(`[WhatsApp] Nova mensagem para processar: ${data.key?.id}`);
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ success: false, error: 'Erro no webhook' });
    }
};
