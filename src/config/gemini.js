import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import apiKeyManager from '../utils/apiKeyManager.js';

// Carrega variáveis de ambiente
dotenv.config();

/**
 * Configuração do serviço Gemini AI da Google
 * Classe responsável por gerenciar a conexão e configurações do Gemini
 */
class GeminiConfig {
  constructor() {
    // Inicializa a chave API (será substituída pelo gerenciador de chaves)
    this.apiKey = process.env.GEMINI_API_KEY || apiKeyManager.getNextKey();
    
    // Validação da chave API
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('❌ ERRO: Nenhuma chave API válida encontrada');
      throw new Error('Nenhuma chave API válida encontrada. Verifique seu arquivo .env ou o gerenciador de chaves');
    }

    // Inicializa o cliente da API (será recriado a cada rotação de chave)
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    // Define modelos disponíveis e suas versões
    this.models = {
      text: 'gemini-1.5-flash',
    };
    
    console.log('🚀 Google Generative AI inicializado com sucesso');
  }

  /**
   * Atualiza a chave API e recria o cliente
   * @returns {string} Nova chave API
   */
  rotateApiKey() {
    // Obtém a próxima chave do gerenciador
    this.apiKey = apiKeyManager.getNextKey();
    
    // Recria o cliente com a nova chave
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    return this.apiKey;
  }

  /**
   * Reporta um erro na chave atual e rotaciona para a próxima
   * @param {Error} error - Erro ocorrido
   */
  reportApiKeyError(error) {
    // Reporta o erro ao gerenciador de chaves
    apiKeyManager.reportError(this.apiKey, error);
    
    // Rotaciona para a próxima chave
    this.rotateApiKey();
  }

  /**
   * Obtém uma instância do modelo Gemini com a chave atual
   * @param {string} [modelName] - Nome do modelo (opcional, padrão: 'gemini-1.5-pro')
   * @param {Object} [config] - Configurações adicionais (opcional)
   * @returns {Object} Instância do modelo Gemini
   */
  getModel(modelName = this.models.text, config = {}) {
    // Normaliza o nome do modelo para usar sempre a versão correta
    if (modelName.includes('vision')) {
      modelName = this.models.vision;
    } else if (!modelName.includes('-')) {
      modelName = this.models.text;
    }
    
    // Configuração base do modelo
    const modelConfig = {
      model: modelName,
      ...config
    };
    
    return this.genAI.getGenerativeModel(modelConfig);
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
      topK: 40 + Math.floor(Math.random() * 10),
      topP: 0.95 + Math.random() * 0.04,
      maxOutputTokens: 8192,
      candidateCount: 1,
      seed: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
      ...baseConfig
    };
    
    return antiCacheConfig;
  }

  /**
   * Obtém um modelo com configurações anti-cache aplicadas
   * @param {string} [modelName] - Nome do modelo (opcional)
   * @param {Object} [customConfig] - Configurações personalizadas (opcional)
   * @returns {Object} Modelo configurado com anti-cache
   */
  getModelWithAntiCache(modelName = this.models.text, customConfig = {}) {
    // Normaliza o nome do modelo
    if (modelName.includes('vision')) {
      modelName = this.models.vision;
    }
    
    // Gera ID de requisição único
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Mescla a configuração anti-cache com a personalizada
    const config = {
      model: modelName,
      generationConfig: this.generateAntiCacheConfig(customConfig),
      requestId
    };
    
    return this.genAI.getGenerativeModel(config);
  }

  /**
   * Obtém a lista de modelos disponíveis na API Gemini
   * @returns {Promise<Array>} Lista de modelos disponíveis
   */
  async getAvailableModels() {
    try {
      // Alguns modelos sempre disponíveis na API Gemini
      const staticModels = [
        { name: this.models.text, supportedGenerationMethods: ['generateContent', 'countTokens'] },
        { name: this.models.vision, supportedGenerationMethods: ['generateContent', 'countTokens'] }
      ];
      
      // Nota: A API Gemini atualmente não fornece um endpoint para listar todos os modelos disponíveis
      // Isso é uma simulação baseada nos modelos conhecidos
      
      return staticModels;
    } catch (error) {
      console.error('❌ Erro ao obter modelos disponíveis:', error.message);
      return [];
    }
  }

  /**
   * Verifica o status da API
   * @returns {Promise<boolean>} Status da API (true se operacional)
   */
  async checkApiStatus() {
    try {
      const model = this.getModel();
      await model.countTokens("Teste de conexão");
      return true;
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
    return apiKeyManager.getStats();
  }
}

// Exporta uma instância única da configuração
export default new GeminiConfig();
