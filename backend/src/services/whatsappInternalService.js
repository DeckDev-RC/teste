import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    downloadMediaMessage,
    initAuthCreds
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import QRCode from 'qrcode';
import '../config/env.js';

// Configuração do Supabase Admin para persistência
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const logger = pino({ level: 'silent' });

/**
 * Gerenciador de Autenticação Customizado para Supabase
 * Permite que as chaves de sessão sejam salvas no banco em vez de arquivos locais.
 */
async function useSupabaseAuthState(instanceId) {
    const writeData = async (data, id) => {
        try {
            const { error } = await supabaseAdmin
                .from('whatsapp_sessions')
                .upsert({
                    instance_id: `${instanceId}:${id}`,
                    data: JSON.parse(JSON.stringify(data, (key, value) => {
                        if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
                            return { _type: 'Buffer', _data: Buffer.from(value).toString('base64') };
                        }
                        return value;
                    }))
                });
            if (error) console.error(`❌ Erro ao salvar sessão (${id}):`, error.message);
        } catch (err) {
            console.error(`❌ Erro fatal ao salvar sessão (${id}):`, err.message);
        }
    };

    const readData = async (id) => {
        const { data, error } = await supabaseAdmin
            .from('whatsapp_sessions')
            .select('data')
            .eq('instance_id', `${instanceId}:${id}`)
            .single();

        if (error || !data) return null;

        return JSON.parse(JSON.stringify(data.data), (key, value) => {
            if (value && typeof value === 'object' && value._type === 'Buffer') {
                return new Uint8Array(Buffer.from(value._data, 'base64'));
            }
            return value;
        });
    };

    const removeData = async (id) => {
        await supabaseAdmin
            .from('whatsapp_sessions')
            .delete()
            .eq('instance_id', `${instanceId}:${id}`);
    };

    const creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: makeCacheableSignalKeyStore({
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                // value = proto.Message.AppStateSyncKeyData.fromObject(value)
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = data[type][id];
                            const storeId = `${type}-${id}`;
                            tasks.push(value ? writeData(value, storeId) : removeData(storeId));
                        }
                    }
                    await Promise.all(tasks);
                }
            }, logger)
        },
        saveCreds: () => writeData(creds, 'creds')
    };
}

class WhatsAppInternalService {
    constructor() {
        this.sessions = new Map(); // instanceId -> socket
        this.results = new Map();   // instanceId -> {qr, status}
    }

