/**
 * Utilitários para manipulação de nomes de arquivo
 */

/**
 * Sanitiza uma string para ser usada como nome de arquivo
 * @param {string} text - Texto a ser sanitizado
 * @param {number} maxLength - Comprimento máximo do nome (padrão: 100)
 * @returns {string} - Nome de arquivo sanitizado
 */
export function sanitizeFileName(text, maxLength = 100) {
  if (!text || typeof text !== 'string') {
    return 'arquivo_sem_nome';
  }

  // Remove apenas caracteres realmente problemáticos para nomes de arquivo
  let sanitized = text
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove caracteres proibidos no Windows
    .replace(/\s{2,}/g, ' ') // Substitui múltiplos espaços por um único espaço
    .replace(/^[._\-\s]+|[._\-\s]+$/g, ''); // Remove pontos, underscores, hífens e espaços do início e fim

  // Limita o comprimento
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }

  // Garante que não está vazio
  if (!sanitized) {
    sanitized = 'arquivo_sem_nome';
  }

  return sanitized;
}

/**
 * Gera um nome de arquivo baseado na análise do Gemini
 * @param {string} analysis - Resposta da análise do Gemini
 * @param {string} analysisType - Tipo de análise realizada
 * @param {string} originalExtension - Extensão original do arquivo
 * @returns {string} - Nome de arquivo gerado
 */
export function generateFileNameFromAnalysis(analysis, analysisType, originalExtension) {
  if (!analysis || typeof analysis !== 'string') {
    return `analise_${analysisType}_${Date.now()}${originalExtension}`;
  }

  let fileName = '';

  // Para documentos financeiros, tenta extrair informações estruturadas
  if (analysisType === 'financial-receipt' || analysisType === 'financial-payment') {
    fileName = generateReceiptFileName(analysis);
  } else {
    // Para outros tipos, usa as primeiras palavras da análise
    fileName = generateGeneralFileName(analysis, analysisType);
  }

  // Sanitiza o nome
  fileName = sanitizeFileName(fileName, 80); // Deixa espaço para extensão

  // Adiciona a extensão
  return `${fileName}${originalExtension}`;
}

/**
 * Gera nome de arquivo específico para comprovantes
 * @param {string} analysis - Análise do comprovante
 * @returns {string} - Nome base do arquivo
 */
function generateReceiptFileName(analysis) {
  try {
    // Tenta extrair do novo formato: "XX-XX VENDA XXXX NOME XXX,XX"
    const lines = analysis.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Primeiro tenta o novo formato com VENDA
      const newFormatMatch = line.match(/(\d{2}-\d{2})\s+VENDA\s+(\w+)\s+(.+?)\s+(\d+[,.]?\d*)/i);
      if (newFormatMatch) {
        const [, date, vendaNumber, name, value] = newFormatMatch;
        return `${date} VENDA ${vendaNumber} ${name.trim()} ${value}`;
      }
      
      // Fallback para o formato antigo: "XX-XX NOME XXX,XX"
      const oldFormatMatch = line.match(/(\d{2}-\d{2})\s+(.+?)\s+(\d+[,.]?\d*)/);
      if (oldFormatMatch) {
        const [, date, name, value] = oldFormatMatch;
        return `${date} ${name.trim()} ${value}`;
      }
    }

    // Se não conseguir extrair, usa as primeiras palavras
    const words = analysis.split(/\s+/).slice(0, 6).join(' '); // Aumentei para 6 para incluir VENDA XXXX
    return words || 'comprovante';
  } catch (error) {
    return 'comprovante';
  }
}

/**
 * Gera nome de arquivo geral baseado na análise
 * @param {string} analysis - Análise da imagem
 * @param {string} analysisType - Tipo de análise
 * @returns {string} - Nome base do arquivo
 */
function generateGeneralFileName(analysis, analysisType) {
  try {
    // Pega as primeiras palavras significativas da análise
    const words = analysis
      .split(/[.!?]/) // Divide por pontuação
      .find(sentence => sentence.trim().length > 10) // Pega a primeira frase com mais de 10 caracteres
      ?.split(/\s+/) // Divide em palavras
      .filter(word => word.length > 2) // Remove palavras muito pequenas
      .slice(0, 4) // Pega as primeiras 4 palavras
      .join(' ');

    return words || `analise ${analysisType}`;
  } catch (error) {
    return `analise ${analysisType}`;
  }
}

/**
 * Gera um nome único adicionando timestamp se necessário
 * @param {string} fileName - Nome base do arquivo
 * @param {Set} existingNames - Conjunto de nomes já existentes
 * @returns {string} - Nome único
 */
export function generateUniqueName(fileName, existingNames = new Set()) {
  if (!existingNames.has(fileName)) {
    return fileName;
  }

  const timestamp = Date.now();
  const [name, extension] = fileName.split(/\.(?=[^.]+$)/);
  return `${name}_${timestamp}.${extension}`;
}

export default {
  sanitizeFileName,
  generateFileNameFromAnalysis,
  generateUniqueName
}; 