/**
 * Gerenciador de Análises Paralelas
 * Distribui o processamento de análises entre múltiplas chaves de API
 * para maximizar o desempenho e utilização das chaves disponíveis
 */

import geminiConfig from '../config/gemini.js';
import apiKeyManager from './apiKeyManager.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AntiCacheHelper from './antiCacheHelper.js';
import CacheHelper from './cacheHelper.js';

class ParallelAnalysisManager {
  constructor() {
    // Número máximo de análises paralelas (uma por chave)
    this.maxParallelAnalyses = apiKeyManager.apiKeys.length;
    
    // Fila de análises pendentes
    this.pendingAnalyses = [];
    
    // Análises em andamento
    this.runningAnalyses = new Map();
    
    // Contadores
    this.completedAnalyses = 0;
    this.failedAnalyses = 0;
    
    // Status de processamento
    this.isProcessing = false;
    
    // Instâncias de API por chave
    this.apiInstances = new Map();
    
    console.log(`🚀 Gerenciador de análises paralelas inicializado com capacidade para ${this.maxParallelAnalyses} análises simultâneas`);
  }
  
  /**
   * Obtém uma instância da API para uma chave específica
   * @param {string} apiKey - Chave de API
   * @returns {Object} Instância da API Gemini
   */
  getApiInstance(apiKey) {
    if (!this.apiInstances.has(apiKey)) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.apiInstances.set(apiKey, genAI);
    }
    return this.apiInstances.get(apiKey);
  }

  /**
   * Adiciona uma análise à fila de processamento
   * @param {Object} analysisData - Dados da análise
   * @param {string} analysisData.imageData - Dados da imagem em base64
   * @param {string} analysisData.mimeType - Tipo MIME da imagem
   * @param {string} analysisData.prompt - Prompt para análise
   * @param {string} analysisData.fileName - Nome do arquivo (opcional)
   * @param {number} analysisData.fileIndex - Índice do arquivo no lote (opcional)
   * @param {boolean} analysisData.forceStructuredFormat - Se deve forçar formato estruturado
   * @param {string} analysisData.company - ID da empresa (opcional)
   * @returns {Promise} Promessa que resolve com o resultado da análise
   */
  queueAnalysis(analysisData) {
    return new Promise((resolve, reject) => {
      // Adiciona à fila com callbacks para resolução
      this.pendingAnalyses.push({
        ...analysisData,
        company: analysisData.company || null, // Garante que a propriedade company esteja presente
        resolve,
        reject,
        queued: Date.now()
      });
      
      // Inicia o processamento se não estiver em andamento
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Processa a fila de análises, iniciando análises paralelas quando possível
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    try {
      // Continua processando enquanto houver análises pendentes
      // e slots disponíveis para processamento paralelo
      while (this.pendingAnalyses.length > 0 && 
             this.runningAnalyses.size < this.maxParallelAnalyses) {
        
        // Obtém a próxima análise da fila
        const analysis = this.pendingAnalyses.shift();
        
        // Gera um ID único para esta análise
        const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Obtém a próxima chave disponível
        const apiKey = apiKeyManager.getNextKey();
        
        // Adiciona à lista de análises em andamento
        this.runningAnalyses.set(analysisId, {
          ...analysis,
          apiKey,
          startTime: Date.now()
        });
        
        // Inicia a análise de forma assíncrona
        this.runAnalysis(analysisId, apiKey, analysis)
          .catch(error => {
            console.error(`❌ Erro não tratado em análise paralela: ${error.message}`);
          });
      }
    } finally {
      // Se ainda houver análises pendentes ou em andamento, continua processando
      if (this.pendingAnalyses.length > 0 || this.runningAnalyses.size > 0) {
        setTimeout(() => this.processQueue(), 100);
      } else {
        this.isProcessing = false;
      }
    }
  }

  /**
   * Executa uma análise usando uma chave de API específica
   * @param {string} analysisId - ID da análise
   * @param {string} apiKey - Chave de API a ser usada
   * @param {Object} analysis - Dados da análise
   */
  async runAnalysis(analysisId, apiKey, analysis) {
    const { 
      imageData, 
      mimeType = 'image/jpeg', 
      prompt, 
      fileName = '', 
      fileIndex = null,
      forceStructuredFormat = true,
      resolve, 
      reject 
    } = analysis;
    
    try {
      console.log(`🔄 Iniciando análise ${analysisId} com chave ${apiKeyManager.maskKey(apiKey)}`);
      
      // Verifica se já temos essa análise em cache
      const cachedResult = CacheHelper.getCachedResult(imageData, prompt, 'receipt');
      if (cachedResult) {
        console.log(`🚀 Usando resultado em cache para ${fileName || analysisId}`);
        resolve(cachedResult);
        this.completeAnalysis(analysisId, true);
        return;
      }
      
      // Aplica estratégias anti-cache
      const antiCacheData = AntiCacheHelper.applyFullAntiCache(
        prompt, 
        fileName, 
        fileIndex, 
        0
      );
      
      // Obtém uma instância da API para esta chave
      const genAI = this.getApiInstance(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Prepara a parte da imagem
      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType
        }
      };
      
      // Executa a análise
      const result = await model.generateContent([antiCacheData.prompt, imagePart], { 
        generationConfig: antiCacheData.generationConfig 
      });
      
      const response = await result.response;
      const rawData = response.text();
      
      // Formata o resultado se necessário
      let finalResult;
      if (forceStructuredFormat && !antiCacheData.isTestPrompt) {
        // Usa a função de formatação do GeminiService
        // Simplificada aqui para evitar dependência circular
        finalResult = this.formatReceiptData(rawData, fileName, analysis.company);
      } else {
        finalResult = rawData;
      }
      
      // Armazena em cache
      CacheHelper.cacheResult(imageData, prompt, 'receipt', finalResult);
      
      // Resolve a promessa com o resultado
      resolve(finalResult);
      
      // Marca como concluída
      this.completeAnalysis(analysisId, true);
      
    } catch (error) {
      console.error(`❌ Erro na análise ${analysisId}: ${error.message}`);
      
      // Verifica se é erro de limite de taxa
      const is429Error = error.message.includes('429') || 
                        error.message.includes('Too Many Requests') || 
                        error.message.includes('quota');
      
      if (is429Error) {
        // Reporta o erro ao gerenciador de chaves
        apiKeyManager.reportError(apiKey, error);
        
        // Recoloca na fila para tentar novamente com outra chave
        console.log(`🔄 Recolocando análise ${analysisId} na fila para tentar com outra chave`);
        
        // Adiciona de volta à fila, mas no início para prioridade
        this.pendingAnalyses.unshift({
          imageData, 
          mimeType, 
          prompt, 
          fileName, 
          fileIndex,
          forceStructuredFormat,
          resolve, 
          reject,
          queued: Date.now(),
          retries: (analysis.retries || 0) + 1
        });
        
        // Se já tentou muitas vezes, falha
        if ((analysis.retries || 0) >= 3) {
          reject(new Error(`Falha após ${analysis.retries} tentativas: ${error.message}`));
          this.completeAnalysis(analysisId, false);
        }
      } else {
        // Para outros erros, falha imediatamente
        reject(error);
        this.completeAnalysis(analysisId, false);
      }
    }
  }

  /**
   * Marca uma análise como concluída
   * @param {string} analysisId - ID da análise
   * @param {boolean} success - Se a análise foi bem-sucedida
   */
  completeAnalysis(analysisId, success) {
    // Remove da lista de análises em andamento
    if (this.runningAnalyses.has(analysisId)) {
      const analysis = this.runningAnalyses.get(analysisId);
      const duration = Date.now() - analysis.startTime;
      
      this.runningAnalyses.delete(analysisId);
      
      // Atualiza contadores
      if (success) {
        this.completedAnalyses++;
        console.log(`✅ Análise ${analysisId} concluída em ${duration}ms`);
      } else {
        this.failedAnalyses++;
        console.log(`❌ Análise ${analysisId} falhou após ${duration}ms`);
      }
    }
    
    // Continua processando a fila
    this.processQueue();
  }

  /**
   * Extrai a data do nome do arquivo no formato DD-MM
   * @param {string} fileName - Nome do arquivo
   * @returns {string|null} Data no formato DD-MM ou null se não encontrada
   */
  extractDateFromFileName(fileName) {
    if (!fileName) return null;
    
    // Remove a extensão do arquivo para evitar confusão com números na extensão
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // Padrão específico para o formato "DD-MM VENDA DINHEIRO VALOR.jpg"
    // Exemplo: "11-04 VENDA DINHEIRO 500,00.jpg"
    const specificPattern = /^(\d{1,2})[-_\/](\d{1,2})\s+VENDA\s+DINHEIRO/i;
    const specificMatch = fileNameWithoutExt.match(specificPattern);
    
    if (specificMatch) {
      const day = specificMatch[1].padStart(2, '0');
      const month = specificMatch[2].padStart(2, '0');
      return `${day}-${month}`;
    }
    
    // Tenta encontrar padrão de data no início do nome do arquivo
    // Suporta formatos DD-MM, DD/MM, DD_MM no início do nome
    const startPattern = /^(\d{1,2})[-_\/](\d{1,2})/;
    const startMatch = fileNameWithoutExt.match(startPattern);
    
    if (startMatch) {
      // Verifica se os números estão dentro de intervalos válidos para dia/mês
      const day = parseInt(startMatch[1], 10);
      const month = parseInt(startMatch[2], 10);
      
      // Validação básica de data
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`;
      }
    }
    
    // Se não encontrou no início, tenta encontrar em qualquer lugar do nome
    // Suporta formatos DD-MM, DD/MM, DD_MM
    const anywherePattern = /(\d{1,2})[-_\/](\d{1,2})/g;
    const matches = [...fileNameWithoutExt.matchAll(anywherePattern)];
    
    // Percorre todas as ocorrências encontradas
    for (const match of matches) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      
      // Validação básica de data
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`;
      }
    }
    
    // Último recurso: procura por números que possam ser dia e mês
    // Padrão para encontrar dois números próximos que possam formar uma data
    const numbersPattern = /(\d{1,2})\D{0,3}(\d{1,2})/;
    const numbersMatch = fileNameWithoutExt.match(numbersPattern);
    
    if (numbersMatch) {
      const num1 = parseInt(numbersMatch[1], 10);
      const num2 = parseInt(numbersMatch[2], 10);
      
      // Tenta determinar qual é o dia e qual é o mês
      if (num1 >= 1 && num1 <= 31 && num2 >= 1 && num2 <= 12) {
        // num1 parece ser dia, num2 parece ser mês
        return `${num1.toString().padStart(2, '0')}-${num2.toString().padStart(2, '0')}`;
      } else if (num2 >= 1 && num2 <= 31 && num1 >= 1 && num1 <= 12) {
        // num2 parece ser dia, num1 parece ser mês
        return `${num2.toString().padStart(2, '0')}-${num1.toString().padStart(2, '0')}`;
      }
    }
    
    return null;
  }

  /**
   * Extrai a descrição entre parênteses do nome do arquivo
   * @param {string} fileName - Nome do arquivo
   * @returns {string|null} Descrição entre parênteses ou null se não encontrada
   */
  extractDescriptionFromFileName(fileName) {
    if (!fileName) return null;
    
    // Remove a extensão do arquivo para evitar confusão com parênteses na extensão
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // Padrão para encontrar texto entre parênteses
    const descriptionPattern = /\(([^)]+)\)/;
    const descriptionMatch = fileNameWithoutExt.match(descriptionPattern);
    
    if (descriptionMatch && descriptionMatch[1]) {
      return descriptionMatch[1].trim();
    }
    
    return null;
  }
  
  /**
   * Formata um valor monetário para o padrão brasileiro
   * @param {string} valor Valor a ser formatado
   * @returns {string} Valor formatado
   */
  formatarValor(valor) {
    // Primeiro, remove qualquer separador de milhares (pontos em valores como 1.250,00)
    // e converte para um formato numérico padrão com ponto como separador decimal
    let valorNumerico = valor;
    
    // Se o valor tem vírgula e ponto, assume que o ponto é separador de milhares
    // e a vírgula é o separador decimal (formato brasileiro: 1.250,00)
    if (valor.includes('.') && valor.includes(',')) {
      // Remove os pontos e substitui a vírgula por ponto
      valorNumerico = valor.replace(/\./g, '').replace(',', '.');
    } 
    // Se tem apenas ponto, assume que é separador decimal (formato internacional: 1250.00)
    else if (valor.includes('.')) {
      valorNumerico = valor;
    }
    // Se tem apenas vírgula, assume que é separador decimal (formato brasileiro: 1250,00)
    else if (valor.includes(',')) {
      valorNumerico = valor.replace(',', '.');
    }
    
    // Converte para número e depois de volta para string no formato brasileiro
    const numero = parseFloat(valorNumerico);
    if (!isNaN(numero)) {
      // Formata com 2 casas decimais e substitui o ponto por vírgula
      return numero.toFixed(2).replace('.', ',');
    }
    
    // Se não conseguiu converter, retorna o valor original com zeros adicionados se necessário
    if (!valor.includes(',')) {
      return valor + ',00';
    } else {
      const partes = valor.split(',');
      if (partes[1].length === 1) {
        return partes[0] + ',' + partes[1] + '0';
      }
    }
    
    return valor;
  }

  /**
   * Formata os dados extraídos do comprovante (versão simplificada)
   * @param {string} rawData - Dados brutos extraídos
   * @param {string} fileName - Nome do arquivo (opcional)
   * @param {string} company - ID da empresa (opcional)
   * @returns {string} Dados formatados
   */
  formatReceiptData(rawData, fileName = null, company = null) {
    // Remove quebras de linha e espaços extras
    let formatted = rawData.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Se temos informações de empresa e nome do arquivo, podemos fazer formatações específicas
    if (company === 'fliper' && fileName) {
      // Extrai a descrição entre parênteses do nome do arquivo
      const fileDescription = this.extractDescriptionFromFileName(fileName);
      
      // Verifica se temos uma descrição e se os dados contêm informações de data, nome e valor
      if (fileDescription) {
        // Extrai informações do texto formatado
        // Procura por padrões como "DATA: 02-07" ou "DATA: 02/07"
        const datePattern = /DATA:?\s*(\d{1,2})[-\/](\d{1,2})/i;
        const dateMatch = formatted.match(datePattern);
        
        // Procura por padrões como "NOME: FERRO MIX COMERCIAL LTDA" ou "Nome do beneficiário: NOME"
         const nomePattern = /(?:NOME|BENEFICI[AÁ]RIO):?\s*([^\n\r\d]+)/i;
         const nomeMatch = formatted.match(nomePattern);
         
         // Procura por padrões como "VALOR: 288,00" ou "VALOR: R$ 288,00"
         const valorPattern = /VALOR:?\s*(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;
         const valorMatch = formatted.match(valorPattern);
        
        // Se temos data, nome e valor, podemos formatar conforme o padrão da Fliper
        if (dateMatch && nomeMatch && valorMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          const date = `${day}-${month}`;
          
          // Limpa o nome removendo prefixos como "do beneficiário:" e outros textos desnecessários
           let nome = nomeMatch[1].trim();
           nome = nome.replace(/^(?:do\s+)?(?:benefici[aá]rio|recebedor|favorecido):?\s*/i, '');
          
          let valor = valorMatch[1];
          valor = this.formatarValor(valor);
          
          // Retorna no formato especificado: DD-MM NOME (DESCRIÇÃO) XXX,XX
          return `${date} ${nome} (${fileDescription}) ${valor}`;
        } else {
          // Fallback: tenta extrair informações usando padrões mais genéricos
          // Padrão para extrair data no formato DD-MM
          const genericDatePattern = /(\d{1,2})[-\/](\d{1,2})/;
          const genericDateMatch = formatted.match(genericDatePattern);
          
          // Padrão para extrair valor monetário (suporta valores com separador de milhares)
          const genericValuePattern = /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\b/g;
          const allValues = [...formatted.matchAll(genericValuePattern)].map(match => match[1]);
          
          // Filtra valores que possam ser datas
          const monetaryValues = allValues.filter(val => {
            return !val.match(/^\d{1,2}[-\/]\d{1,2}$/);
          });
          
          if (genericDateMatch && monetaryValues.length > 0) {
            const day = genericDateMatch[1].padStart(2, '0');
            const month = genericDateMatch[2].padStart(2, '0');
            const date = `${day}-${month}`;
            
            // Pega o último valor monetário como o valor principal
            let valor = monetaryValues[monetaryValues.length - 1];
            valor = this.formatarValor(valor);
            
            // Tenta extrair o nome do texto formatado
             let nome = 'ND';
             // Remove a data e o valor para tentar isolar o nome
             let textWithoutDateAndValue = formatted
               .replace(genericDateMatch[0], '')
               .replace(new RegExp(`\\b${valor.replace(',', '.')}\\b`), '')
               .replace(new RegExp(`\\b${valor.replace('.', ',')}\\b`), '');
             
             // Limpa o texto e remove palavras-chave comuns
             textWithoutDateAndValue = textWithoutDateAndValue
               .replace(/data:?|nome:?|valor:?|r\$|reais|comprovante|pagamento|realizado|em|para|no|de/gi, '')
               .trim();
             
             // Procura por padrões de nome de empresa ou pessoa
             const empresaPattern = /((?:[A-Z][a-zA-Z]*\s+)+(?:LTDA|ME|EPP|S\/A|SA|EIRELI)|(?:[A-Z][a-zA-Z]*\s+){2,})/;
             const empresaMatch = textWithoutDateAndValue.match(empresaPattern);
            
            if (empresaMatch && empresaMatch[1]) {
               nome = empresaMatch[1].trim();
             } else if (textWithoutDateAndValue) {
               nome = textWithoutDateAndValue;
             }
            
            // Retorna no formato especificado: DD-MM NOME (DESCRIÇÃO) XXX,XX
             return `${date} ${nome} (${fileDescription}) ${valor}`;
          }
        }
      }
    }
    else if (company === 'raquel-luc' && fileName) {
      // Verifica se é um comprovante de dinheiro em espécie
      const isDinheiroEspecie = formatted.toLowerCase().includes('dinheiro') || 
                               formatted.toLowerCase().includes('espécie') ||
                               formatted.toLowerCase().includes('receitas em dinheiro') ||
                               fileName.toLowerCase().includes('dinheiro');
      
      if (isDinheiroEspecie) {
        // Extrai a data do nome do arquivo
        const fileDate = this.extractDateFromFileName(fileName);
        
        if (fileDate) {
          // Estratégia 1: Procura pelo valor total após o sinal de igual (formato detalhado)
          // Exemplo: "1x R$50, 3x R$20, 2x R$10 = R$130,00"
          const detailedPattern = /=\s*R\$\s*([\d]{1,3}(?:[.,]\d{1,2})?)/i;
          const detailedMatch = formatted.match(detailedPattern);
          
          let valor = 'ND';
          
          if (detailedMatch) {
            // Extrai o valor total após o sinal de igual
            valor = detailedMatch[1];
            
            // Formata o valor monetário
            valor = this.formatarValor(valor);
          } else {
            // Estratégia 2: Procura por um valor numérico isolado na resposta da IA
            // Isso deve capturar o valor total das cédulas somadas
            const valorPattern = /\b([\d]{1,3}(?:[.,]\d{1,2})?)\b/g;
            const allValues = [...formatted.matchAll(valorPattern)].map(match => match[1]);
            
            // Filtra valores que possam ser datas (como 25-04)
            const monetaryValues = allValues.filter(val => {
              // Exclui valores que parecem ser datas
              return !val.match(/^\d{1,2}[-\/]\d{1,2}$/);
            });
            
            if (monetaryValues.length > 0) {
              // Pega o último valor, que provavelmente é o total
              valor = monetaryValues[monetaryValues.length - 1];
              
              // Formata o valor monetário
              valor = this.formatarValor(valor);
            } else {
              // Fallback: tenta extrair valor do nome do arquivo como último recurso
              // Procura por padrão específico: "DD-MM VENDA DINHEIRO VALOR"
              const fileNameValuePattern = /VENDA\s+DINHEIRO\s+([\d.,]+)/i;
              const fileNameValueMatch = fileName.match(fileNameValuePattern);
              
              if (fileNameValueMatch) {
                valor = fileNameValueMatch[1];
              } else {
                // Tenta encontrar qualquer valor numérico no nome do arquivo
                const genericValueMatch = fileName.match(/([\d]{1,3}(?:[.,]\d{1,2})?)/);
                if (genericValueMatch) {
                  valor = genericValueMatch[1];
                }
              }
            }
          }
          
          // Estratégia 3: Tenta somar manualmente os valores das cédulas identificadas
          // Exemplo: "1x R$50, 3x R$20, 2x R$10"
          if (valor === 'ND') {
            const cedulaPattern = /(\d+)x\s*R\$\s*(\d+)/g;
            const cedulaMatches = [...formatted.matchAll(cedulaPattern)];
            
            if (cedulaMatches.length > 0) {
              let total = 0;
              
              for (const match of cedulaMatches) {
                const quantidade = parseInt(match[1], 10);
                const valorCedula = parseInt(match[2], 10);
                total += quantidade * valorCedula;
              }
              
              if (total > 0) {
                valor = total.toString();
                valor = this.formatarValor(valor);
              }
            }
          }
          
          // Retorna no formato especificado usando a data do nome do arquivo
          return `${fileDate} VENDA DINHEIRO ${valor}`;
        }
      }
    }
    else if (company === 'marcondes' && fileName) {
      // Extrai a data do nome do arquivo ou do texto formatado
      let fileDate = this.extractDateFromFileName(fileName);
      
      // Se não conseguiu extrair a data do nome do arquivo, tenta extrair do texto formatado
      if (!fileDate) {
        // Procura por padrões de data no texto formatado (DD/MM, DD-MM, etc)
        const datePattern = /(\d{1,2})[-\/](\d{1,2})/;
        const dateMatch = formatted.match(datePattern);
        
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          fileDate = `${day}-${month}`;
        }
      }
      
      // Extrai a descrição entre parênteses do nome do arquivo
      const fileDescription = this.extractDescriptionFromFileName(fileName);
      
      if (fileDate) {
        // Verifica se é um comprovante de venda
        const isVenda = formatted.toLowerCase().includes('venda') || 
                        formatted.toLowerCase().includes('comprovante de venda') ||
                        fileName.toLowerCase().includes('venda');
        
        // Verifica se é um comprovante de pagamento
        const isPagamento = formatted.toLowerCase().includes('pagamento') || 
                           formatted.toLowerCase().includes('comprovante de pagamento') ||
                           fileName.toLowerCase().includes('pagamento');
        
        // Verifica se é uma transferência
        const isTransferencia = formatted.toLowerCase().includes('transferência') || 
                               formatted.toLowerCase().includes('pix') ||
                               fileName.toLowerCase().includes('transferência') ||
                               fileName.toLowerCase().includes('pix');
        
        // Procura por padrões de valor monetário
        const valorPattern = /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\b/g;
        const allValues = [...formatted.matchAll(valorPattern)].map(match => match[1]);
        
        // Filtra valores que possam ser datas
        const monetaryValues = allValues.filter(val => {
          return !val.match(/^\d{1,2}[-\/]\d{1,2}$/);
        });
        
        let valor = 'ND';
        
        if (monetaryValues.length > 0) {
          // Pega o último valor monetário como o valor principal
          valor = monetaryValues[monetaryValues.length - 1];
          valor = this.formatarValor(valor);
        }
        
        // Procura por nome de cliente, fornecedor ou beneficiário
        let nome = 'ND';
        
        // Padrões para extrair nomes
        const nomePatterns = [
          /cliente:?\s*([^\n\r\d]+)/i,
          /fornecedor:?\s*([^\n\r\d]+)/i,
          /beneficiário:?\s*([^\n\r\d]+)/i,
          /nome:?\s*([^\n\r\d]+)/i,
          /pagador:?\s*([^\n\r\d]+)/i,
          /recebedor:?\s*([^\n\r\d]+)/i
        ];
        
        // Tenta extrair o nome usando os padrões
        for (const pattern of nomePatterns) {
          const match = formatted.match(pattern);
          if (match && match[1]) {
            nome = match[1].trim();
            break;
          }
        }
        
        // Se não encontrou o nome com os padrões, tenta extrair do texto
        if (nome === 'ND') {
          // Remove a data e o valor para tentar isolar o nome
          let textWithoutDateAndValue = formatted;
          
          if (fileDate) {
            textWithoutDateAndValue = textWithoutDateAndValue.replace(fileDate, '');
          }
          
          if (valor !== 'ND') {
            textWithoutDateAndValue = textWithoutDateAndValue
              .replace(new RegExp(`\\b${valor.replace(',', '.')}\\b`), '')
              .replace(new RegExp(`\\b${valor.replace('.', ',')}\\b`), '');
          }
          
          // Limpa o texto e remove palavras-chave comuns
          textWithoutDateAndValue = textWithoutDateAndValue
            .replace(/data:?|nome:?|valor:?|r\$|reais|comprovante|pagamento|venda|transferência|pix|realizado|em|para|no|de/gi, '')
            .trim();
          
          // Procura por padrões de nome de empresa ou pessoa
          const empresaPattern = /((?:[A-Z][a-zA-Z]*\s+)+(?:LTDA|ME|EPP|S\/A|SA|EIRELI)|(?:[A-Z][a-zA-Z]*\s+){2,})/;
          const empresaMatch = textWithoutDateAndValue.match(empresaPattern);
          
          if (empresaMatch && empresaMatch[1]) {
            nome = empresaMatch[1].trim();
          } else if (textWithoutDateAndValue) {
            // Pega as primeiras palavras do texto como nome
            const words = textWithoutDateAndValue.split(/\s+/);
            if (words.length > 1) {
              nome = words.slice(0, Math.min(4, words.length)).join(' ');
            } else {
              nome = textWithoutDateAndValue;
            }
          }
        }
        
        // Formata o retorno com base no tipo de comprovante e inclui a descrição entre parênteses se disponível
        const descriptionPart = fileDescription ? ` (${fileDescription})` : '';
        
        if (isVenda) {
          return `${fileDate} VENDA ${nome}${descriptionPart} ${valor}`;
        } else if (isPagamento) {
          return `${fileDate} PAG ${nome}${descriptionPart} ${valor}`;
        } else if (isTransferencia) {
          return `${fileDate} TRANSF ${nome}${descriptionPart} ${valor}`;
        } else {
          // Tipo não identificado, usa formato genérico
          return `${fileDate} ${nome}${descriptionPart} ${valor}`;
        }
      }
    }
    
    return formatted;
  }

  /**
   * Obtém estatísticas do processamento
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      pendingAnalyses: this.pendingAnalyses.length,
      runningAnalyses: this.runningAnalyses.size,
      completedAnalyses: this.completedAnalyses,
      failedAnalyses: this.failedAnalyses,
      totalProcessed: this.completedAnalyses + this.failedAnalyses,
      maxParallelAnalyses: this.maxParallelAnalyses,
      isProcessing: this.isProcessing
    };
  }
}

// Exporta uma instância única
export default new ParallelAnalysisManager();