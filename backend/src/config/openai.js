import OpenAI from 'openai';
import dotenv from 'dotenv';
import apiKeyManager from '../utils/apiKeyManager.js';

// Carrega variáveis de ambiente
dotenv.config();

/**
 * Configuração do serviço OpenAI
 * Classe responsável por gerenciar a conexão e configurações do OpenAI
 */
class OpenAIConfig {
  constructor() {
    // Inicializa a chave API (será substituída pelo gerenciador de chaves)
    this.apiKey = process.env.OPENAI_API_KEY || apiKeyManager.getNextKey('openai');
    
    // Validação da chave API
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('❌ ERRO: Nenhuma chave API OpenAI válida encontrada');
      throw new Error('Nenhuma chave API OpenAI válida encontrada. Verifique seu arquivo .env ou o gerenciador de chaves');
    }

    // Inicializa o cliente da API (será recriado a cada rotação de chave)
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: false // Segurança para Node.js
    });
    
    // Define modelos disponíveis e suas versões
    this.models = {
      text: 'gpt-4o-mini',
      vision: 'gpt-4o',
      chat: 'gpt-4o-mini'
    };
    
    console.log('🚀 OpenAI inicializado com sucesso');
  }

  /**
   * Atualiza a chave API e recria o cliente
   * @returns {string} Nova chave API
   */
  rotateApiKey() {
    // Obtém a próxima chave do gerenciador
    this.apiKey = apiKeyManager.getNextKey('openai');
    
    // Recria o cliente com a nova chave
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: false
    });
    
    return this.apiKey;
  }

  /**
   * Reporta um erro na chave atual e rotaciona para a próxima
   * @param {Error} error - Erro ocorrido
   */
  reportApiKeyError(error) {
    // Reporta o erro ao gerenciador de chaves
    apiKeyManager.reportError(this.apiKey, error, 'openai');
    
    // Rotaciona para a próxima chave
    this.rotateApiKey();
  }

  /**
   * Obtém uma instância do cliente OpenAI com a chave atual
   * @returns {OpenAI} Instância do cliente OpenAI
   */
  getClient() {
    return this.openai;
  }

  /**
   * Gera uma configuração com variabilidade para evitar cache e detecção de padrões
   * @param {Object} [baseConfig] - Configuração base a ser estendida (opcional)
   * @returns {Object} Configuração de geração com parâmetros variáveis
   */
  generateAntiCacheConfig(baseConfig = {}) {
    // Adiciona pequenas variações aleatórias para evitar cache
    const antiCacheConfig = {
      temperature: 0.1 + Math.random() * 0.1,
      max_tokens: 4096,
      top_p: 0.95 + Math.random() * 0.04,
      frequency_penalty: 0.1 + Math.random() * 0.1,
      presence_penalty: 0.1 + Math.random() * 0.1,
      ...baseConfig
    };
    
    return antiCacheConfig;
  }

  /**
   * Obtém a lista de modelos disponíveis na API OpenAI
   * @returns {Promise<Array>} Lista de modelos disponíveis
   */
  async getAvailableModels() {
    try {
      const models = await this.openai.models.list();
      
      // Filtra apenas os modelos GPT relevantes
      const relevantModels = models.data
        .filter(model => model.id.startsWith('gpt-'))
        .map(model => ({
          name: model.id,
          supportedGenerationMethods: ['chat', 'completion'],
          created: model.created
        }))
        .sort((a, b) => b.created - a.created); // Mais recentes primeiro
      
      return relevantModels;
    } catch (error) {
      console.error('❌ Erro ao obter modelos disponíveis:', error.message);
      
      // Retorna modelos padrão em caso de erro
      return [
        { name: this.models.text, supportedGenerationMethods: ['chat', 'completion'] },
        { name: this.models.vision, supportedGenerationMethods: ['chat', 'completion'] },
        { name: this.models.chat, supportedGenerationMethods: ['chat', 'completion'] }
      ];
    }
  }

  /**
   * Verifica o status da API
   * @returns {Promise<boolean>} Status da API (true se operacional)
   */
  async checkApiStatus() {
    try {
      // Testa com uma requisição simples
      const response = await this.openai.chat.completions.create({
        model: this.models.text,
        messages: [{ role: 'user', content: 'Teste de conexão' }],
        max_tokens: 10
      });
      
      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('❌ Erro ao verificar status da API:', error.message);
      this.reportApiKeyError(error);
      return false;
    }
  }
  
  /**
   * Obtém a chave API atual
   * @returns {string} Chave API atual
   */
  getCurrentApiKey() {
    return this.apiKey;
  }

  /**
   * Obtém estatísticas do gerenciador de chaves
   * @returns {Object} Estatísticas de uso das chaves
   */
  getKeyStats() {
    return apiKeyManager.getStats('openai');
  }

  /**
   * Converte imagem base64 para formato compatível com OpenAI
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} mimeType - Tipo MIME da imagem
   * @returns {Object} Objeto de imagem para OpenAI
   */
  formatImageForOpenAI(imageData, mimeType = 'image/jpeg') {
    return {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${imageData}`
      }
    };
  }

  /**
   * Converte PDF para texto usando OpenAI (fallback para PDFs)
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @returns {Promise<string>} Texto extraído do PDF
   */
  async extractTextFromPDF(pdfBuffer) {
    try {
      // Para OpenAI, convertemos PDF para texto primeiro
      // Configuração para ambiente Node.js
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configura o ambiente Node.js para pdfjs-dist
      if (typeof window === 'undefined') {
        // Configura o worker para Node.js
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        
        // Configura o canvas para Node.js
        try {
          const canvas = await import('canvas');
          const { createCanvas } = canvas;
          global.Canvas = createCanvas;
        } catch (canvasError) {
          console.warn('⚠️ Canvas não disponível, usando configuração básica:', canvasError.message);
        }
        
        // Configura DOMMatrix para Node.js se não existir
        if (typeof global.DOMMatrix === 'undefined') {
          global.DOMMatrix = class DOMMatrix {
            constructor(matrix) {
              this.a = 1;
              this.b = 0;
              this.c = 0;
              this.d = 1;
              this.e = 0;
              this.f = 0;
              
              if (matrix) {
                // Implementação básica para matrizes simples
                if (typeof matrix === 'string') {
                  const values = matrix.match(/matrix\(([^)]+)\)/);
                  if (values) {
                    const parts = values[1].split(',').map(v => parseFloat(v.trim()));
                    if (parts.length >= 6) {
                      [this.a, this.b, this.c, this.d, this.e, this.f] = parts;
                    }
                  }
                }
              }
            }
          };
        }
      }
      
      const data = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        text += pageText + '\n';
      }
      
      return text;
    } catch (error) {
      console.warn('⚠️ Erro ao extrair texto do PDF, usando fallback:', error.message);
      return 'Conteúdo do PDF não pôde ser extraído automaticamente.';
    }
  }
}

// Exporta uma instância única da configuração
export default new OpenAIConfig(); 