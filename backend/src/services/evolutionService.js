/**
 * Serviço para comunicação com Evolution API
 * Gerencia instâncias WhatsApp, QR codes e grupos
 */
import '../config/env.js';
import { createClient } from '@supabase/supabase-js';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

/**
 * Helper para fazer requisições à Evolution API
 */
async function evolutionFetch(endpoint, options = {}) {
    const url = `${EVOLUTION_API_URL}${endpoint}`;

    console.log(`[Evolution API] Request to: ${url}`);

    // Adiciona timeout de 30 segundos para evitar ECONNRESET
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY,
                ...options.headers,
            },
        });

        clearTimeout(timeout);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d963620b-ce3a-4920-aa1b-776bfde69876', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'evolutionService.js:22', message: 'Evolution API response status', data: { endpoint, status: response.status, ok: response.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
        // #endregion

        if (!response.ok) {
            const error = await response.text();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d963620b-ce3a-4920-aa1b-776bfde69876', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'evolutionService.js:32', message: 'Evolution API error response', data: { endpoint, status: response.status, errorText: error.substring(0, 200) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
            // #endregion
            throw new Error(`Evolution API error: ${response.status} - ${error}`);
        }

        const jsonData = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d963620b-ce3a-4920-aa1b-776bfde69876', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'evolutionService.js:36', message: 'Evolution API JSON parsed', data: { endpoint, responseKeys: Object.keys(jsonData), responseSample: JSON.stringify(jsonData).substring(0, 300) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
        return jsonData;
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            console.error(`[Evolution API] Request timeout: ${url}`);
            throw new Error('Request to Evolution API timed out after 30 seconds');
        }
        throw error;
    }
}

/**
 * Cria uma nova instância WhatsApp para o usuário
 */
export async function createInstance(userId, instanceName) {
    try {
        // Gera um ID único para a instância
        const instanceId = `user_${userId.substring(0, 8)}_${Date.now()}`;

        // Cria instância na Evolution API
        const evolutionResponse = await evolutionFetch('/instance/create', {
            method: 'POST',
            body: JSON.stringify({
                instanceName: instanceId,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
            }),
        });

        // Salva no banco de dados
        if (supabaseAdmin) {
            await supabaseAdmin.from('whatsapp_instances').insert({
                user_id: userId,
                instance_name: instanceName,
                instance_id: instanceId,
                status: 'connecting',
            });
        }

        return {
            success: true,
            data: {
                instance_id: instanceId,
                instance_name: instanceName,
                status: 'connecting',
            },
        };
    } catch (error) {
        console.error('Erro ao criar instância:', error);
        return { success: false, error: error.message };
    }
}

export async function getQrCode(instanceId) {
    try {
        // O endpoint /instance/connect retorna os dados de conexão, incluindo o QR code
        const response = await evolutionFetch(`/instance/connect/${instanceId}`);

        // A resposta pode estar em diferentes formatos em diferentes versões da API
        let extractedQrCode = null;

        // Tenta extrair de vários locais possíveis
        if (response.base64) extractedQrCode = response.base64;
        else if (response.qrcode?.base64) extractedQrCode = response.qrcode.base64;
        else if (response.code?.base64) extractedQrCode = response.code.base64;
        else if (response.data?.qrcode) extractedQrCode = response.data.qrcode;
        else if (response.data?.base64) extractedQrCode = response.data.base64;
        else if (response.qrcode) extractedQrCode = typeof response.qrcode === 'string' ? response.qrcode : response.qrcode.base64 || response.qrcode.qrcode;
        else if (response.code) extractedQrCode = typeof response.code === 'string' ? response.code : response.code.base64 || response.code.qrcode;

        return {
            success: true,
            data: {
                qrcode: extractedQrCode,
                pairingCode: response.pairingCode || response.code?.pairingCode || response.qrcode?.pairingCode || response.data?.pairingCode,
            },
        };
    } catch (error) {
        console.error('Erro ao obter QR code:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verifica status da conexão
 */
export async function getConnectionStatus(instanceId) {
    try {
        const response = await evolutionFetch(`/instance/connectionState/${instanceId}`);
        console.log(`[DEBUG] Connection State for ${instanceId}:`, JSON.stringify(response, null, 2));

        // Fix: Evolution v2 pode retornar { instance: { state: 'open' } } ou { state: 'open' }
        const state = response.instance?.state || response.state;

        // Atualiza status no banco
        if (supabaseAdmin) {
            await supabaseAdmin
                .from('whatsapp_instances')
                .update({
                    status: state === 'open' ? 'connected' : 'disconnected',
                    updated_at: new Date().toISOString(),
                })
                .eq('instance_id', instanceId);
        }

        return {
            success: true,
            data: {
                status: state === 'open' ? 'connected' : 'disconnected',
                state: state,
            },
        };
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Lista grupos do WhatsApp
 */
export async function fetchGroups(instanceId) {
    try {
        const response = await evolutionFetch(`/group/fetchAllGroups/${instanceId}?getParticipants=false`);

        return {
            success: true,
            data: {
                groups: response.map(group => ({
                    jid: group.id,
                    name: group.subject || group.name,
                    participants: group.size || 0,
                })),
            },
        };
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        return { success: false, error: error.message };
    }
}

export async function downloadMedia(instanceId, messageKey) {
    try {
        console.log(`[WhatsApp DEBUG] Baixando mídia para instância ${instanceId}. Chave:`, JSON.stringify(messageKey));

        const response = await evolutionFetch(`/chat/getBase64FromMediaMessage/${instanceId}`, {
            method: 'POST',
            body: JSON.stringify({ message: messageKey }),
        });

        return {
            success: true,
            data: {
                base64: response.base64,
                mimetype: response.mimetype,
            },
        };
    } catch (error) {
        console.error('Erro ao baixar mídia:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Desconecta e remove instância
 */
export async function deleteInstance(instanceId) {
    try {
        // Tenta desconectar e remover na API, mas ignora erros se já não existir
        try {
            await evolutionFetch(`/instance/logout/${instanceId}`, { method: 'DELETE' });
        } catch (e) { console.warn('Logout warning:', e.message); }

        try {
            await evolutionFetch(`/instance/delete/${instanceId}`, { method: 'DELETE' });
        } catch (e) { console.warn('Delete warning:', e.message); }

        // Remove do banco SEMPRE
        if (supabaseAdmin) {
            await supabaseAdmin
                .from('whatsapp_instances')
                .delete()
                .eq('instance_id', instanceId);
        }

        return { success: true };
    } catch (error) {
        console.error('Erro ao remover instância:', error);
        return { success: false, error: error.message };
    }
}



/**
 * Configura webhook para receber mensagens
 */
export async function configureWebhook(instanceId, webhookUrl) {
    try {
        await evolutionFetch(`/webhook/set/${instanceId}`, {
            method: 'POST',
            body: JSON.stringify({
                webhook: {
                    url: webhookUrl,
                    enabled: true,
                    webhookByEvents: false,
                    events: [
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'MESSAGES_SET',
                        'SEND_MESSAGES',
                        'CHATS_UPDATE',
                        'CHATS_SET'
                    ]
                }
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('Erro ao configurar webhook:', error);
        return { success: false, error: error.message };
    }
}

export default {
    createInstance,
    getQrCode,
    getConnectionStatus,
    fetchGroups,
    downloadMedia,
    deleteInstance,
    configureWebhook,
};
