import openaiConfig from '../config/openai.js';
import AIProvider from '../interfaces/AIProvider.js';
import { getPrompt, GLOBAL_SYSTEM_INSTRUCTIONS } from '../config/prompts.js';
import AntiCacheHelper from '../utils/antiCacheHelper.js';
import CacheHelper from '../utils/cacheHelper.js';
import receiptParser from '../utils/receiptParser.js';

class OpenAIService extends AIProvider {
  constructor() {
    super();
    this.openai = openaiConfig.getClient();
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 segundo entre requisições (60 req/min)
    this.maxRetries = 3;
    this.requestQueue = [];
    this.processingQueue = false;
    this.recentRequests = [];
    this.windowSize = 60000; // Janela de 1 minuto
    this.maxRequestsPerMinute = 60; // Limite de 60 requisições por minuto
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
        await this.waitForRateWindow();

        const request = this.requestQueue.shift();
        const { requestFn, resolve, reject } = request;

        try {
          const result = await this.executeWithRetry(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }

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

    this.recentRequests = this.recentRequests.filter(
      time => now - time < this.windowSize
    );
  }

  /**
   * Aguarda até que seja possível fazer uma nova requisição
   */
  async waitForRateWindow() {
    const now = Date.now();

    this.recentRequests = this.recentRequests.filter(
      time => now - time < this.windowSize
    );

    if (this.recentRequests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.recentRequests[0];
      const timeToWait = (oldestRequest + this.windowSize) - now;

      if (timeToWait > 0) {
        console.log(`⏳ Aguardando ${timeToWait}ms para respeitar rate limit...`);
        await new Promise(resolve => setTimeout(resolve, timeToWait));
        return this.waitForRateWindow();
      }
    }

    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Aguardando ${waitTime}ms para respeitar intervalo mínimo...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Executa uma requisição com retry automático
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
        error.message.includes('rate limit');

      const is503Error = error.message.includes('503') ||
        error.message.includes('Service Unavailable');

      if (is429Error) {
        openaiConfig.reportApiKeyError(error);
        this.openai = openaiConfig.getClient();

        if (retryCount < this.maxRetries) {
          const retryDelay = 2000;
          console.log(`🔄 Erro de limite de taxa. Rotacionando para nova chave. Tentativa ${retryCount + 1}/${this.maxRetries}. Aguardando ${Math.round(retryDelay / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.executeWithRetry(requestFn, retryCount + 1);
        }
      } else if (is503Error) {
        if (retryCount < this.maxRetries) {
          const retryDelay = 30000 * Math.pow(2, retryCount);
          console.log(`🔄 Erro de serviço sobrecarregado (503). Tentativa ${retryCount + 1}/${this.maxRetries}. Aguardando ${Math.round(retryDelay / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.executeWithRetry(requestFn, retryCount + 1);
        }
      }

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
        topP = 0.8
      } = options;

      const response = await this.openai.chat.completions.create({
        model: openaiConfig.models.text,
        messages: [
          { role: 'system', content: GLOBAL_SYSTEM_INSTRUCTIONS },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens,
        top_p: topP
      });

      return response.choices[0].message.content;
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
      topP = 0.95
    } = options;

    // Para OpenAI, retornamos um objeto que simula uma sessão de chat
    return {
      history: history.map(msg => ({
        role: msg.role || 'user',
        content: msg.content
      })),
      options: { temperature, max_tokens: maxTokens, top_p: topP },
      sendMessage: async (message) => {
        return this.sendMessage(this, message);
      }
    };
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
        const messages = [
          ...chat.history,
          { role: 'user', content: message }
        ];

        const response = await this.openai.chat.completions.create({
          model: openaiConfig.models.chat,
          messages,
          ...chat.options
        });

        const responseContent = response.choices[0].message.content;

        // Atualiza o histórico
        chat.history.push({ role: 'user', content: message });
        chat.history.push({ role: 'assistant', content: responseContent });

        return responseContent;
      } catch (error) {
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          openaiConfig.reportApiKeyError(error);
          this.openai = openaiConfig.getClient();
          return this.sendMessage(chat, message);
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
      const imageObject = openaiConfig.formatImageForOpenAI(imageData, mimeType);

      const response = await this.openai.chat.completions.create({
        model: openaiConfig.models.vision,
        messages: [
          { role: 'system', content: GLOBAL_SYSTEM_INSTRUCTIONS },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              imageObject
            ]
          }
        ],
        max_tokens: 4096
      });

      return response.choices[0].message.content;
    };

    try {
      return await this.queueRequest(requestFn);
    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
      throw new Error(`Falha na análise da imagem: ${error.message}`);
    }
  }

