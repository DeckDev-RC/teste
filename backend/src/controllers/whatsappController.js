/**
 * Controller para endpoints WhatsApp/Evolution
 */
import evolutionService from '../services/evolutionService.js';
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

        const result = await evolutionService.createInstance(userId, instanceName);
        console.log('[WhatsApp Controller] Instance created:', result);
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
        console.log('[WhatsApp Controller] Fetching QR for:', instanceId);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d963620b-ce3a-4920-aa1b-776bfde69876', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'whatsappController.js:86', message: 'getQrCode controller called', data: { instanceId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        if (!instanceId) {
            return res.status(400).json({ success: false, error: 'Instance ID obrigatório' });
        }

        const result = await evolutionService.getQrCode(instanceId);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d963620b-ce3a-4920-aa1b-776bfde69876', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'whatsappController.js:94', message: 'Result from evolutionService', data: { success: result.success, hasData: !!result.data, hasQrcode: !!result.data?.qrcode, qrcodeLength: result.data?.qrcode?.length || 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion

        res.json(result);
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

        const result = await evolutionService.getConnectionStatus(instanceId);

        // Se a instância não existe, retorna erro mais amigável
        if (!result.success && result.error?.includes('does not exist')) {
            return res.status(404).json({ success: false, error: 'Instância não encontrada' });
        }

        // Auto-registra webhook quando conectar (apenas uma vez)
        if (result.success && result.data.status === 'connected' && !webhookRegistered.has(instanceId)) {
            const publicUrl = process.env.PUBLIC_BACKEND_URL;
            if (publicUrl) {
                const webhookUrl = `${publicUrl}/api/whatsapp/webhook`;
                try {
                    await evolutionService.configureWebhook(instanceId, webhookUrl);
                    webhookRegistered.add(instanceId);
                    console.log(`✅ Webhook registrado: ${webhookUrl}`);
                } catch (webhookError) {
                    console.warn('⚠️ Falha ao registrar webhook:', webhookError.message);
                }
            }
        }

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

        // Processa mensagens (upsert = nova, set = sync inicial, send = enviada por mim)
        const eventLower = event.toLowerCase();
        const isMessageEvent = eventLower === 'messages.upsert' ||
            eventLower === 'messages.set' ||
            eventLower === 'send.messages' ||
            eventLower === 'messages.update';

        if (isMessageEvent && data) {
            // messages.upsert tem data.message, messages.set pode ter data.messages[]
            const messages = event === 'messages.upsert'
                ? [data]
                : (data.messages || [data]);

            for (const msgData of messages) {
                const message = msgData.message || msgData;
                const key = msgData.key || {};

                // Log detalhado para debug
                console.log(`[WhatsApp DEBUG] Key:`, JSON.stringify(key));
                console.log(`[WhatsApp DEBUG] Message type:`, message ? Object.keys(message).join(', ') : 'undefined');

                // Verifica se tem mídia
                const hasMedia = message?.imageMessage || message?.documentMessage;

                if (hasMedia && supabaseAdmin) {
                    const remoteJid = key.remoteJid;

                    console.log(`[WhatsApp] Mensagem com mídia de: ${remoteJid}`);

                    const { data: monitoredGroup } = await supabaseAdmin
                        .from('monitored_groups')
                        .select('id, company')
                        .eq('group_jid', remoteJid)
                        .eq('active', true)
                        .single();

                    if (monitoredGroup) {
                        // Evita duplicatas
                        const { data: existing } = await supabaseAdmin
                            .from('processed_messages')
                            .select('id')
                            .eq('message_id', key.id)
                            .single();

                        if (!existing) {
                            await supabaseAdmin.from('processed_messages').insert({
                                group_id: monitoredGroup.id,
                                message_id: key.id,
                                sender_jid: key.participant || remoteJid,
                                file_type: message.imageMessage ? 'image' : 'document',
                                file_name: message.documentMessage?.fileName || 'image.jpg',
                                status: 'pending',
                            });

                            console.log(`[WhatsApp] ✅ Mensagem salva para processar: ${key.id}`);
                        }
                    } else {
                        console.log(`[WhatsApp] Grupo não monitorado: ${remoteJid}`);
                    }
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ success: false, error: 'Erro no webhook' });
    }
};
