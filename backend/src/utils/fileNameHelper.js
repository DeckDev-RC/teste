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
    .replace(/[<>:"/\\|?*+()]/g, '') // Remove caracteres proibidos no Windows + sinais de + e parênteses
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
 * @param {string} pattern - Padrão de renomeação (opcional)
 * @returns {string} - Nome de arquivo gerado
 */
export function generateFileNameFromAnalysis(analysis, analysisType, originalExtension, pattern = null) {
  if (!analysis || typeof analysis !== 'string') {
    return `analise_${analysisType}_${Date.now()}${originalExtension}`;
  }

  let fileName = '';

  // Se houver um padrão definido no banco de dados, usamos ele
  if (pattern) {
    fileName = applyTemplate(analysis, pattern);
  }

  // Se não houver padrão ou se falhar, usa a lógica atual
  if (!fileName) {
    if (analysisType === 'financial-receipt' || analysisType === 'financial-payment') {
      fileName = generateReceiptFileName(analysis);
    } else {
      fileName = generateGeneralFileName(analysis, analysisType);
    }
  }

  // Sanitiza o nome
  fileName = sanitizeFileName(fileName, 80);

  return `${fileName}${originalExtension}`;
}

/**
 * Aplica um template de renomeação usando tags {{}}
 * @param {string} analysis - Texto da análise
 * @param {string} template - Template (ex: "{{DATA}} {{VALOR}}")
 * @returns {string|null} - Nome formatado ou null se falhar
 */
function applyTemplate(analysis, template) {
  try {
    // Tenta extrair variáveis comuns da string de análise
    // A string geralmente é: "XX-XX VENDA XXXX NOME XXX,XX" ou similar

    const vars = {};

    // 1. Extração Dinâmica (KEY: VALUE)
    // Procura por qualquer linha que comece com uma palavra alta seguidade de dois pontos
    // Ex: "VENCIMENTO: 10-05" -> vars['VENCIMENTO'] = '10-05'
    const lines = analysis.split('\n');
    lines.forEach(line => {
      const dynamicMatch = line.match(/^([A-ZÀ-Ú_]+):\s*(.+)$/i);
      if (dynamicMatch) {
        const key = dynamicMatch[1].toUpperCase().trim();
        const value = dynamicMatch[2].trim();
        vars[key] = value;
      }
    });

    // 2. Extração Legada/Específica (Fallback/Compatibilidade)
    // 1. Tentar extrair data (XX-XX) se não houver tag DATA
    if (!vars['DATA']) {
      const dateMatch = analysis.match(/(\d{2}-\d{2})/);
      if (dateMatch) vars['DATA'] = dateMatch[1];
    }

    // 2. Tentar extrair valor se não houver tag VALOR
    if (!vars['VALOR']) {
      const valueMatch = analysis.match(/(\d+[,.]\d{2})$/);
      if (valueMatch) vars['VALOR'] = valueMatch[1];
    }

    // 3. Tentar extrair número de venda se não houver tag VENDA
    if (!vars['VENDA']) {
      const vendaMatch = analysis.match(/VENDA\s+(\d+)/i);
      if (vendaMatch) vars['VENDA'] = vendaMatch[1];
    }

    // 4. Se for um padrão de nome que sabemos extrair por partes:
    // "XX-XX VENDA 1234 NOME DO CLIENTE 100,00"
    const fullMatch = analysis.match(/(\d{2}-\d{2})\s+VENDA\s+(\d+)\s+(.+?)\s+(\d+[,.]\d{2})/i);
    if (fullMatch && !vars['NOME']) {
      vars['DATA'] = fullMatch[1];
      vars['VENDA'] = fullMatch[2];
      vars['NOME'] = fullMatch[3].trim();
      vars['VALOR'] = fullMatch[4];
    }

    // Substitui cada {{VAR}} pelo valor encontrado
    let result = template;
    Object.keys(vars).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, vars[key]);
    });

    // Se ainda sobrar chaves não preenchidas, tenta limpar ou usar a string original
    if (result.includes('{{')) {
      // Se o template falhou em preencher tudo, voltamos para null para usar o fallback
      return null;
    }

    return result;
  } catch (error) {
    console.error('Erro ao aplicar template:', error);
    return null;
  }
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