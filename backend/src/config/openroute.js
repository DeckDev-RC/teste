import dotenv from 'dotenv';
import apiKeyManager from '../utils/apiKeyManager.js';

// Carrega variáveis de ambiente
dotenv.config();

/**
 * Configuração do serviço Open Route AI
 * Classe responsável por gerenciar a conexão e configurações do Open Route
 */
class OpenRouteConfig {
  constructor() {
    // Inicializa a chave API (será substituída pelo gerenciador de chaves)
    this.apiKey = process.env.OPENROUTE_API_KEY || apiKeyManager.getNextKey('openroute');

    // Validação da chave API
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('❌ ERRO: Nenhuma chave API Open Route válida encontrada');
      throw new Error('Nenhuma chave API Open Route válida encontrada. Verifique seu arquivo .env ou o gerenciador de chaves');
    }

    // Define a URL base da API
    this.apiBaseUrl = 'https://openrouter.ai/api/v1';

    // Define modelos disponíveis e suas versões
    // NVIDIA Nemotron Nano 2 VL: modelo multimodal de 12 bilhões de parâmetros para compreensão de vídeo e inteligência de documentos
    // Arquitetura híbrida Transformer-Mamba com alta eficiência de memória e baixa latência
    // Capacidades: processamento de documentos, OCR, raciocínio em gráficos, compreensão multimodal
    this.models = {
      text: 'nvidia/nemotron-nano-12b-v2-vl:free',      // Modelo multimodal gratuito
      chat: 'nvidia/nemotron-nano-12b-v2-vl:free',      // Mesmo modelo para chat
      vision: 'nvidia/nemotron-nano-12b-v2-vl:free',    // Suporta análise de imagens e documentos
    };

    console.log('🚀 Open Route AI inicializado com sucesso');
  }

  /**
   * Atualiza a chave API
   * @returns {string} Nova chave API
   */
  rotateApiKey() {
    // Obtém a próxima chave do gerenciador
    this.apiKey = apiKeyManager.getNextKey('openroute');
    return this.apiKey;
  }

  /**
   * Reporta um erro na chave atual e rotaciona para a próxima
   * @param {Error} error - Erro ocorrido
   */
  reportApiKeyError(error) {
    // Reporta o erro ao gerenciador de chaves
    apiKeyManager.reportError(this.apiKey, error, 'openroute');

    // Rotaciona para a próxima chave
    this.rotateApiKey();
  }

  /**
   * Obtém o modelo configurado
   * @param {string} [modelName] - Nome do modelo (opcional)
   * @returns {string} Nome do modelo a ser usado
   */
  getModel(modelName) {
    // Se não for especificado, usa o modelo padrão de texto
    if (!modelName) {
      return this.models.text;
    }

    // Se for especificado mas não existir no mapeamento, usa o padrão
    return this.models[modelName] || this.models.text;
  }

  /**
   * Verifica o status da API
   * @returns {Promise<boolean>} Status da API (true se operacional)
   */
  async checkApiStatus() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao verificar status da API: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao verificar status da API Open Route:', error.message);
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
    return apiKeyManager.getStats('openroute');
  }
}

// Exporta uma instância única da configuração
export default new OpenRouteConfig();