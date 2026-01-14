/**
 * Serviço para comunicação com Evolution API
 * Gerencia instâncias WhatsApp, QR codes e grupos
 */
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

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${error}`);
    }

    return response.json();
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
                ...evolutionResponse,
            },
        };
    } catch (error) {
        console.error('Erro ao criar instância:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtém QR Code para conexão
 */
export async function getQrCode(instanceId) {
    try {
        const response = await evolutionFetch(`/instance/connect/${instanceId}`);

        return {
            success: true,
            data: {
                qrcode: response.base64 || response.qrcode,
                pairingCode: response.pairingCode,
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

        // Atualiza status no banco
        if (supabaseAdmin) {
            await supabaseAdmin
                .from('whatsapp_instances')
                .update({
                    status: response.state === 'open' ? 'connected' : 'disconnected',
                    updated_at: new Date().toISOString(),
                })
                .eq('instance_id', instanceId);
        }

        return {
            success: true,
            data: {
                status: response.state === 'open' ? 'connected' : 'disconnected',
                state: response.state,
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

/**
 * Baixa mídia de uma mensagem
 */
export async function downloadMedia(instanceId, messageKey) {
    try {
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
        await evolutionFetch(`/instance/logout/${instanceId}`, { method: 'DELETE' });
        await evolutionFetch(`/instance/delete/${instanceId}`, { method: 'DELETE' });

        // Remove do banco
        if (supabaseAdmin) {
            await supabaseAdmin
                .from('whatsapp_instances')
                .delete()
                .eq('instance_id', instanceId);
        }

        return { success: true };
    } catch (error) {
        console.error('Erro ao deletar instância:', error);
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
                    enabled: true,
                    url: webhookUrl,
                    webhookByEvents: false,
                    events: ['MESSAGES_UPSERT'],
                },
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
