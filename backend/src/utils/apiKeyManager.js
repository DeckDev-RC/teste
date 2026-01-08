/**
 * Gerenciador de chaves de API
 * Implementa rotação automática entre múltiplas chaves de API para diferentes provedores
 */

class ApiKeyManager {
  constructor() {
    // Chaves Gemini (Google)
    // Adicionadas novas chaves testadas e funcionando (24/11/2025)
    // Chaves Gemini (Google)
    // Chaves Gemini (Google)
    this.geminiKeys = process.env.GEMINI_API_KEYS
      ? process.env.GEMINI_API_KEYS.split(',').map(k => k.trim())
      : [];

    // Chaves OpenAI
    this.openaiKeys = process.env.OPENAI_API_KEYS
      ? process.env.OPENAI_API_KEYS.split(',').map(k => k.trim())
      : [];

    // Chaves Open Route
    this.openrouteKeys = process.env.OPENROUTE_API_KEYS
      ? process.env.OPENROUTE_API_KEYS.split(',').map(k => k.trim())
      : [];

    // Mapeamento de provedores para suas chaves
    this.providerKeys = {
      gemini: this.geminiKeys,
      openai: this.openaiKeys,
      openroute: this.openrouteKeys
    };

    // Índices atuais por provedor
    this.currentKeyIndices = {
      gemini: 0,
      openai: 0,
      openroute: 0
    };

    // Contagem de uso por chave (por provedor)
    this.keyUsage = {
      gemini: new Map(),
      openai: new Map(),
      openroute: new Map()
    };

    // Inicializa contadores de uso
    this.geminiKeys.forEach(key => this.keyUsage.gemini.set(key, 0));
    this.openaiKeys.forEach(key => this.keyUsage.openai.set(key, 0));
    this.openrouteKeys.forEach(key => this.keyUsage.openroute.set(key, 0));

    // Registro de erros por chave (por provedor)
    this.keyErrors = {
      gemini: new Map(),
      openai: new Map(),
      openroute: new Map()
    };

    // Inicializa contadores de erro
    this.geminiKeys.forEach(key => this.keyErrors.gemini.set(key, 0));
    this.openaiKeys.forEach(key => this.keyErrors.openai.set(key, 0));
    this.openrouteKeys.forEach(key => this.keyErrors.openroute.set(key, 0));

    // Chaves temporariamente desabilitadas (por provedor)
    this.disabledKeys = {
      gemini: new Map(),
      openai: new Map(),
      openroute: new Map()
    };

    // Timestamps da última rotação (por provedor)
    this.lastRotation = {
      gemini: Date.now(),
      openai: Date.now(),
      openroute: Date.now()
    };

    console.log(`🔑 Gerenciador de chaves de API inicializado:`);
    console.log(`   - Gemini: ${this.geminiKeys.length} chaves`);
    console.log(`   - OpenAI: ${this.openaiKeys.length} chaves`);
    console.log(`   - Open Route: ${this.openrouteKeys.length} chaves`);
  }

  /**
   * Obtém a próxima chave de API disponível
   * @param {string} provider - Provedor ('gemini' ou 'openai')
   * @returns {string} Chave de API
   */
  getNextKey(provider = 'gemini') {
    const keys = this.providerKeys[provider];
    const disabledKeys = this.disabledKeys[provider];
    const currentIndex = this.currentKeyIndices[provider];
    const keyUsage = this.keyUsage[provider];

    if (!keys || keys.length === 0) {
      throw new Error(`Nenhuma chave disponível para o provedor: ${provider}`);
    }

    // Verifica se há chaves disponíveis
    const availableKeys = keys.filter(key => !disabledKeys.has(key));

    if (availableKeys.length === 0) {
      console.warn(`⚠️ Todas as chaves ${provider} estão temporariamente desabilitadas! Reativando a menos recente...`);
      // Se todas as chaves estiverem desabilitadas, reativa a que foi desabilitada há mais tempo
      let oldestKey = null;
      let oldestTime = Infinity;

      for (const [key, time] of disabledKeys.entries()) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        disabledKeys.delete(oldestKey);
        console.log(`🔄 Reativando chave ${provider}: ${this.maskKey(oldestKey)}`);
      }
    }

