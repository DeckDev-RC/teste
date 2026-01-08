/**
 * Interface comum para provedores de IA
 * Define os métodos que todos os provedores devem implementar
 */
class AIProvider {
  /**
   * Gera texto simples a partir de um prompt
   * @param {string} prompt - Texto do prompt
   * @param {Object} options - Opções de configuração
   * @returns {Promise<string>} Resposta gerada
   */
  async generateText(prompt, options = {}) {
    throw new Error('Método generateText deve ser implementado');
  }

  /**
   * Inicia uma conversa em chat
   * @param {Array} history - Histórico da conversa
   * @param {Object} options - Opções de configuração
   * @returns {Promise<Object>} Sessão de chat
   */
  async startChat(history = [], options = {}) {
    throw new Error('Método startChat deve ser implementado');
  }

  /**
   * Envia uma mensagem para um chat existente
   * @param {Object} chat - Sessão de chat
   * @param {string} message - Mensagem a ser enviada
   * @returns {Promise<string>} Resposta do chat
   */
  async sendMessage(chat, message) {
    throw new Error('Método sendMessage deve ser implementado');
  }

  /**
   * Analisa uma imagem com um prompt específico
   * @param {string} prompt - Texto do prompt
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} mimeType - Tipo MIME da imagem
   * @returns {Promise<string>} Resposta da análise
   */
  async analyzeImage(prompt, imageData, mimeType = 'image/jpeg') {
    throw new Error('Método analyzeImage deve ser implementado');
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
    throw new Error('Método analyzeReceipt deve ser implementado');
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
    throw new Error('Método analyzePDF deve ser implementado');
  }

  /**
   * Conta tokens em um texto
   * @param {string} text - Texto para contar tokens
   * @returns {Promise<number>} Número de tokens
   */
  async countTokens(text) {
    throw new Error('Método countTokens deve ser implementado');
  }

  /**
   * Obtém estatísticas do gerenciador de chaves
   * @returns {Object} Estatísticas de uso das chaves
   */
  getKeyStats() {
    throw new Error('Método getKeyStats deve ser implementado');
  }

  /**
   * Verifica o status da API
   * @returns {Promise<boolean>} Status da API (true se operacional)
   */
  async checkApiStatus() {
    throw new Error('Método checkApiStatus deve ser implementado');
  }

  /**
   * Obtém a lista de modelos disponíveis
   * @returns {Promise<Array>} Lista de modelos disponíveis
   */
  async getAvailableModels() {
    throw new Error('Método getAvailableModels deve ser implementado');
  }
}

export default AIProvider; 