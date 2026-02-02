/**
 * Sistema de armazenamento temporário para resultados de análises
 * Funciona como um banco de dados em memória para evitar múltiplas análises da mesma imagem
 * Os resultados são armazenados por lote e limpos após o download do ZIP
 * 
 * Suporta processamento de grandes lotes divididos em partes para contornar
 * a limitação de cache de 1000 imagens por requisição
 */

class AnalysisStore {
  constructor() {
    this.store = new Map();
    this.batchStore = new Map(); // Armazena grupos de análises por ID de lote
    this.batchMetadata = new Map(); // Armazena metadados dos lotes grandes
    this.hits = 0;
    this.misses = 0;

    // Configurações de Memória
    this.DEFAULT_TTL = 60 * 60 * 1000; // 1 hora em milissegundos
    this.MAX_STORE_SIZE = 5000; // Limite máximo de entradas no store global
    this.lastMaintenance = Date.now();
    this.MAINTENANCE_INTERVAL = 5 * 60 * 1000; // Executa limpeza a cada 5 minutos
  }

  /**
   * Gera uma chave única para cada análise
   * @param {string} fileName - Nome do arquivo original
   * @param {string} fileHash - Hash do conteúdo do arquivo (opcional)
   * @param {string} analysisType - Tipo de análise solicitada
   * @param {string} company - ID da empresa (para diferenciar prompts)
   * @returns {string} - Chave única
   */
  generateKey(fileName, fileHash = '', analysisType, company = '') {
    return `${fileName}_${fileHash}_${analysisType}_${company}`;
  }

  /**
   * Armazena o resultado de uma análise
   * @param {string} fileName - Nome do arquivo original
   * @param {string} fileHash - Hash do conteúdo do arquivo (opcional)
   * @param {string} analysisType - Tipo de análise solicitada
   * @param {any} result - Resultado da análise
   * @param {string} batchId - ID do lote (opcional)
   * @param {string} company - ID da empresa (para diferenciar prompts)
   */
  storeAnalysis(fileName, fileHash, analysisType, result, batchId = null, company = '') {
    // Executa manutenção periódica
    this.checkMaintenance();

    const key = this.generateKey(fileName, fileHash, analysisType, company);

    // Se o store estiver muito cheio, remove a entrada mais antiga (FIFO simplificado)
    if (this.store.size >= this.MAX_STORE_SIZE && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
      console.log(`⚠️ Store cheio. Removendo entrada antiga para dar espaço.`);
    }

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
   * @param {string} company - ID da empresa (para diferenciar prompts)
   * @returns {any|null} - Resultado da análise ou null se não encontrado
   */
  getAnalysis(fileName, fileHash, analysisType, company = '') {
    const key = this.generateKey(fileName, fileHash, analysisType, company);

    if (this.store.has(key)) {
      const entry = this.store.get(key);

      // Verifica se a entrada expirou (TTL)
      if (Date.now() - entry.timestamp > this.DEFAULT_TTL) {
        console.log(`⏱️ Entrada expirada (TTL) para "${fileName}". Removendo.`);
        this.store.delete(key);
        this.misses++;
        return null;
      }

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
   * Armazena metadados de um lote grande
   * @param {string} batchId - ID do lote
   * @param {object} metadata - Metadados do lote
   */
  storeBatchMetadata(batchId, metadata) {
    this.batchMetadata.set(batchId, {
      ...metadata,
      updatedAt: Date.now()
    });
    console.log(`📝 Metadados armazenados para o lote ${batchId}`);
  }

  /**
   * Atualiza metadados de um lote grande
   * @param {string} batchId - ID do lote
   * @param {object} metadata - Novos metadados a serem mesclados
   */
  updateBatchMetadata(batchId, metadata) {
    if (!this.batchMetadata.has(batchId)) {
      console.warn(`⚠️ Tentativa de atualizar metadados para lote inexistente ${batchId}`);
      return false;
    }

    const currentMetadata = this.batchMetadata.get(batchId);
    this.batchMetadata.set(batchId, {
      ...currentMetadata,
      ...metadata,
      updatedAt: Date.now()
    });

    console.log(`🔄 Metadados atualizados para o lote ${batchId}`);
    return true;
  }

  /**
   * Obtém metadados de um lote grande
   * @param {string} batchId - ID do lote
   * @returns {object|null} - Metadados do lote ou null se não encontrado
   */
  getBatchMetadata(batchId) {
    if (!this.batchMetadata.has(batchId)) {
      console.log(`⚠️ Metadados não encontrados para o lote ${batchId}`);
      return null;
    }

    return this.batchMetadata.get(batchId);
  }

  /**
   * Obtém todas as análises associadas a um lote
   * @param {string} batchId - ID do lote
   * @returns {object|null} - Objeto com todas as análises do lote ou null se não encontrado
   */
  getBatchAnalyses(batchId) {
    if (!this.batchStore.has(batchId)) {
      console.log(`⚠️ Lote ${batchId} não encontrado no armazenamento`);
      return null;
    }

    const keys = this.batchStore.get(batchId);
    const analyses = {};

    for (const key of keys) {
      if (this.store.has(key)) {
        const entry = this.store.get(key);
        // Usa um formato de chave mais amigável para o resultado
        const newKey = `${entry.fileName}|${key.split('_')[1]}|${entry.analysisType}`;
        analyses[newKey] = entry.result;
      }
    }

    return analyses;
  }

  /**
   * Executa manutenção no store para remover entradas expiradas e lotes órfãos
   */
  checkMaintenance() {
    const now = Date.now();
    if (now - this.lastMaintenance < this.MAINTENANCE_INTERVAL) return;

    this.lastMaintenance = now;
    console.log(`🧹 Iniciando manutenção automática do AnalysisStore...`);

    let expiredCount = 0;

    // Limpa entradas expiradas do store principal
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > this.DEFAULT_TTL) {
        this.store.delete(key);
        expiredCount++;
      }
    }

    // Limpa lotes vazios (órfãos)
    for (const [batchId, keys] of this.batchStore.entries()) {
      // Remove chaves do Set que não existem mais no store principal
      for (const key of keys) {
        if (!this.store.has(key)) {
          keys.delete(key);
        }
      }

      // Se o lote ficou vazio e não tem metadados recentes, remove
      if (keys.size === 0) {
        const metadata = this.batchMetadata.get(batchId);
        if (!metadata || (now - metadata.updatedAt > this.DEFAULT_TTL)) {
          this.batchStore.delete(batchId);
          this.batchMetadata.delete(batchId);
        }
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 Manutenção concluída: ${expiredCount} entradas expiradas removidas.`);
    }
  }

  /**
   * Retorna estatísticas do armazenamento
   */
  getStats() {
    return {
      size: this.store.size,
      batchCount: this.batchStore.size,
      batchMetadataCount: this.batchMetadata.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses)).toFixed(2)
        : 0,
      uptime: Date.now() - this.lastMaintenance
    };
  }
}

// Exporta uma instância única
export default new AnalysisStore();