import geminiConfig from '../config/gemini.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPrompt, GLOBAL_SYSTEM_INSTRUCTIONS } from '../config/prompts.js';
import AntiCacheHelper from '../utils/antiCacheHelper.js';
import CacheHelper from '../utils/cacheHelper.js';
import AIProvider from '../interfaces/AIProvider.js';
import receiptParser from '../utils/receiptParser.js';

class GeminiService extends AIProvider {
  constructor() {
    super(); // Chama o construtor da classe pai
    this.model = geminiConfig.getModel();
    this.lastRequestTime = 0;
    this.minRequestInterval = 5000; // Aumentado para 5 segundos (12 req/min)
    this.maxRetries = 5; // Aumentado para 5 tentativas para lidar com erros 503 (Service Unavailable)
    this.requestQueue = [];
    this.processingQueue = false;
    this.recentRequests = []; // Armazena timestamps das requisições recentes
    this.windowSize = 60000; // Janela de 1 minuto para controle de rate limit
    this.maxRequestsPerMinute = 12; // Limite de 12 requisições por minuto
  }

  /**
   * Adiciona uma requisição à fila
   * @param {Function} requestFn - Função que faz a requisição
   * @returns {Promise} Resultado da requisição após processamento
   */
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        requestFn,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Inicia o processamento da fila se não estiver em andamento
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Processa a fila de requisições sequencialmente
   */
  async processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.requestQueue.length > 0) {
        // Verifica se atingiu o limite de requisições por minuto
        await this.waitForRateWindow();

        const request = this.requestQueue.shift();
        const { requestFn, resolve, reject } = request;

        try {
          // Executa a requisição com retry
          const result = await this.executeWithRetry(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }

        // Registra essa requisição
        this.trackRequest();
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Registra timestamp de uma requisição para controle de rate limit
   */
  trackRequest() {
    const now = Date.now();
    this.recentRequests.push(now);

    // Limpa requisições antigas (fora da janela de tempo)
    this.recentRequests = this.recentRequests.filter(
      time => now - time < this.windowSize
    );
  }

  /**
   * Aguarda até que seja possível fazer uma nova requisição dentro da janela de rate limit
   */
  async waitForRateWindow() {
    const now = Date.now();

    // Limpa requisições antigas primeiro
    this.recentRequests = this.recentRequests.filter(
      time => now - time < this.windowSize
    );

    // Se já atingiu o limite de requisições na janela atual, espera
    if (this.recentRequests.length >= this.maxRequestsPerMinute) {
      // Calcula quanto tempo falta para a requisição mais antiga sair da janela
      const oldestRequest = this.recentRequests[0];
      const timeToWait = (oldestRequest + this.windowSize) - now;

      if (timeToWait > 0) {
        console.log(`⏳ Aguardando ${timeToWait}ms para respeitar rate limit...`);
        await new Promise(resolve => setTimeout(resolve, timeToWait));
        // Após esperar, chama recursivamente para verificar novamente
        return this.waitForRateWindow();
      }
    }

    // Aguarda o intervalo mínimo entre requisições
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Aguardando ${waitTime}ms para respeitar intervalo mínimo...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Extrai tempo de retry de erros 429 e 503
   * @param {Error} error - Erro da API
   * @returns {number} Tempo em milissegundos para aguardar
   */
  extractRetryDelay(error) {
    try {
      const errorMessage = error.message;

      // Tenta extrair pelo formato padrão
      const retryMatch = errorMessage.match(/"retryDelay":"(\d+)s"/);
      if (retryMatch) {
        return parseInt(retryMatch[1]) * 1000; // Converte para milissegundos
      }

      // Tenta extrair por formatos alternativos
      const secondaryMatch = errorMessage.match(/retry after (\d+)s/i);
      if (secondaryMatch) {
        return parseInt(secondaryMatch[1]) * 1000;
      }

      // Busca qualquer número seguido de s no erro
      const generalMatch = errorMessage.match(/(\d+)s/);
      if (generalMatch) {
        return parseInt(generalMatch[1]) * 1000;
      }

      // Verifica se é um erro 503 (Service Unavailable)
      if (errorMessage.includes('503') ||
        errorMessage.includes('Service Unavailable') ||
        errorMessage.includes('overloaded')) {
        // Para erros 503, usamos um tempo inicial maior
        return 30000; // 30 segundos para primeira tentativa
      }
    } catch (e) {
      console.warn('Não foi possível extrair retry delay do erro');
    }

    // Backoff exponencial: 60s na primeira tentativa, dobra a cada retry
    return 60000; // Default: 1 minuto
  }

  /**
   * Calcula tempo de backoff exponencial
   * @param {number} retryCount - Número da tentativa atual
   * @returns {number} Tempo em milissegundos
   */
  calculateBackoff(retryCount) {
    // Base: 30 segundos, dobra a cada tentativa
    const baseDelay = 30000;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);

    // Adiciona jitter (variação aleatória) de até 25%
    const jitter = Math.random() * 0.25 * exponentialDelay;

    // Limita a no máximo 5 minutos
    return Math.min(exponentialDelay + jitter, 300000);
  }

  /**
   * Executa uma requisição com retry automático para erros 429 e 503
   * @param {Function} requestFn - Função que faz a requisição
   * @param {number} retryCount - Número atual de tentativas
   * @returns {Promise} Resultado da requisição
   */
  async executeWithRetry(requestFn, retryCount = 0) {
    try {
      return await requestFn();
    } catch (error) {
      const is429Error = error.message.includes('429') ||
        error.message.includes('Too Many Requests') ||
        error.message.includes('quota');

      const is503Error = error.message.includes('503') ||
        error.message.includes('Service Unavailable') ||
        error.message.includes('overloaded');

      if (is429Error) {
        // Reporta o erro ao gerenciador de chaves e rotaciona para a próxima chave
        geminiConfig.reportApiKeyError(error);

        // Atualiza o modelo com a nova chave
        this.model = geminiConfig.getModel();

        // Se ainda não esgotou as tentativas, tenta novamente
        if (retryCount < this.maxRetries) {
          const retryDelay = 2000; // Espera curta para tentar com a nova chave

          console.log(`🔄 Erro de limite de taxa. Rotacionando para nova chave. Tentativa ${retryCount + 1}/${this.maxRetries}. Aguardando ${Math.round(retryDelay / 1000)}s...`);

          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.executeWithRetry(requestFn, retryCount + 1);
        }
      } else if (is503Error) {
        // Para erros 503 (Service Unavailable), usamos backoff exponencial
        if (retryCount < this.maxRetries) {
          // Tenta extrair o tempo de retry do erro ou usa backoff exponencial
          let retryDelay;
          const extractedDelay = this.extractRetryDelay(error);

          if (extractedDelay) {
            // Se conseguiu extrair um tempo do erro, usa ele com um multiplicador baseado na tentativa
            retryDelay = extractedDelay * Math.pow(1.5, retryCount);
          } else {
            // Caso contrário, usa o backoff exponencial padrão
            retryDelay = this.calculateBackoff(retryCount);
          }

          console.log(`🔄 Erro de serviço sobrecarregado (503). Tentativa ${retryCount + 1}/${this.maxRetries}. Aguardando ${Math.round(retryDelay / 1000)}s...`);

          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.executeWithRetry(requestFn, retryCount + 1);
        }
      }

      // Se não é erro tratável ou esgotou tentativas, relança o erro
      throw error;
    }
  }

  /**
   * Gera texto simples a partir de um prompt
   * @param {string} prompt - Texto do prompt
   * @param {Object} options - Opções de configuração
   * @returns {Promise<string>} Resposta gerada
   */
  async generateText(prompt, options = {}) {
    const requestFn = async () => {
      const {
        temperature = 0.2,
        maxTokens = 1000,
        topP = 0.8,
        topK = 40
      } = options;

      const generationConfig = {
        temperature,
        maxOutputTokens: maxTokens,
        topP,
        topK,
      };

      // Obtém o modelo atualizado com a chave atual
      const model = geminiConfig.getModel(this.models.text, {
        systemInstruction: GLOBAL_SYSTEM_INSTRUCTIONS
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = await result.response;
      return response.text();
    };

    try {
      return await this.queueRequest(requestFn);
    } catch (error) {
      console.error('Erro ao gerar texto:', error);
      throw new Error(`Falha na geração de texto: ${error.message}`);
    }
  }

  /**
   * Inicia uma conversa em chat
   * @param {Array} history - Histórico da conversa
   * @param {Object} options - Opções de configuração
   * @returns {Promise<Object>} Sessão de chat
   */
  async startChat(history = [], options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      topP = 0.95,
      topK = 40
    } = options;

    const generationConfig = {
      temperature,
      maxOutputTokens: maxTokens,
      topP,
      topK,
    };

    // Obtém o modelo atualizado com a chave atual
    const model = geminiConfig.getModel();

    // Cria uma sessão de chat
    const chat = model.startChat({
      generationConfig,
      history: history.map(msg => ({
        role: msg.role || 'user',
        parts: [{ text: msg.content }]
      }))
    });

    return chat;
  }

  /**
   * Envia uma mensagem para um chat existente
   * @param {Object} chat - Sessão de chat
   * @param {string} message - Mensagem a ser enviada
   * @returns {Promise<string>} Resposta do chat
   */
  async sendMessage(chat, message) {
    const requestFn = async () => {
      try {
        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
      } catch (error) {
        // Se ocorrer um erro, verifica o tipo
        if (error.message.includes('429') || error.message.includes('quota')) {
          // Erro de limite de taxa (429) - rotaciona a chave e tenta novamente
          geminiConfig.reportApiKeyError(error);

          // Recria o chat com a nova chave
          const newChat = await this.startChat(chat.getHistory());

          // Tenta novamente com o novo chat
          const result = await newChat.sendMessage(message);
          const response = await result.response;
          return response.text();
        } else if (error.message.includes('503') ||
          error.message.includes('Service Unavailable') ||
          error.message.includes('overloaded')) {
          // Erro de serviço sobrecarregado (503) - aguarda e tenta novamente
          console.log('🔄 Erro de serviço sobrecarregado (503) no chat. Aguardando antes de tentar novamente...');

          // Aguarda um tempo antes de tentar novamente (30 segundos)
          await new Promise(resolve => setTimeout(resolve, 30000));

          // Tenta novamente com o mesmo chat
          const result = await chat.sendMessage(message);
          const response = await result.response;
          return response.text();
        }
        throw error;
      }
    };

    try {
      return await this.queueRequest(requestFn);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw new Error(`Falha no envio da mensagem: ${error.message}`);
    }
  }

  /**
   * Analisa uma imagem com um prompt específico
   * @param {string} prompt - Texto do prompt
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} mimeType - Tipo MIME da imagem
   * @returns {Promise<string>} Resposta da análise
   */
  async analyzeImage(prompt, imageData, mimeType = 'image/jpeg') {
    const requestFn = async () => {
      // Obtém o modelo atualizado com a chave atual
      const model = geminiConfig.getModel();

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageData,
            mimeType
          }
        }
      ]);

      const response = await result.response;
      return response.text();
    };

    try {
      return await this.queueRequest(requestFn);
    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
      throw new Error(`Falha na análise da imagem: ${error.message}`);
    }
  }

  /**
   * Conta tokens em um texto
   * @param {string} text - Texto para contar tokens
   * @returns {Promise<number>} Número de tokens
   */
  async countTokens(text) {
    try {
      // Obtém o modelo atualizado com a chave atual
      const model = geminiConfig.getModel();

      const result = await model.countTokens(text);
      return result.totalTokens;
    } catch (error) {
      console.error('Erro ao contar tokens:', error);

      // Se for erro de limite, rotaciona a chave e tenta novamente
      if (error.message.includes('429') || error.message.includes('quota')) {
        geminiConfig.reportApiKeyError(error);
        return this.countTokens(text);
      }

      throw new Error(`Falha na contagem de tokens: ${error.message}`);
    }
  }

  /**
   * Analisa comprovantes e boletos extraindo dados estruturados
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} mimeType - Tipo MIME da imagem
   * @param {string} customPrompt - Prompt personalizado (opcional)
   * @param {boolean} forceStructuredFormat - Se deve forçar formato estruturado (padrão: true)
   * @param {string} fileName - Nome do arquivo (opcional, para anti-cache)
   * @param {number} fileIndex - Índice do arquivo no lote (opcional, para anti-cache)
   * @returns {Promise<string>} Dados extraídos no formato: DD-MM NOME ESTABELECIMENTO VALOR
   */
  async analyzeReceipt(imageData, mimeType = 'image/jpeg', customPrompt = null, forceStructuredFormat = true, fileName = '', fileIndex = null, company = 'enia-marcia-joias', analysisType = 'financial-receipt') {
    // Usa prompt centralizado como padrão se não fornecido um customPrompt
    const originalPrompt = customPrompt || getPrompt(company, analysisType);

    // Extrai a data do nome do arquivo para comprovantes com dinheiro em espécie (Raquel Luc)
    const fileDate = receiptParser.extractDateFromFileName(fileName);

    // Verifica se já temos essa análise em cache
    const cachedResult = CacheHelper.getCachedResult(imageData, originalPrompt, 'receipt');
    if (cachedResult) {
      console.log(`🚀 Usando resultado em cache para ${fileName || 'imagem'}`);
      return cachedResult;
    }

    const requestFn = async (attempt = 0) => {
      // Aplica estratégias anti-cache completas
      const antiCacheData = AntiCacheHelper.applyFullAntiCache(
        originalPrompt,
        fileName,
        fileIndex,
        attempt,
        'gemini'
      );

      console.log('🔍 DEBUG - Prompt sendo usado:', antiCacheData.prompt.substring(0, 200) + '...');

      // Log das estratégias aplicadas
      if (!antiCacheData.isTestPrompt) {
        AntiCacheHelper.logAntiCacheStrategy(fileName, attempt);
      }

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: mimeType
        }
      };

      // Obtém o modelo com instrução de sistema global
      const model = geminiConfig.getModel(geminiConfig.models.text, {
        systemInstruction: GLOBAL_SYSTEM_INSTRUCTIONS
      });

      const result = await model.generateContent([antiCacheData.prompt, imagePart], {
        generationConfig: antiCacheData.generationConfig
      });

      const response = await result.response;
      const rawData = response.text();

      let finalResult;
      if (forceStructuredFormat && !antiCacheData.isTestPrompt) {
        finalResult = receiptParser.formatReceiptDataStrict(rawData, fileName, company);
      } else {
        finalResult = rawData;
      }

      // Armazena em cache o resultado final
      CacheHelper.cacheResult(imageData, originalPrompt, 'receipt', finalResult);

      return finalResult;
    };

    try {
      return await this.queueRequest(async () => {
        try {
          return await requestFn(0);
        } catch (error) {
          const is429Error = error.message.includes('429') || error.message.includes('Too Many Requests');

          if (is429Error) {
            // Reporta o erro ao gerenciador de chaves e rotaciona para a próxima chave
            geminiConfig.reportApiKeyError(error);

            // Atualiza o modelo com a nova chave
            this.model = geminiConfig.getModel();

            // Tenta novamente com a nova chave
            console.log(`🔄 Erro de limite de taxa. Rotacionando para nova chave e tentando novamente...`);
            return await requestFn(0);
          }

          console.error('Erro ao analisar comprovante:', error);
          throw error;
        }
      });
    } catch (error) {
      console.error('Falha na análise de comprovante:', error);
      throw new Error(`Erro ao processar comprovante: ${error.message}`);
    }
  }


  /**
   * Analisa um documento PDF extraindo dados estruturados
   * @param {Buffer} pdfBuffer - Buffer do arquivo PDF
   * @param {string} customPrompt - Prompt personalizado (opcional)
   * @param {boolean} forceStructuredFormat - Se deve forçar formato estruturado (padrão: true)
   * @param {string} fileName - Nome do arquivo (opcional, para anti-cache)
   * @param {number} fileIndex - Índice do arquivo no lote (opcional, para anti-cache)
   * @param {string} company - Empresa selecionada
   * @param {string} analysisType - Tipo de análise
   * @returns {Promise<string>} Dados extraídos no formato: DD-MM NOME ESTABELECIMENTO VALOR
   */
  async analyzePDF(pdfBuffer, customPrompt = null, forceStructuredFormat = true, fileName = '', fileIndex = null, company = 'enia-marcia-joias', analysisType = 'financial-receipt') {
    // Usa prompt centralizado como padrão se não fornecido um customPrompt
    const originalPrompt = customPrompt || getPrompt(company, analysisType);

    // Gera hash do PDF para cache
    const crypto = await import('crypto');
    const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Verifica se já temos essa análise em cache
    const cachedResult = CacheHelper.getCachedResult(pdfHash, originalPrompt, 'pdf');
    if (cachedResult) {
      console.log(`🚀 Usando resultado em cache para ${fileName || 'PDF'}`);
      return cachedResult;
    }

    const requestFn = async (attempt = 0) => {
      try {
        // Aplica estratégias anti-cache completas
        const antiCacheData = AntiCacheHelper.applyFullAntiCache(
          originalPrompt,
          fileName,
          fileIndex,
          attempt,
          'gemini'
        );

        console.log('🔍 DEBUG - Analisando PDF:', fileName);
        console.log('🔍 DEBUG - Prompt sendo usado:', antiCacheData.prompt.substring(0, 200) + '...');

        // Log das estratégias aplicadas
        if (!antiCacheData.isTestPrompt) {
          AntiCacheHelper.logAntiCacheStrategy(fileName, attempt);
        }

        // Obtém o modelo com instrução de sistema global
        const model = geminiConfig.getModel(geminiConfig.models.text, {
          systemInstruction: GLOBAL_SYSTEM_INSTRUCTIONS
        });

        // Para PDFs, usamos o File API do Gemini
        const { GoogleAIFileManager } = await import('@google/generative-ai/server');
        const fileManager = new GoogleAIFileManager(geminiConfig.getCurrentApiKey());

        // Upload do PDF para o File API
        console.log('📤 Fazendo upload do PDF para o Gemini File API...');

        // Cria arquivo temporário para upload
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        const tempDir = os.tmpdir();
        const tempFileName = `temp_pdf_${Date.now()}_${Math.random().toString(36).substring(2)}.pdf`;
        const tempFilePath = path.join(tempDir, tempFileName);

        // Escreve o buffer no arquivo temporário
        fs.writeFileSync(tempFilePath, pdfBuffer);

        try {
          // Upload do arquivo
          const uploadResponse = await fileManager.uploadFile(tempFilePath, {
            mimeType: 'application/pdf',
            displayName: fileName || 'documento.pdf'
          });

          console.log(`📤 PDF uploaded: ${uploadResponse.file.displayName}`);
          console.log(`📊 File URI: ${uploadResponse.file.uri}`);

          // Analisa o PDF
          const result = await model.generateContent([
            antiCacheData.prompt,
            {
              fileData: {
                mimeType: uploadResponse.file.mimeType,
                fileUri: uploadResponse.file.uri
              }
            }
          ], {
            generationConfig: antiCacheData.generationConfig
          });

          const response = await result.response;
          const rawData = response.text();

          // Remove o arquivo do File API após o processamento
          try {
            await fileManager.deleteFile(uploadResponse.file.name);
            console.log(`🗑️ Arquivo removido do File API: ${uploadResponse.file.name}`);
          } catch (deleteError) {
            console.warn('Aviso: Não foi possível remover arquivo do File API:', deleteError.message);
          }

          let finalResult;
          if (forceStructuredFormat && !antiCacheData.isTestPrompt) {
            finalResult = receiptParser.formatReceiptDataStrict(rawData, fileName, company);
          } else {
            finalResult = rawData;
          }

          // Armazena em cache o resultado final
          CacheHelper.cacheResult(pdfHash, originalPrompt, 'pdf', finalResult);

          return finalResult;

        } finally {
          // Remove arquivo temporário
          try {
            fs.unlinkSync(tempFilePath);
          } catch (unlinkError) {
            console.warn('Aviso: Não foi possível remover arquivo temporário:', unlinkError.message);
          }
        }

      } catch (error) {
        console.error('Erro ao analisar PDF:', error);
        throw error;
      }
    };

    try {
      return await this.queueRequest(async () => {
        try {
          return await requestFn(0);
        } catch (error) {
          const is429Error = error.message.includes('429') || error.message.includes('Too Many Requests');

          if (is429Error) {
            // Reporta o erro ao gerenciador de chaves e rotaciona para a próxima chave
            geminiConfig.reportApiKeyError(error);

            // Atualiza o modelo com a nova chave
            this.model = geminiConfig.getModel();

            // Tenta novamente com a nova chave
            console.log(`🔄 Erro de limite de taxa. Rotacionando para nova chave e tentando novamente...`);
            return await requestFn(0);
          }

          console.error('Erro ao analisar PDF:', error);
          throw error;
        }
      });
    } catch (error) {
      console.error('Falha na análise de PDF:', error);
      throw new Error(`Erro ao processar PDF: ${error.message}`);
    }
  }

  /**
   * Obtém estatísticas do gerenciador de chaves
   * @returns {Object} Estatísticas de uso das chaves
   */
  getKeyStats() {
    return geminiConfig.getKeyStats();
  }

  /**
   * Verifica o status da API
   * @returns {Promise<boolean>} True se a API estiver funcionando
   */
  async checkApiStatus() {
    try {
      return await geminiConfig.checkApiStatus();
    } catch (error) {
      console.error('Erro ao verificar status da API Gemini:', error);
      return false;
    }
  }

  /**
   * Obtém modelos disponíveis
   * @returns {Promise<Array>} Lista de modelos disponíveis
   */
  async getAvailableModels() {
    try {
      return await geminiConfig.getAvailableModels();
    } catch (error) {
      console.error('Erro ao obter modelos da API Gemini:', error);
      return [];
    }
  }
}

export default GeminiService;