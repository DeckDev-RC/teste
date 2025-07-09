/**
 * Gerenciador de chaves de API
 * Implementa rotação automática entre múltiplas chaves de API
 */

class ApiKeyManager {
  constructor() {
    // Lista de chaves de API disponíveis
    this.apiKeys = [
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
      'REMOVED_API_KEY',
    ];

    // Índice da chave atual
    this.currentKeyIndex = 0;

    // Contagem de uso por chave
    this.keyUsage = new Map();
    this.apiKeys.forEach(key => this.keyUsage.set(key, 0));

    // Registro de erros por chave
    this.keyErrors = new Map();
    this.apiKeys.forEach(key => this.keyErrors.set(key, 0));

    // Chaves temporariamente desabilitadas (por atingir limite de taxa)
    this.disabledKeys = new Map();

    // Timestamp da última rotação
    this.lastRotation = Date.now();

    console.log(`🔑 Gerenciador de chaves de API inicializado com ${this.apiKeys.length} chaves`);
  }

  /**
   * Obtém a próxima chave de API disponível
   * @returns {string} Chave de API
   */
  getNextKey() {
    // Verifica se há chaves disponíveis
    const availableKeys = this.apiKeys.filter(key => !this.disabledKeys.has(key));
    
    if (availableKeys.length === 0) {
      console.warn('⚠️ Todas as chaves estão temporariamente desabilitadas! Reativando a menos recente...');
      // Se todas as chaves estiverem desabilitadas, reativa a que foi desabilitada há mais tempo
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [key, time] of this.disabledKeys.entries()) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.disabledKeys.delete(oldestKey);
        console.log(`🔄 Reativando chave: ${this.maskKey(oldestKey)}`);
      }
    }
    
    // Encontra a próxima chave disponível
    let attempts = 0;
    while (attempts < this.apiKeys.length) {
      // Avança para a próxima chave
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      const key = this.apiKeys[this.currentKeyIndex];
      
      // Verifica se a chave está disponível
      if (!this.disabledKeys.has(key)) {
        // Incrementa o contador de uso
        const usageCount = this.keyUsage.get(key) || 0;
        this.keyUsage.set(key, usageCount + 1);
        
        // Registra a rotação
        this.lastRotation = Date.now();
        
        console.log(`🔑 Usando chave #${this.currentKeyIndex + 1}: ${this.maskKey(key)} (${usageCount + 1} usos)`);
        return key;
      }
      
      attempts++;
    }
    
    // Se chegou aqui, todas as chaves estão desabilitadas
    // Usa a chave atual mesmo assim
    const key = this.apiKeys[this.currentKeyIndex];
    console.warn(`⚠️ Todas as chaves estão desabilitadas! Usando: ${this.maskKey(key)}`);
    
    return key;
  }

  /**
   * Reporta um erro em uma chave específica
   * @param {string} key - Chave de API com erro
   * @param {Error} error - Erro ocorrido
   */
  reportError(key, error) {
    // Incrementa o contador de erros
    const errorCount = this.keyErrors.get(key) || 0;
    this.keyErrors.set(key, errorCount + 1);
    
    // Verifica se é um erro de limite de taxa (429)
    const is429Error = error.message.includes('429') || 
                      error.message.includes('Too Many Requests') || 
                      error.message.includes('quota');
    
    if (is429Error) {
      // Desabilita a chave temporariamente
      this.disableKey(key);
      console.warn(`⚠️ Chave ${this.maskKey(key)} desabilitada temporariamente por erro de limite de taxa`);
    }
    
    console.log(`❌ Erro na chave ${this.maskKey(key)}: ${error.message} (${errorCount + 1} erros)`);
  }

  /**
   * Desabilita temporariamente uma chave
   * @param {string} key - Chave de API
   * @param {number} timeoutMs - Tempo de desabilitação em milissegundos (padrão: 60 segundos)
   */
  disableKey(key, timeoutMs = 60000) {
    this.disabledKeys.set(key, Date.now());
    
    // Reativa a chave após o timeout
    setTimeout(() => {
      if (this.disabledKeys.has(key)) {
        this.disabledKeys.delete(key);
        console.log(`✅ Chave reativada: ${this.maskKey(key)}`);
      }
    }, timeoutMs);
  }

  /**
   * Mascara a chave para exibição segura em logs
   * @param {string} key - Chave de API completa
   * @returns {string} - Chave mascarada
   */
  maskKey(key) {
    if (!key) return 'undefined';
    return key.substring(0, 6) + '...' + key.substring(key.length - 4);
  }

  /**
   * Obtém estatísticas de uso das chaves
   * @returns {Object} - Estatísticas
   */
  getStats() {
    return {
      totalKeys: this.apiKeys.length,
      activeKeys: this.apiKeys.length - this.disabledKeys.size,
      disabledKeys: this.disabledKeys.size,
      totalUsage: Array.from(this.keyUsage.values()).reduce((sum, count) => sum + count, 0),
      totalErrors: Array.from(this.keyErrors.values()).reduce((sum, count) => sum + count, 0),
      currentKeyIndex: this.currentKeyIndex,
      lastRotation: this.lastRotation
    };
  }
}

// Exporta uma instância única
export default new ApiKeyManager(); 