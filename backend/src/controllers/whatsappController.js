/**
 * Controller para endpoints WhatsApp Interno (Baileys)
 */
import whatsappInternalService from '../services/whatsappInternalService.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Cache para evitar registrar webhook toda vez que checar status
const webhookRegistered = new Set();

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

        const instanceId = `user_${userId.substring(0, 8)}_${Date.now()}`;

        // Salva metadados da instância no banco
        if (supabaseAdmin) {
            await supabaseAdmin.from('whatsapp_instances').insert({
                user_id: userId,
                instance_name: instanceName,
                instance_id: instanceId,
                status: 'connecting',
            });
        }

        const result = await whatsappInternalService.getOrCreateSession(instanceId);

        if (result) {
            res.json({ success: true, data: { instance: { instance_id: instanceId, instance_name: instanceName, status: 'connecting' } } });
        } else {
            res.status(500).json({ success: false, error: 'Falha ao iniciar instância' });
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
        console.log('[WhatsApp Controller] Fetching QR for:', instanceId);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d963620b-ce3a-4920-aa1b-776bfde69876', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'whatsappController.js:86', message: 'getQrCode controller called', data: { instanceId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        if (!instanceId) {
            return res.status(400).json({ success: false, error: 'Instance ID obrigatório' });
        }

        const result = await whatsappInternalService.getStatus(instanceId);

        if (result.qr) {
            res.json({ success: true, data: { qrcode: result.qr } });
        } else {
            res.json({ success: true, data: { qrcode: null, status: result.status } });
        }
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d963620b-ce3a-4920-aa1b-776bfde69876', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'whatsappController.js:97', message: 'Error in controller', data: { errorMessage: error.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
        // #endregion
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

        const status = await whatsappInternalService.getStatus(instanceId);
        res.json({ success: true, data: status });
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

        const sock = await whatsappInternalService.getSocket(instanceId);
        if (!sock) {
            return res.json({ success: true, data: [] });
        }

        // No Baileys, os grupos estão no store ou podem ser buscados
        const groups = await sock.groupFetchAllParticipating();
        const formattedGroups = Object.values(groups).map(g => ({
            jid: g.id,
            name: g.subject
        }));

        res.json({ success: true, data: formattedGroups });
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
            const { error: upsertError } = await supabaseAdmin.from('monitored_groups').upsert({
                instance_id: instance.id,
                group_jid: groupJid,
                group_name: groupName,
                company: company || 'default',
                active: true,
            }, { onConflict: 'instance_id,group_jid' });

            if (upsertError) {
                console.error('[WhatsApp] Erro ao salvar grupo:', upsertError);
                throw upsertError;
            }
            console.log(`[WhatsApp] ✅ Grupo monitorado salvo: ${groupName}`);
        } else {
            // Desativar monitoramento
            await supabaseAdmin
                .from('monitored_groups')
                .update({ active: false })
                .eq('instance_id', instance.id)
                .eq('group_jid', groupJid);
            console.log(`[WhatsApp] ❌ Grupo removido do monitoramento: ${groupName}`);
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

        await whatsappInternalService.deleteInstance(instanceId);

        if (supabaseAdmin) {
            await supabaseAdmin.from('whatsapp_instances').delete().eq('instance_id', instanceId);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar instância:', error);
        res.status(500).json({ success: false, error: 'Erro ao deletar instância' });
    }
};

/**
 * POST /api/whatsapp/webhook - Webhook para receber mensagens do Evolution
 */
export const handleWebhook = async (req, res) => {
    // Webhook desativado - o processamento agora é interno via socket
    res.json({ success: true, message: 'Webhooks are handled internally now.' });
};