    async getOrCreateSession(instanceId) {
        if (this.sessions.has(instanceId)) {
            return this.sessions.get(instanceId);
        }

        console.log(`🚀 Iniciando sessão interna do WhatsApp: ${instanceId}`);
        const { state, saveCreds } = await useSupabaseAuthState(instanceId);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger,
            auth: state,
            printQRInTerminal: false,
            mobile: false,
            browser: ['Leitor de Docs', 'Chrome', '1.0.0']
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(`📱 Novo QR Code gerado para: ${instanceId}`);
                QRCode.toDataURL(qr).then(url => {
                    this.results.set(instanceId, { ...this.results.get(instanceId), qr: url });
                }).catch(err => {
                    console.error('❌ Erro ao gerar DataURL do QR:', err);
                });
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Conexão fechada devido a ', lastDisconnect.error, ', reconectando: ', shouldReconnect);

                // Atualiza status no banco
                supabaseAdmin.from('whatsapp_instances').update({ status: 'disconnected', updated_at: new Date().toISOString() }).eq('instance_id', instanceId).then();

                if (shouldReconnect) {
                    console.log(`🔄 Tentando reconectar instância ${instanceId} em 5 segundos...`);
                    this.sessions.delete(instanceId);
                    setTimeout(() => {
                        this.getOrCreateSession(instanceId);
                    }, 5000);
                } else {
                    console.log('🔴 Conexão encerrada permanentemente (Logout)');
                    this.results.set(instanceId, { status: 'disconnected', qr: null });
                    this.sessions.delete(instanceId);
                }
            } else if (connection === 'open') {
                console.log('✅ Conexão aberta com sucesso!');
                this.results.set(instanceId, { status: 'connected', qr: null });

                // Atualiza status no banco
                supabaseAdmin.from('whatsapp_instances').update({ status: 'connected', updated_at: new Date().toISOString() }).eq('instance_id', instanceId).then();
            } else if (qr) {
                // Atualiza status no banco para visualização do QR
                supabaseAdmin.from('whatsapp_instances').update({ status: 'connecting', updated_at: new Date().toISOString() }).eq('instance_id', instanceId).then();
            }
        });

        // Handler de mensagens em tempo real
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe) {
                        try {
                            await this.handleIncomingMessage(instanceId, msg);
                        } catch (err) {
                            console.error(`[WhatsApp Internal] Erro ao processar mensagem:`, err);
                        }
                    }
                }
            }
        });

        this.sessions.set(instanceId, sock);
        return sock;
    }

    async handleIncomingMessage(instanceId, msgData) {
        const message = msgData.message;
        if (!message) return;

        const key = msgData.key;
        const remoteJid = key.remoteJid;

        // Verifica se tem mídia
        const hasMedia = message.imageMessage || message.documentMessage;

        if (hasMedia) {
            console.log(`[WhatsApp Internal] 📸 Mídia detectada de ${remoteJid} na instânia ${instanceId}`);

            // Busca o grupo no banco
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
                        message_key: key,
                        message_content: message, // Salva o conteúdo para descriptografia posterior
                        sender_jid: key.participant || remoteJid,
                        file_type: message.imageMessage ? 'image' : 'document',
                        file_name: message.documentMessage?.fileName || (message.imageMessage ? 'image.jpg' : 'document'),
                        status: 'pending',
                    });

                    console.log(`[WhatsApp Internal] ✅ Mensagem salva para processar: ${key.id}`);
                }
            }
        }
    }

    async getStatus(instanceId) {
        return this.results.get(instanceId) || { status: 'disconnected', qr: null };
    }

    async getSocket(instanceId) {
        return this.sessions.get(instanceId);
    }

    async downloadMedia(instanceId, messageKey, messageContent) {
        const sock = await this.getOrCreateSession(instanceId);
        if (!sock) throw new Error('Instância não disponível');

        // Reconstrói o objeto de mensagem padrão do Baileys
        const msg = {
            key: messageKey,
            message: messageContent
        };

        try {
            const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                    logger,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            const mimetype = msg.message?.imageMessage?.mimetype || msg.message?.documentMessage?.mimetype || 'application/octet-stream';

            return {
                success: true,
                data: {
                    base64: buffer.toString('base64'),
                    mimetype
                }
            };
        } catch (error) {
            console.error('[WhatsApp Internal] Erro no download:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteInstance(instanceId) {
        const sock = this.sessions.get(instanceId);
        if (sock) {
            await sock.logout();
            this.sessions.delete(instanceId);
        }
        this.results.delete(instanceId);

        // Limpa chaves no banco
        await supabaseAdmin
            .from('whatsapp_sessions')
            .delete()
            .ilike('instance_id', `${instanceId}:%`);
    }

    async initializeAllSessions() {
        if (!supabaseAdmin) return;

        console.log('🔄 Inicializando todas as sessões ativas do WhatsApp...');
        const { data: instances, error } = await supabaseAdmin
            .from('whatsapp_instances')
            .select('instance_id');

        if (error) {
            console.error('❌ Erro ao buscar instâncias para inicialização:', error.message);
            return;
        }

        for (const instance of instances) {
            try {
                await this.getOrCreateSession(instance.instance_id);
            } catch (err) {
                console.error(`❌ Falha ao restaurar sessão ${instance.instance_id}:`, err.message);
            }
        }
    }
}

export default new WhatsAppInternalService();