  /**
   * Analisa comprovantes e boletos extraindo dados estruturados
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} mimeType - Tipo MIME da imagem
   * @param {string} customPrompt - Prompt personalizado (opcional)
   * @param {boolean} forceStructuredFormat - Se deve forçar formato estruturado
   * @param {string} fileName - Nome do arquivo (opcional)
   * @param {number} fileIndex - Índice do arquivo no lote (opcional)
   * @param {string} company - Empresa selecionada
   * @param {string} analysisType - Tipo de análise
   * @returns {Promise<string>} Dados extraídos
   */
  async analyzeReceipt(imageData, mimeType = 'image/jpeg', customPrompt = null, forceStructuredFormat = true, fileName = '', fileIndex = null, company = 'enia-marcia-joias', analysisType = 'financial-receipt') {
    const originalPrompt = customPrompt || getPrompt(company, analysisType);

    const fileDate = receiptParser.extractDateFromFileName(fileName);

    const cachedResult = CacheHelper.getCachedResult(imageData, originalPrompt, 'receipt');
    if (cachedResult) {
      console.log(`🚀 Usando resultado em cache para ${fileName || 'imagem'}`);
      return cachedResult;
    }

    const requestFn = async (attempt = 0) => {
      const antiCacheData = AntiCacheHelper.applyFullAntiCache(
        originalPrompt,
        fileName,
        fileIndex,
        attempt,
        'openai'
      );

      console.log('🔍 DEBUG - Prompt sendo usado:', antiCacheData.prompt.substring(0, 200) + '...');

      if (!antiCacheData.isTestPrompt) {
        AntiCacheHelper.logAntiCacheStrategy(fileName, attempt);
      }

      const imageObject = openaiConfig.formatImageForOpenAI(imageData, mimeType);

      const response = await this.openai.chat.completions.create({
        model: openaiConfig.models.vision,
        messages: [
          { role: 'system', content: GLOBAL_SYSTEM_INSTRUCTIONS },
          {
            role: 'user',
            content: [
              { type: 'text', text: antiCacheData.prompt },
              imageObject
            ]
          }
        ],
        ...antiCacheData.generationConfig
      });

      const rawData = response.choices[0].message.content;

      let finalResult;
      if (forceStructuredFormat && !antiCacheData.isTestPrompt) {
        finalResult = receiptParser.formatReceiptDataStrict(rawData, fileName, company);
      } else {
        finalResult = rawData;
      }

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
            openaiConfig.reportApiKeyError(error);
            this.openai = openaiConfig.getClient();
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
   * @param {boolean} forceStructuredFormat - Se deve forçar formato estruturado
   * @param {string} fileName - Nome do arquivo (opcional)
   * @param {number} fileIndex - Índice do arquivo no lote (opcional)
   * @param {string} company - Empresa selecionada
   * @param {string} analysisType - Tipo de análise
   * @returns {Promise<string>} Dados extraídos
   */
  async analyzePDF(pdfBuffer, customPrompt = null, forceStructuredFormat = true, fileName = '', fileIndex = null, company = 'enia-marcia-joias', analysisType = 'financial-receipt') {
    const originalPrompt = customPrompt || getPrompt(company, analysisType);

    const crypto = await import('crypto');
    const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const cachedResult = CacheHelper.getCachedResult(pdfHash, originalPrompt, 'pdf');
    if (cachedResult) {
      console.log(`🚀 Usando resultado em cache para ${fileName || 'PDF'}`);
      return cachedResult;
    }

    const requestFn = async (attempt = 0) => {
      try {
        const antiCacheData = AntiCacheHelper.applyFullAntiCache(
          originalPrompt,
          fileName,
          fileIndex,
          attempt,
          'openai'
        );

        console.log('🔍 DEBUG - Analisando PDF:', fileName);
        console.log('🔍 DEBUG - Prompt sendo usado:', antiCacheData.prompt.substring(0, 200) + '...');

        if (!antiCacheData.isTestPrompt) {
          AntiCacheHelper.logAntiCacheStrategy(fileName, attempt);
        }

        // Para OpenAI, convertemos PDF para texto primeiro
        const pdfText = await openaiConfig.extractTextFromPDF(pdfBuffer);

        const response = await this.openai.chat.completions.create({
          model: openaiConfig.models.text,
          messages: [
            { role: 'system', content: GLOBAL_SYSTEM_INSTRUCTIONS },
            {
              role: 'user',
              content: `${antiCacheData.prompt}\n\nConteúdo do PDF:\n${pdfText}`
            }
          ],
          ...antiCacheData.generationConfig
        });

        const rawData = response.choices[0].message.content;

        let finalResult;
        if (forceStructuredFormat && !antiCacheData.isTestPrompt) {
          finalResult = receiptParser.formatReceiptDataStrict(rawData, fileName, company);
        } else {
          finalResult = rawData;
        }

        CacheHelper.cacheResult(pdfHash, originalPrompt, 'pdf', finalResult);

        return finalResult;

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
            openaiConfig.reportApiKeyError(error);
            this.openai = openaiConfig.getClient();
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
   * Conta tokens em um texto
   * @param {string} text - Texto para contar tokens
   * @returns {Promise<number>} Número de tokens
   */
  async countTokens(text) {
    try {
      const response = await this.openai.models.retrieve(openaiConfig.models.text);
      // OpenAI não fornece contagem de tokens diretamente, então estimamos
      // Uma estimativa aproximada: 1 token ≈ 4 caracteres
      return Math.ceil(text.length / 4);
    } catch (error) {
      console.error('Erro ao contar tokens:', error);

      if (error.message.includes('429') || error.message.includes('rate limit')) {
        openaiConfig.reportApiKeyError(error);
        return this.countTokens(text);
      }

      throw new Error(`Falha na contagem de tokens: ${error.message}`);
    }
  }

  /**
   * Obtém estatísticas do gerenciador de chaves
   * @returns {Object} Estatísticas de uso das chaves
   */
  getKeyStats() {
    return openaiConfig.getKeyStats();
  }

  /**
   * Verifica o status da API
   * @returns {Promise<boolean>} Status da API (true se operacional)
   */
  async checkApiStatus() {
    return openaiConfig.checkApiStatus();
  }

  /**
   * Obtém a lista de modelos disponíveis
   * @returns {Promise<Array>} Lista de modelos disponíveis
   */
  async getAvailableModels() {
    return openaiConfig.getAvailableModels();
  }

}

export default OpenAIService; 