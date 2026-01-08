import openrouteConfig from '../config/openroute.js';
import { getPrompt } from '../config/prompts.js';
import AntiCacheHelper from '../utils/antiCacheHelper.js';
import cacheHelper from '../utils/cacheHelper.js';
import AIProvider from '../interfaces/AIProvider.js';

/**
 * Serviço para integração com a API Open Route
 * Implementa a interface AIProvider
 */
class OpenRouteService extends AIProvider {
  constructor() {
    super();
    this.config = openrouteConfig;
    this.cacheHelper = cacheHelper;
    // AntiCacheHelper usa métodos estáticos, não precisa instanciar
  }

  /**
   * Analisa uma imagem usando o modelo NVIDIA Nemotron Nano 2 VL
   * Modelo multimodal de 12 bilhões de parâmetros para compreensão de documentos e imagens
   * @param {string} base64Image - Imagem em formato base64
   * @param {string} analysisType - Tipo de análise (receipt, invoice, etc)
   * @param {string} [company] - Empresa específica (opcional)
   * @returns {Promise<Object>} Resultado da análise
   */
  async analyzeImage(base64Image, analysisType, company = '') {
    try {
      // Verifica cache
      const cacheKey = this.cacheHelper.generateCacheKey(base64Image, analysisType, company);
      const cachedResult = await this.cacheHelper.getFromCache(cacheKey);

      if (cachedResult) {
        console.log('🔄 Usando resultado em cache para esta imagem');
        return cachedResult;
      }

      // Obtém o prompt adequado para o tipo de análise
      const prompt = getPrompt(analysisType, company);

      // Prepara a imagem para envio (remove o prefixo data:image/...)
      const imageContent = base64Image.includes('base64,')
        ? base64Image.split('base64,')[1]
        : base64Image;

      // Prepara o corpo da requisição para a API Open Route
      const requestBody = {
        model: this.config.getModel(),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageContent}`
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      };

      // Faz a requisição para a API
      const response = await fetch(this.config.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.getApiKey()}`
        },
        body: JSON.stringify(requestBody)
      });

      // Verifica se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API Open Route: ${response.status} - ${errorText}`);
      }

      // Processa a resposta
      const data = await response.json();

      // Extrai o conteúdo da resposta
      const content = data.choices[0]?.message?.content || '';

      // Formata o resultado
      const result = {
        content,
        analysis_type: analysisType,
        provider: 'openroute',
        model: this.config.getModel(),
        timestamp: new Date().toISOString()
      };

      // Salva no cache
      this.cacheHelper.cacheResult(imageData, prompt, analysisType, result);

      return result;
    } catch (error) {
      console.error('❌ Erro ao analisar imagem com Open Route:', error);

      // Reporta erro na chave API e rotaciona
      this.config.reportApiKeyError(error);

      throw error;
    }
  }

  /**
   * Analisa texto usando o modelo NVIDIA Nemotron Nano 2 VL
   * @param {string} text - Texto para análise
   * @param {string} analysisType - Tipo de análise
   * @returns {Promise<Object>} Resultado da análise
   */
  async analyzeText(text, analysisType) {
    try {
      // Verifica cache
      const cacheKey = this.cacheHelper.generateCacheKey(text, analysisType);
      const cachedResult = await this.cacheHelper.getFromCache(cacheKey);

      if (cachedResult) {
        console.log('🔄 Usando resultado em cache para este texto');
        return cachedResult;
      }

      // Obtém o prompt adequado para o tipo de análise
      const prompt = getPrompt(analysisType);

      // Prepara o corpo da requisição
      const requestBody = {
        model: this.config.getModel(),
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      };

      // Faz a requisição para a API
      const response = await fetch(`${this.config.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.getCurrentApiKey()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://leitor-docs-bpo.com',
          'X-Title': 'Leitor de Documentos BPO'
        },
        body: JSON.stringify(requestBody)
      });

      // Verifica se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API Open Route: ${response.status} - ${errorText}`);
      }

      // Processa a resposta
      const data = await response.json();

      // Extrai o conteúdo da resposta
      const content = data.choices[0]?.message?.content || '';

      // Formata o resultado
      const result = {
        content,
        analysis_type: analysisType,
        provider: 'openroute',
        model: this.config.getModel(),
        timestamp: new Date().toISOString()
      };

      // Salva no cache
      await this.cacheHelper.saveToCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error('❌ Erro ao analisar texto com Open Route:', error);

      // Reporta erro na chave API e rotaciona
      this.config.reportApiKeyError(error);

      throw error;
    }
  }

  /**
   * Obtém estatísticas do gerenciador de chaves
   * @returns {Object} Estatísticas de uso das chaves
   */
  getKeyStats() {
    return this.config.getKeyStats();
  }

  /**
   * Verifica o status da API
   * @returns {Promise<boolean>} True se a API estiver funcionando
   */
  async checkApiStatus() {
    try {
      return await this.config.checkApiStatus();
    } catch (error) {
      console.error('Erro ao verificar status da API Open Route:', error);
      return false;
    }
  }

  /**
   * Analisa um recibo usando o modelo NVIDIA Nemotron Nano 2 VL
   * Modelo multimodal otimizado para OCR, raciocínio em gráficos e compreensão de documentos
   * @param {string} imageData - Imagem em formato base64
   * @param {string} mimeType - Tipo MIME da imagem
   * @param {string} customPrompt - Prompt personalizado (opcional)
   * @param {boolean} forceStructuredFormat - Forçar formato estruturado
   * @param {string} fileName - Nome do arquivo (opcional)
   * @param {number} fileIndex - Índice do arquivo (opcional)
   * @param {string} company - Empresa específica (opcional)
   * @param {string} analysisType - Tipo de análise
   * @returns {Promise<Object>} Resultado da análise
   */
  async analyzeReceipt(imageData, mimeType = 'image/jpeg', customPrompt = null, forceStructuredFormat = true, fileName = '', fileIndex = null, company = 'enia-marcia-joias', analysisType = 'financial-receipt') {
    try {
      // Verifica cache
      const prompt = customPrompt || getPrompt(analysisType, company);
      const cachedResult = this.cacheHelper.getCachedResult(imageData, prompt, analysisType);

      if (cachedResult) {
        console.log('🔄 Usando resultado em cache para esta imagem');
        return cachedResult;
      }

      // Prepara a imagem para envio (remove o prefixo data:image/...)
      const imageContent = imageData.includes('base64,')
        ? imageData.split('base64,')[1]
        : imageData;

      // Prepara o corpo da requisição para a API Open Route
      const requestBody = {
        model: this.config.getModel(),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageContent}`
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      };

      // Aplica estratégias anti-cache padronizadas
      const antiCacheData = AntiCacheHelper.applyFullAntiCache(
        prompt,
        fileName,
        fileIndex,
        0,
        'openai' // OpenRoute usa formato similar ao OpenAI
      );

      requestBody.messages[0].content[0].text = antiCacheData.prompt;

      // Aplica configurações de geração do anti-cache se aplicável
      if (antiCacheData.generationConfig) {
        requestBody.temperature = antiCacheData.generationConfig.temperature || 0.2;
        requestBody.top_p = antiCacheData.generationConfig.top_p || 0.95;
      }

      // Faz a requisição para a API
      const response = await fetch(`${this.config.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.getCurrentApiKey()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://leitor-docs-bpo.com',
          'X-Title': 'Leitor de Documentos BPO'
        },
        body: JSON.stringify(requestBody)
      });

      // Verifica se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API Open Route: ${response.status} - ${errorText}`);
      }

      // Processa a resposta
      const data = await response.json();

      // Extrai o conteúdo da resposta
      const content = data.choices[0]?.message?.content || '';

      // Salva no cache usando o método correto
      this.cacheHelper.cacheResult(imageData, prompt, analysisType, content);

      // Retorna apenas o conteúdo (string) para manter consistência com GeminiService
      return content;
    } catch (error) {
      console.error('❌ Erro ao analisar recibo com Open Route:', error);

      // Reporta erro na chave API e rotaciona
      this.config.reportApiKeyError(error);

      throw error;
    }
  }
}

export default OpenRouteService;