    // Encontra a próxima chave disponível
    let attempts = 0;
    while (attempts < keys.length) {
      // Avança para a próxima chave
      this.currentKeyIndices[provider] = (this.currentKeyIndices[provider] + 1) % keys.length;
      const key = keys[this.currentKeyIndices[provider]];

      // Verifica se a chave está disponível
      if (!disabledKeys.has(key)) {
        // Incrementa o contador de uso
        const usageCount = keyUsage.get(key) || 0;
        keyUsage.set(key, usageCount + 1);

        // Registra a rotação
        this.lastRotation[provider] = Date.now();

        console.log(`🔑 Usando chave ${provider} #${this.currentKeyIndices[provider] + 1}: ${this.maskKey(key)} (${usageCount + 1} usos)`);
        return key;
      }

      attempts++;
    }

    // Se chegou aqui, todas as chaves estão desabilitadas
    // Usa a chave atual mesmo assim
    const key = keys[this.currentKeyIndices[provider]];
    console.warn(`⚠️ Todas as chaves ${provider} estão desabilitadas! Usando: ${this.maskKey(key)}`);

    return key;
  }

  /**
   * Reporta um erro em uma chave específica
   * @param {string} key - Chave de API com erro
   * @param {Error} error - Erro ocorrido
   * @param {string} provider - Provedor ('gemini' ou 'openai')
   */
  reportError(key, error, provider = 'gemini') {
    const keyErrors = this.keyErrors[provider];

    // Incrementa o contador de erros
    const errorCount = keyErrors.get(key) || 0;
    keyErrors.set(key, errorCount + 1);

    // Verifica se é um erro de limite de taxa (429)
    const is429Error = error.message.includes('429') ||
      error.message.includes('Too Many Requests') ||
      error.message.includes('quota') ||
      error.message.includes('rate limit');

    if (is429Error) {
      // Desabilita a chave temporariamente
      this.disableKey(key, 60000, provider);
      console.warn(`⚠️ Chave ${provider} ${this.maskKey(key)} desabilitada temporariamente por erro de limite de taxa`);
    }

    console.log(`❌ Erro na chave ${provider} ${this.maskKey(key)}: ${error.message} (${errorCount + 1} erros)`);
  }

  /**
   * Desabilita temporariamente uma chave
   * @param {string} key - Chave de API
   * @param {number} timeoutMs - Tempo de desabilitação em milissegundos (padrão: 60 segundos)
   * @param {string} provider - Provedor ('gemini' ou 'openai')
   */
  disableKey(key, timeoutMs = 60000, provider = 'gemini') {
    const disabledKeys = this.disabledKeys[provider];
    disabledKeys.set(key, Date.now());

    // Reativa a chave após o timeout
    setTimeout(() => {
      if (disabledKeys.has(key)) {
        disabledKeys.delete(key);
        console.log(`✅ Chave ${provider} reativada: ${this.maskKey(key)}`);
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
   * @param {string} provider - Provedor ('gemini' ou 'openai')
   * @returns {Object} - Estatísticas
   */
  getStats(provider = 'gemini') {
    const keys = this.providerKeys[provider];
    const disabledKeys = this.disabledKeys[provider];
    const keyUsage = this.keyUsage[provider];
    const keyErrors = this.keyErrors[provider];
    const currentIndex = this.currentKeyIndices[provider];
    const lastRotation = this.lastRotation[provider];

    return {
      totalKeys: keys.length,
      activeKeys: keys.length - disabledKeys.size,
      disabledKeys: disabledKeys.size,
      totalUsage: Array.from(keyUsage.values()).reduce((sum, count) => sum + count, 0),
      totalErrors: Array.from(keyErrors.values()).reduce((sum, count) => sum + count, 0),
      currentKeyIndex: currentIndex,
      lastRotation: lastRotation,
      provider: provider
    };
  }
}

// Exporta uma instância única
export default new ApiKeyManager();