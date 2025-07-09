/**
 * Utilitários especializados para quebrar cache agressivo da API Gemini
 * 
 * A API Gemini tem um cache interno muito agressivo que reconhece imagens idênticas
 * independente do nome do arquivo ou cache breaks básicos. Este módulo implementa
 * múltiplas estratégias para contornar esse comportamento.
 */

class AntiCacheHelper {
  /**
   * Gera identificadores únicos para quebrar cache
   */
  static generateUniqueIdentifiers() {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const microtime = (performance.now() * 1000).toFixed(0);
    const sessionId = Math.random().toString(36).substring(2, 10);
    const processId = Math.random().toString(16).substring(2, 8);
    const uuid = `${timestamp}-${Math.random()}`;
    const hash = Math.random().toString(16).substring(2);
    const counter = Math.floor(Math.random() * 999999);

    return {
      timestamp,
      randomId,
      microtime,
      sessionId,
      processId,
      uuid,
      hash,
      counter
    };
  }

  /**
   * Gera cache breakers textuais para adicionar ao prompt
   */
  static generatePromptCacheBreakers() {
    const ids = this.generateUniqueIdentifiers();
    
    const cacheBreakers = [
      `[TIMESTAMP: ${ids.timestamp}]`,
      `[SESSION: ${ids.sessionId}]`,
      `[PROCESS: ${ids.processId}]`,
      `[RANDOM: ${ids.randomId}]`,
      `[MICRO: ${ids.microtime}]`,
      `[HASH: ${ids.hash}]`,
      `[UUID: ${ids.uuid}]`,
      `[COUNTER: ${ids.counter}]`
    ];

    const textVariations = [
      '\n\n--- Análise única para esta requisição ---',
      '\n\n*** Processamento individual desta imagem ***',
      '\n\n<<< Solicitação específica e única >>>',
      '\n\n=== Análise dedicada para este documento ===',
      '\n\n### Processamento exclusivo desta imagem ###',
      '\n\n+++ Análise personalizada para este arquivo +++',
      '\n\n>>> Processamento dedicado desta imagem <<<',
      '\n\n... Análise individual e única ...'
    ];

    const randomText = textVariations[Math.floor(Math.random() * textVariations.length)];
    const cacheBreaker = cacheBreakers.join(' ');

    return { randomText, cacheBreaker };
  }

  /**
   * Aplica estratégias anti-cache ao prompt
   * @param {string} originalPrompt - Prompt original
   * @param {boolean} isTestPrompt - Se é um prompt de teste
   * @returns {string} Prompt modificado com anti-cache
   */
  static applyPromptAntiCache(originalPrompt, isTestPrompt = false) {
    // Não aplica anti-cache em prompts de teste
    if (isTestPrompt) {
      return originalPrompt;
    }

    const { randomText, cacheBreaker } = this.generatePromptCacheBreakers();
    return `${originalPrompt}${randomText}\n${cacheBreaker}`;
  }

  /**
   * Gera configurações de geração variadas para quebrar cache
   * @returns {Object} Configuração de geração única
   */
  static generateAntiCacheConfig() {
    return {
      temperature: 0.1 + (Math.random() * 0.1), // Varia entre 0.1 e 0.2
      topK: 40 + Math.floor(Math.random() * 10), // Varia entre 40 e 50
      topP: 0.95 + (Math.random() * 0.04), // Varia entre 0.95 e 0.99
      maxOutputTokens: 8192,
      candidateCount: 1,
      stopSequences: [],
    };
  }

  /**
   * Estratégia de retry com variações progressivas
   * Cada retry usa configurações mais diversas para quebrar cache
   * @param {number} attempt - Número da tentativa (0, 1, 2...)
   * @returns {Object} Configuração específica para a tentativa
   */
  static getRetryConfig(attempt = 0) {
    const baseVariation = attempt * 0.02; // Aumenta variação a cada retry
    
    return {
      temperature: 0.1 + baseVariation + (Math.random() * 0.05),
      topK: 40 + (attempt * 5) + Math.floor(Math.random() * 5),
      topP: 0.95 + baseVariation + (Math.random() * 0.02),
      maxOutputTokens: 8192,
      candidateCount: 1,
      stopSequences: [],
    };
  }

  /**
   * Adiciona variações contextuais ao prompt baseadas no arquivo
   * Usar informações do nome do arquivo para tornar cada requisição única
   * @param {string} prompt - Prompt base
   * @param {string} fileName - Nome do arquivo sendo processado
   * @param {number} fileIndex - Índice do arquivo no lote (opcional)
   * @returns {string} Prompt com contexto específico
   */
  static addFileSpecificContext(prompt, fileName = '', fileIndex = null) {
    const fileHash = this.simpleHash(fileName);
    const indexInfo = fileIndex !== null ? `[BATCH_INDEX: ${fileIndex}]` : '';
    const fileInfo = fileName ? `[FILE: ${fileName.substring(0, 10)}...]` : '';
    const hashInfo = `[FILE_HASH: ${fileHash}]`;
    
    const contextInfo = `\n\n--- Contexto específico ---\n${fileInfo} ${indexInfo} ${hashInfo}`;
    
    return prompt + contextInfo;
  }

  /**
   * Gera hash simples de uma string para identificação
   * @param {string} str - String para hash
   * @returns {string} Hash simples
   */
  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converte para 32-bit
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Estratégia completa anti-cache que combina todas as técnicas
   * @param {string} originalPrompt - Prompt original
   * @param {string} fileName - Nome do arquivo
   * @param {number} fileIndex - Índice no lote
   * @param {number} attempt - Número da tentativa
   * @returns {Object} Prompt e configuração otimizados anti-cache
   */
  static applyFullAntiCache(originalPrompt, fileName = '', fileIndex = null, attempt = 0) {
    // Verifica se é prompt de teste
    const isTestPrompt = originalPrompt && (
      originalPrompt.toLowerCase().includes('pizza') ||
      originalPrompt.toLowerCase().includes('teste') ||
      originalPrompt.length < 50
    );

    let modifiedPrompt = originalPrompt;

    if (!isTestPrompt) {
      // Aplica todas as estratégias
      modifiedPrompt = this.applyPromptAntiCache(originalPrompt);
      modifiedPrompt = this.addFileSpecificContext(modifiedPrompt, fileName, fileIndex);

      // Log das estratégias aplicadas
      this.logAntiCacheStrategy(fileName, attempt);
    }

    const generationConfig = this.getRetryConfig(attempt);

    return {
      prompt: modifiedPrompt,
      generationConfig,
      isTestPrompt
    };
  }

  /**
   * Log das estratégias aplicadas para debug
   * @param {string} fileName - Nome do arquivo
   * @param {number} attempt - Número da tentativa
   */
  static logAntiCacheStrategy(fileName, attempt = 0) {
    console.log(`🔧 Anti-cache aplicado para: ${fileName}`);
    console.log(`📊 Tentativa: ${attempt + 1}`);
    console.log(`🎲 Variação configurada para tentativa ${attempt}`);
  }
}

export default AntiCacheHelper; 