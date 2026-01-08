/**
 * Sistema de cache para imagens processadas
 * Evita reprocessamento de imagens idênticas e reduz o consumo de API
 */

import crypto from 'crypto';

class CacheHelper {
  constructor() {
    this.imageCache = new Map();
    this.maxCacheSize = 100; // Número máximo de itens no cache
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.enabled = true;
  }

  /**
   * Gera uma chave de cache baseada nos dados da imagem e prompt
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} prompt - Prompt usado para análise
   * @param {string} analysisType - Tipo de análise
   * @returns {string} Chave única para o cache
   */
  generateCacheKey(imageData, prompt, analysisType) {
    // Cria um hash do conteúdo da imagem para identificação única
    const imageHash = crypto
      .createHash('sha256')
      .update(imageData)
      .digest('hex');
    
    // Cria um hash resumido do prompt (apenas os primeiros 200 caracteres)
    // para diferenciar análises com prompts diferentes
    const promptSummary = prompt.substring(0, 200);
    const promptHash = crypto
      .createHash('md5')
      .update(promptSummary)
      .digest('hex');
    
    // Combina os hashes com o tipo de análise
    return `${imageHash}_${promptHash}_${analysisType}`;
  }

  /**
   * Verifica se uma imagem está no cache
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} prompt - Prompt usado para análise
   * @param {string} analysisType - Tipo de análise
   * @returns {Object|null} Resultado em cache ou null se não encontrado
   */
  getCachedResult(imageData, prompt, analysisType) {
    if (!this.enabled) {
      return null;
    }

    const cacheKey = this.generateCacheKey(imageData, prompt, analysisType);
    
    if (this.imageCache.has(cacheKey)) {
      this.cacheHits++;
      const cachedItem = this.imageCache.get(cacheKey);
      
      // Atualiza timestamp de acesso para LRU
      cachedItem.lastAccessed = Date.now();
      
      console.log(`🎯 Cache hit! Usando resultado em cache para análise.`);
      return cachedItem.result;
    }
    
    this.cacheMisses++;
    console.log(`📋 Cache miss. Processando nova análise.`);
    return null;
  }

  /**
   * Adiciona um resultado ao cache
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} prompt - Prompt usado para análise
   * @param {string} analysisType - Tipo de análise
   * @param {Object} result - Resultado da análise
   */
  cacheResult(imageData, prompt, analysisType, result) {
    if (!this.enabled) {
      return;
    }

    const cacheKey = this.generateCacheKey(imageData, prompt, analysisType);
    
    // Limpa cache se atingiu tamanho máximo (remove o item menos recentemente usado)
    if (this.imageCache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }
    
    // Adiciona ao cache
    this.imageCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
    
    console.log(`💾 Resultado armazenado em cache (${this.imageCache.size}/${this.maxCacheSize}).`);
  }

  /**
   * Remove o item menos recentemente acessado do cache
   */
  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTimestamp = Infinity;
    
    // Encontra o item menos recentemente acessado
    for (const [key, item] of this.imageCache.entries()) {
      if (item.lastAccessed < oldestTimestamp) {
        oldestTimestamp = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    // Remove do cache
    if (oldestKey) {
      this.imageCache.delete(oldestKey);
      console.log(`🧹 Item removido do cache (política LRU).`);
    }
  }

  /**
   * Limpa todo o cache
   */
  clearCache() {
    this.imageCache.clear();
    console.log(`🧼 Cache limpo completamente.`);
  }

  /**
   * Obtém estatísticas do cache
   * @returns {Object} Estatísticas do uso do cache
   */
  getStats() {
    return {
      size: this.imageCache.size,
      maxSize: this.maxCacheSize,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.cacheHits + this.cacheMisses > 0 
        ? (this.cacheHits / (this.cacheHits + this.cacheMisses)).toFixed(2) 
        : 0,
      enabled: this.enabled
    };
  }

  /**
   * Habilita ou desabilita o cache
   * @param {boolean} enabled - Se o cache deve estar ativo
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} Cache ${enabled ? 'habilitado' : 'desabilitado'}.`);
  }
}

// Exporta uma instância única
export default new CacheHelper(); 