import { createClient } from '@supabase/supabase-js';
import AIServiceFactory from './AIServiceFactory.js';
import whatsappInternalService from './whatsappInternalService.js';
import googleDriveService from './googleDriveService.js';
import creditsService from './creditsService.js';
import fileNameHelper from '../utils/fileNameHelper.js';
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
                    company_id,
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

            // 0. SENIOR GUARD: Verifica Créditos ANTES de gastar recurso de máquina
            const instanceData = msg.monitored_groups?.whatsapp_instances;
            if (!instanceData || !instanceData.instance_id) {
                throw new Error(`Instância WhatsApp não encontrada para a mensagem ${msg.id}`);
            }

            const userId = instanceData.user_id;
            const hasCredits = await creditsService.hasEnoughCredits(userId, 1);
            if (!hasCredits) {
                // Em produção, isso deveria talvez notificar o usuário via WhatsApp
                throw new Error('SALDO_INSUFICIENTE: Recarregue seus créditos para continuar.');
            }

            // Atualiza status para processing
            await supabaseAdmin
                .from('processed_messages')
                .update({ status: 'processing', updated_at: new Date().toISOString() })
                .eq('id', msg.id);

            const instanceId = instanceData.instance_id;

            // 3. Baixa a mídia usando Serviço Interno (Baileys)
            const mediaResult = await whatsappInternalService.downloadMedia(
                instanceId,
                msg.message_key,
                msg.message_content
            );

            if (!mediaResult.success) {
                throw new Error(`Erro ao baixar mídia: ${mediaResult.error}`);
            }

            // 4. STORAGE PRIMÁRIO (Supabase): Salva a prova original
            let fileUrl = null;
            try {
                const buffer = Buffer.from(mediaResult.data.base64, 'base64');
                const fileExt = mediaResult.data.mimetype.split('/')[1] || 'bin';
                const fileName = `${userId}/${Date.now()}_${msg.id}.${fileExt}`;

                // Tenta criar bucket se não existir (apenas precaução)
                // await supabaseAdmin.storage.createBucket('whatsapp-evidence', { public: false }).catch(() => {});

                const { data: uploadData, error: uploadError } = await supabaseAdmin
                    .storage
                    .from('whatsapp-evidence')
                    .upload(fileName, buffer, {
                        contentType: mediaResult.data.mimetype,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Gera URL assinada (válida por 1 ano)
                const { data: signedUrlData } = await supabaseAdmin
                    .storage
                    .from('whatsapp-evidence')
                    .createSignedUrl(fileName, 31536000);

                fileUrl = signedUrlData?.signedUrl;
                console.log(`💾 Arquivo original salvo no Supabase Storage`);
            } catch (storageError) {
                console.error('⚠️ Aviso: Falha no Supabase Storage:', storageError.message);
                // Segue o baile se falhar o storage, pois o principal é a análise
            }

            // 5. Envia para IA (Gemini)
            const aiService = AIServiceFactory.getService('gemini');

            // Busca configurações da empresa se houver company_id
            let companyPrompts = null;
            let namingPatterns = null;
            if (msg.monitored_groups?.company_id) {
                const { data: companyData } = await supabaseAdmin
                    .from('companies')
                    .select(`
                        financial_receipt_prompt, 
                        financial_payment_prompt,
                        company_naming_patterns(
                            priority,
                            naming_patterns(pattern)
                        )
                    `)
                    .eq('id', msg.monitored_groups.company_id)
                    .single();

                if (companyData) {
                    companyPrompts = companyData;
                    if (companyData.company_naming_patterns) {
                        namingPatterns = companyData.company_naming_patterns
                            .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                            .map(p => p.naming_patterns?.pattern)
                            .filter(Boolean);
                    }
                }
            }

            // Define o prompt com base no tipo de arquivo e configurações da empresa
            const isReceipt = msg.file_name?.toLowerCase().includes('comprovante') || msg.file_type?.includes('image');
            const analysisType = isReceipt ? 'financial-receipt' : 'financial-payment';

            let customPrompt = isReceipt
                ? companyPrompts?.financial_receipt_prompt
                : companyPrompts?.financial_payment_prompt;

            // Prompt padrão para análise como fallback
            const defaultPrompt = `Analise este documento/imagem enviado via WhatsApp. 
            Identifique o tipo de documento, extraia as informações principais (datas, valores, CNPJs, nomes) 
            e forneça um resumo conciso. 
            Se for uma nota fiscal ou boleto, extraia os dados para pagamento.`;

            const prompt = (customPrompt && customPrompt.trim()) ? customPrompt : defaultPrompt;

            console.log(`[MessageProcessor] Usando prompt ${customPrompt ? 'customizado da empresa' : 'padrão'} para a mensagem ${msg.id}`);

            // Realiza a análise
            const analysisResult = await aiService.analyzeImage(prompt, mediaResult.data.base64, mediaResult.data.mimetype);

            // Gerar nome sugerido
            const analysisText = typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult);
            const originalExtension = msg.file_name ? msg.file_name.substring(msg.file_name.lastIndexOf('.')) : '.png';
            const suggestedFileName = fileNameHelper.generateFileNameFromAnalysis(analysisText, analysisType, originalExtension, namingPatterns);

            // 6. DEBIT: Cobra o crédito 
            await creditsService.debitCredit(userId, 1);
            console.log(`💰 1 Crédito debitado de ${userId}`);

            // 7. Salva resultado
            const { data: analysisData, error: insertError } = await supabaseAdmin
                .from('analysis_results')
                .insert({
                    user_id: userId,
                    company_id: msg.monitored_groups?.company_id, // Vincula o resultado à empresa para rastreio
                    file_name: msg.file_name,
                    file_type: mediaResult.data.mimetype,
                    analysis_json: typeof analysisResult === 'string' ? { text: analysisResult } : analysisResult,
                    status: 'completed',
                    original_file_url: fileUrl, // Novo campo (precisará ser criado no BD se não existir, ou usamos drive_url como fallback)
                    suggested_file_name: suggestedFileName
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 8. Finaliza processamento
            await supabaseAdmin
                .from('processed_messages')
                .update({
                    status: 'completed',
                    analysis_result_id: analysisData.id,
                    drive_url: fileUrl, // Usando o campo drive_url para guardar a URL do Supabase por enquanto
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id);

            console.log(`✅ Mensagem ${msg.id} finalizada com sucesso!`);

        } catch (error) {
            console.error(`❌ Falha ao processar mensagem ${msg.id}:`, error);

            const isBalanceError = error.message.includes('SALDO_INSUFICIENTE');

            await supabaseAdmin
                .from('processed_messages')
                .update({
                    status: isBalanceError ? 'aborted' : 'failed',
                    error_message: error.message,
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id);
        }
    }
}

export default new MessageProcessor();
