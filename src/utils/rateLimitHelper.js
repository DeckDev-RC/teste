/**
 * Utilitários para gerenciamento de rate limits da API do Gemini
 */

/**
 * Informações sobre os limites da API do Gemini (plano gratuito)
 */
export const GEMINI_RATE_LIMITS = {
  FREE_TIER: {
    REQUESTS_PER_MINUTE: 15,
    REQUESTS_PER_DAY: 1500,
    TOKENS_PER_MINUTE: 32000,
    TOKENS_PER_DAY: 50000
  },
  RECOMMENDED_DELAYS: {
    BETWEEN_REQUESTS: 4000, // 4 segundos (15 req/min = 1 req/4s)
    AFTER_429_ERROR: 60000, // 1 minuto após erro 429
    RETRY_BACKOFF: [5000, 15000, 30000] // Backoff exponencial
  }
};

/**
 * Classe para gerenciar rate limits
 */
export class RateLimitManager {
  constructor() {
    this.requestHistory = [];
    this.lastRequestTime = 0;
  }

  /**
   * Registra uma requisição
   */
  recordRequest() {
    const now = Date.now();
    this.requestHistory.push(now);
    this.lastRequestTime = now;
    
    // Remove requisições antigas (mais de 1 minuto)
    this.requestHistory = this.requestHistory.filter(
      time => now - time < 60000
    );
  }

  /**
   * Verifica se pode fazer uma nova requisição
   * @returns {Object} Status do rate limit
   */
  canMakeRequest() {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(
      time => now - time < 60000
    );

    const timeSinceLastRequest = now - this.lastRequestTime;
    const needsDelay = timeSinceLastRequest < GEMINI_RATE_LIMITS.RECOMMENDED_DELAYS.BETWEEN_REQUESTS;
    const delayNeeded = needsDelay ? 
      GEMINI_RATE_LIMITS.RECOMMENDED_DELAYS.BETWEEN_REQUESTS - timeSinceLastRequest : 0;

    return {
      canRequest: !needsDelay && recentRequests.length < GEMINI_RATE_LIMITS.FREE_TIER.REQUESTS_PER_MINUTE,
      requestsInLastMinute: recentRequests.length,
      maxRequestsPerMinute: GEMINI_RATE_LIMITS.FREE_TIER.REQUESTS_PER_MINUTE,
      delayNeeded,
      timeSinceLastRequest
    };
  }

  /**
   * Aguarda o tempo necessário antes da próxima requisição
   */
  async waitIfNeeded() {
    const status = this.canMakeRequest();
    if (status.delayNeeded > 0) {
      console.log(`⏳ Aguardando ${status.delayNeeded}ms para respeitar rate limit...`);
      await new Promise(resolve => setTimeout(resolve, status.delayNeeded));
    }
  }

  /**
   * Calcula tempo estimado para processar múltiplas requisições
   * @param {number} requestCount - Número de requisições
   * @returns {Object} Estimativa de tempo
   */
  estimateProcessingTime(requestCount) {
    const delayBetweenRequests = GEMINI_RATE_LIMITS.RECOMMENDED_DELAYS.BETWEEN_REQUESTS;
    const totalDelayTime = (requestCount - 1) * delayBetweenRequests;
    const estimatedRequestTime = requestCount * 3000; // ~3s por requisição
    const totalTime = totalDelayTime + estimatedRequestTime;

    return {
      totalTimeMs: totalTime,
      totalTimeMinutes: Math.ceil(totalTime / 60000),
      delayTimeMs: totalDelayTime,
      requestTimeMs: estimatedRequestTime,
      requestCount
    };
  }
}

/**
 * Extrai informações de erro de rate limit
 * @param {Error} error - Erro da API
 * @returns {Object} Informações do erro
 */
export function parseRateLimitError(error) {
  const errorMessage = error.message;
  
  // Extrai delay de retry
  const retryMatch = errorMessage.match(/"retryDelay":"(\d+)s"/);
  const retryDelay = retryMatch ? parseInt(retryMatch[1]) * 1000 : 60000;
  
  // Extrai informações de quota
  const quotaMatch = errorMessage.match(/"quotaValue":"(\d+)"/);
  const quotaLimit = quotaMatch ? parseInt(quotaMatch[1]) : 15;
  
  // Verifica se é erro 429
  const is429Error = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');
  
  return {
    is429Error,
    retryDelay,
    quotaLimit,
    errorMessage: errorMessage,
    recommendation: is429Error ? 
      `Aguarde ${retryDelay/1000} segundos antes de tentar novamente. Limite: ${quotaLimit} requisições por minuto.` :
      'Erro não relacionado a rate limit.'
  };
}

/**
 * Formata tempo em formato legível
 * @param {number} milliseconds - Tempo em milissegundos
 * @returns {string} Tempo formatado
 */
export function formatTime(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Gera dicas para otimizar uso da API
 * @param {number} imageCount - Número de imagens a processar
 * @returns {Array} Lista de dicas
 */
export function getOptimizationTips(imageCount) {
  const tips = [];
  
  if (imageCount > 15) {
    tips.push('⚠️ Você tem mais de 15 imagens. Considere processar em lotes menores.');
    tips.push('💡 O plano gratuito permite 15 requisições por minuto.');
  }
  
  if (imageCount > 5) {
    tips.push('⏱️ Processamento sequencial será usado para evitar rate limits.');
    tips.push('☕ Aproveite para tomar um café - isso pode demorar alguns minutos.');
  }
  
  tips.push('🔄 Se houver erros de rate limit, o sistema tentará automaticamente após o delay sugerido.');
  tips.push('📊 Considere fazer upgrade para o plano pago para limites maiores.');
  
  return tips;
}

export default {
  GEMINI_RATE_LIMITS,
  RateLimitManager,
  parseRateLimitError,
  formatTime,
  getOptimizationTips
}; 