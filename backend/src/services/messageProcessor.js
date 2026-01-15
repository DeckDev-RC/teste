import { createClient } from '@supabase/supabase-js';
import AIServiceFactory from './AIServiceFactory.js';
import whatsappInternalService from './whatsappInternalService.js';
import googleDriveService from './googleDriveService.js';
import '../config/env.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Classe simples para controle de concorrência
class ConcurrencyQueue {
    constructor(concurrency = 3) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    add(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.processNext();
        });
    }

    processNext() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;

        this.running++;
        const { fn, resolve, reject } = this.queue.shift();

        fn().then(resolve).catch(reject).finally(() => {
            this.running--;
            this.processNext();
        });
    }
}

class MessageProcessor {
    constructor() {
        this.queue = new ConcurrencyQueue(3); // Processa máx 3 mensagens simultaneamente
        this.intervalId = null;
        this.realtimeChannel = null;
    }

    start() {
        console.log('🚀 Message Processor: Iniciando modo Realtime + Fallback');

        // 1. Configura Realtime para escutar novas mensagens instantaneamente
        this.setupRealtime();

        // 2. Fallback: Polling lento (5 min) para garantir que nada ficou para trás
        this.intervalId = setInterval(() => this.processPendingMessages(), 5 * 60 * 1000);

        // 3. Processa qualquer coisa que já esteja pendente ao iniciar
        this.processPendingMessages();
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.realtimeChannel) supabaseAdmin.removeChannel(this.realtimeChannel);
        console.log('🛑 Message Processor: Parado');
    }

    setupRealtime() {
        if (!supabaseAdmin) return;

        this.realtimeChannel = supabaseAdmin.channel('processed_messages_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'processed_messages', filter: 'status=eq.pending' },
                async (payload) => {
                    console.log('⚡ Evento Realtime recebido! Nova mensagem:', payload.new.id);
                    // Adiciona à fila com um pequeno delay para garantir que transações do BD terminaram
                    setTimeout(() => {
                        this.queueMessage(payload.new.id);
                    }, 500);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Message Processor: Conectado ao Realtime do Supabase');
                }
            });
    }

    // Busca a mensagem completa no banco e coloca na fila
    async queueMessage(id) {
        const { data: msg, error } = await supabaseAdmin
            .from('processed_messages')
            .select(`
                *,
                monitored_groups (
                    id,
                    company,
                    instance_id,
                    whatsapp_instances (
                        user_id,
                        instance_id
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (msg) {
            this.queue.add(() => this.processMessage(msg));
        } else if (error) {
            console.error(`❌ Erro ao buscar detalhes da mensagem ${id}:`, error.message);
        }
    }

    // Processa lote pendente (usado na inicialização e fallback)
    async processPendingMessages() {
        if (!supabaseAdmin) return;

        try {
            const { data: messages, error } = await supabaseAdmin
                .from('processed_messages')
                .select('id')
                .eq('status', 'pending')
                .limit(50); // Pega até 50 IDs para enfileirar

            if (error) throw error;

            if (messages?.length > 0) {
                console.log(`📥 Enfileirando ${messages.length} mensagens pendentes...`);
                for (const msg of messages) {
                    this.queueMessage(msg.id);
                }
            }
        } catch (error) {
            console.error('❌ Erro no fallback polling:', error.message);
        }
    }

    async processMessage(msg) {
        try {
            console.log(`🔄 Processando mensagem ${msg.id} (${msg.type || msg.file_type})...`);

            // Verificação de segurança: status já mudou?
            if (msg.status !== 'pending') return;

            // Atualiza status para processing
            await supabaseAdmin
                .from('processed_messages')
                .update({ status: 'processing', updated_at: new Date().toISOString() })
                .eq('id', msg.id);

            // 2. Extrai dados da instância e usuário
            const instanceData = msg.monitored_groups?.whatsapp_instances;

            if (!instanceData || !instanceData.instance_id) {
                throw new Error(`Instância WhatsApp não encontrada para a mensagem ${msg.id}`);
            }

            const userId = instanceData.user_id;
            const instanceId = instanceData.instance_id;

            // 3. Baixa a mídia usando Serviço Interno (Baileys)
            const mediaResult = await whatsappInternalService.downloadMedia(
                instanceId,
                msg.message_key,
                msg.message_content
            );

            if (!mediaResult.success) {
                // Se falhar o download (mídia expirada/inválida), marcamos como falha e abortamos
                throw new Error(`Erro ao baixar mídia: ${mediaResult.error}`);
            }

            // 4. Envia para IA (Gemini)
            const aiService = AIServiceFactory.getService('gemini'); // Usa Gemini por padrão para análise visual

            // Prompt padrão para análise
            const prompt = `Analise este documento/imagem enviado via WhatsApp. 
            Identifique o tipo de documento, extraia as informações principais (datas, valores, CNPJs, nomes) 
            e forneça um resumo conciso. 
            Se for uma nota fiscal ou boleto, extraia os dados para pagamento.`;

            // Realiza a análise (passando base64 direto, pois o GeminiService espera base64)
            const analysisResult = await aiService.analyzeImage(prompt, mediaResult.data.base64, mediaResult.data.mimetype);

            // 5. Upload para o Google Drive
            let driveUrl = null;
            try {
                const uploadResult = await googleDriveService.uploadFile(
                    mediaResult.data.base64,
                    msg.file_name || `whatsapp_${Date.now()}`,
                    mediaResult.data.mimetype
                );

                if (uploadResult.success) {
                    driveUrl = uploadResult.webViewLink;
                    console.log(`☁️ Arquivo salvo no Google Drive: ${driveUrl}`);
                }
            } catch (driveError) {
                console.warn(`⚠️ Falha no upload para Drive (Mensagem ${msg.id}):`, driveError.message);
                // Não trava o processamento se falhar o drive, mas logamos
            }

            // 6. Salva resultado da análise no banco
            const { data: analysisData, error: analysisError } = await supabaseAdmin
                .from('analysis_results')
                .insert({
                    user_id: userId,
                    file_name: msg.file_name,
                    file_type: mediaResult.data.mimetype,
                    analysis_json: typeof analysisResult === 'string' ? { text: analysisResult } : analysisResult,
                    status: 'completed'
                })
                .select()
                .single();

            if (analysisError) throw analysisError;

            // 7. Finaliza processamento da mensagem com URL do Drive
            await supabaseAdmin
                .from('processed_messages')
                .update({
                    status: 'completed',
                    analysis_result_id: analysisData.id,
                    drive_url: driveUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id);

            console.log(`✅ Mensagem ${msg.id} processada com sucesso!`);

        } catch (error) {
            console.error(`❌ Falha ao processar mensagem ${msg.id}:`, error);

            await supabaseAdmin
                .from('processed_messages')
                .update({
                    status: 'failed',
                    error_message: error.message,
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id);
        }
    }
}

export default new MessageProcessor();
