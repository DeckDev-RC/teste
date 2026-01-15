import { createClient } from '@supabase/supabase-js';
import AIServiceFactory from './AIServiceFactory.js';
import { downloadMedia } from './evolutionService.js';
import googleDriveService from './googleDriveService.js';
import '../config/env.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

class MessageProcessor {
    constructor() {
        this.isProcessing = false;
        this.intervalId = null;
        this.POLL_INTERVAL = 10000; // 10 segundos
    }

    start() {
        console.log('🚀 Message Processor iniciado (Polling a cada 10s)');
        this.intervalId = setInterval(() => this.processQueue(), this.POLL_INTERVAL);
        this.processQueue(); // Executa imediatamente ao iniciar
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 Message Processor parado');
        }
    }

    async processQueue() {
        if (this.isProcessing || !supabaseAdmin) return;
        this.isProcessing = true;

        try {
            // 1. Busca mensagens pendentes
            const { data: messages, error } = await supabaseAdmin
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
                .eq('status', 'pending')
                .limit(5); // Processa em lotes pequenos

            if (error) throw error;
            if (!messages || messages.length === 0) {
                this.isProcessing = false;
                return;
            }

            console.log(`📥 Processando ${messages.length} mensagens pendentes...`);

            for (const msg of messages) {
                await this.processMessage(msg);
            }

        } catch (error) {
            console.error('❌ Erro no processamento da fila:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async processMessage(msg) {
        try {
            console.log(`🔄 Processando mensagem ${msg.id} (${msg.file_type})...`);

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

            // 3. Baixa a mídia usando Evolution API
            // Nota: message_id no banco é o ID da mensagem no WhatsApp
            const mediaResult = await downloadMedia(instanceId, msg.message_id);

            if (!mediaResult.success) {
                throw new Error(`Erro ao baixar mídia: ${mediaResult.error}`);
            }

            // 4. Envia para IA (Gemini)
            const aiService = AIServiceFactory.getService('gemini'); // Usa Gemini por padrão para análise visual

            // Prepara o buffer a partir do base64
            const mediaBuffer = Buffer.from(mediaResult.data.base64, 'base64');

            // Prompt padrão para análise
            const prompt = `Analise este documento/imagem enviado via WhatsApp. 
            Identifique o tipo de documento, extraia as informações principais (datas, valores, CNPJs, nomes) 
            e forneça um resumo conciso. 
            Se for uma nota fiscal ou boleto, extraia os dados para pagamento.`;

            // Realiza a análise
            const analysisResult = await aiService.analyzeImage(mediaBuffer, mediaResult.data.mimetype, prompt);

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
