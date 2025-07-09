/**
 * Sistema de armazenamento temporário para resultados de análises
 * Funciona como um banco de dados em memória para evitar múltiplas análises da mesma imagem
 * Os resultados são armazenados por lote e limpos após o download do ZIP
 */

class AnalysisStore {
  constructor() {
    this.store = new Map();
    this.batchStore = new Map(); // Armazena grupos de análises por ID de lote
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Gera uma chave única para cada análise
   * @param {string} fileName - Nome do arquivo original
   * @param {string} fileHash - Hash do conteúdo do arquivo (opcional)
   * @param {string} analysisType - Tipo de análise solicitada
   * @returns {string} - Chave única
   */
  generateKey(fileName, fileHash = '', analysisType) {
    return `${fileName}_${fileHash}_${analysisType}`;
  }

  /**
   * Armazena o resultado de uma análise
   * @param {string} fileName - Nome do arquivo original
   * @param {string} fileHash - Hash do conteúdo do arquivo (opcional)
   * @param {string} analysisType - Tipo de análise solicitada
   * @param {any} result - Resultado da análise
   * @param {string} batchId - ID do lote (opcional)
   */
  storeAnalysis(fileName, fileHash, analysisType, result, batchId = null) {
    const key = this.generateKey(fileName, fileHash, analysisType);
    
    this.store.set(key, {
      result,
      timestamp: Date.now(),
      fileName,
      analysisType,
      batchId
    });
    
    // Se tiver um ID de lote, adiciona a chave ao lote
    if (batchId) {
      if (!this.batchStore.has(batchId)) {
        this.batchStore.set(batchId, new Set());
      }
      this.batchStore.get(batchId).add(key);
    }
    
    console.log(`💾 Resultado armazenado para "${fileName}" (${analysisType})${batchId ? ` no lote ${batchId}` : ''}`);
  }

  /**
   * Recupera o resultado de uma análise previamente armazenada
   * @param {string} fileName - Nome do arquivo original
   * @param {string} fileHash - Hash do conteúdo do arquivo (opcional)
   * @param {string} analysisType - Tipo de análise solicitada
   * @returns {any|null} - Resultado da análise ou null se não encontrado
   */
  getAnalysis(fileName, fileHash, analysisType) {
    const key = this.generateKey(fileName, fileHash, analysisType);
    
    if (this.store.has(key)) {
      const entry = this.store.get(key);
      this.hits++;
      console.log(`🎯 Resultado encontrado em armazenamento para "${fileName}"`);
      return entry.result;
    }
    
    this.misses++;
    console.log(`🔍 Nenhum resultado armazenado para "${fileName}"`);
    return null;
  }

  /**
   * Limpa todas as entradas do armazenamento
   */
  clearAll() {
    const count = this.store.size;
    this.store.clear();
    this.batchStore.clear();
    console.log(`🧹 Armazenamento limpo (${count} entradas removidas)`);
  }

  /**
   * Limpa todas as entradas de um lote específico
   * @param {string} batchId - ID do lote a ser limpo
   * @returns {number} - Número de entradas removidas
   */
  clearBatch(batchId) {
    if (!this.batchStore.has(batchId)) {
      console.log(`⚠️ Lote ${batchId} não encontrado no armazenamento`);
      return 0;
    }
    
    const keys = this.batchStore.get(batchId);
    let removedCount = 0;
    
    for (const key of keys) {
      if (this.store.delete(key)) {
        removedCount++;
      }
    }
    
    // Remove o lote do controle de lotes
    this.batchStore.delete(batchId);
    
    console.log(`🧹 Lote ${batchId} limpo (${removedCount} entradas removidas)`);
    return removedCount;
  }

  /**
   * Retorna estatísticas do armazenamento
   */
  getStats() {
    return {
      size: this.store.size,
      batchCount: this.batchStore.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 
        ? (this.hits / (this.hits + this.misses)).toFixed(2) 
        : 0
    };
  }
}

// Exporta uma instância única
export default new AnalysisStore(); 