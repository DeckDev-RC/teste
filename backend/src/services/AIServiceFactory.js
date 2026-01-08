import GeminiService from './GeminiService.js';
import OpenAIService from './OpenAIService.js';
import OpenRouteService from './OpenRouteService.js';

/**
 * Factory para criação de serviços de IA
 * Permite escolher entre diferentes provedores (Gemini, OpenAI, OpenRoute)
 */
class AIServiceFactory {
  constructor() {
    this.services = {
      gemini: new GeminiService(),
      openai: new OpenAIService(),
      nexus: new OpenRouteService()
    };

    this.defaultProvider = 'gemini';
  }

  /**
   * Obtém um serviço de IA pelo nome do provedor
   * @param {string} provider - Nome do provedor ('gemini' ou 'openai')
   * @returns {Object} Instância do serviço de IA
   */
  getService(provider = this.defaultProvider) {
    const service = this.services[provider];

    if (!service) {
      console.warn(`⚠️ Provedor '${provider}' não encontrado. Usando '${this.defaultProvider}' como fallback.`);
      return this.services[this.defaultProvider];
    }

    return service;
  }

  /**
   * Lista todos os provedores disponíveis
   * @returns {Array} Lista de provedores disponíveis
   */
  getAvailableProviders() {
    return Object.keys(this.services);
  }

  /**
   * Define o provedor padrão
   * @param {string} provider - Nome do provedor
   */
  setDefaultProvider(provider) {
    if (this.services[provider]) {
      this.defaultProvider = provider;
      console.log(`🔧 Provedor padrão alterado para: ${provider}`);
    } else {
      console.warn(`⚠️ Provedor '${provider}' não disponível. Provedores disponíveis: ${this.getAvailableProviders().join(', ')}`);
    }
  }

  /**
   * Obtém o provedor padrão atual
   * @returns {string} Nome do provedor padrão
   */
  getDefaultProvider() {
    return this.defaultProvider;
  }

  /**
   * Verifica se um provedor está disponível
   * @param {string} provider - Nome do provedor
   * @returns {boolean} True se o provedor estiver disponível
   */
  isProviderAvailable(provider) {
    return !!this.services[provider];
  }

  /**
   * Obtém estatísticas de todos os provedores
   * @returns {Object} Estatísticas combinadas
   */
  getAllStats() {
    const stats = {};

    for (const [provider, service] of Object.entries(this.services)) {
      try {
        stats[provider] = service.getKeyStats();
      } catch (error) {
        console.warn(`⚠️ Erro ao obter estatísticas do provedor ${provider}:`, error.message);
        stats[provider] = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Testa a conectividade de todos os provedores
   * @returns {Promise<Object>} Status de conectividade de cada provedor
   */
  async testAllProviders() {
    const results = {};

    for (const [provider, service] of Object.entries(this.services)) {
      try {
        console.log(`🔍 Testando conectividade do provedor: ${provider}`);
        const isOnline = await service.checkApiStatus();
        results[provider] = {
          status: isOnline ? 'online' : 'offline',
          timestamp: new Date().toISOString()
        };
        console.log(`✅ ${provider}: ${isOnline ? 'Online' : 'Offline'}`);
      } catch (error) {
        console.error(`❌ Erro ao testar ${provider}:`, error.message);
        results[provider] = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    return results;
  }

  /**
   * Obtém informações sobre os modelos disponíveis em todos os provedores
   * @returns {Promise<Object>} Modelos disponíveis por provedor
   */
  async getAllModels() {
    const models = {};

    for (const [provider, service] of Object.entries(this.services)) {
      try {
        console.log(`📋 Obtendo modelos do provedor: ${provider}`);
        const availableModels = await service.getAvailableModels();
        models[provider] = availableModels;
        console.log(`✅ ${provider}: ${availableModels.length} modelos encontrados`);
      } catch (error) {
        console.warn(`⚠️ Erro ao obter modelos do provedor ${provider}:`, error.message);
        models[provider] = { error: error.message };
      }
    }

    return models;
  }
}

// Exporta uma instância única do factory
export default new AIServiceFactory();