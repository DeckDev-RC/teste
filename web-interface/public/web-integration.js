// Tauri Integration Module
// Versão antiga restaurada com suporte a múltiplas chaves API

class TauriIntegration {
    constructor() {
        this.isTauri = false; // Versão web
        this.geminiInitialized = false; // Inicializado após configuração
        
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
            'REMOVED_API_KEY'
        ];
        
        // Índice da chave atual
        this.currentKeyIndex = 0;
        
        // Chaves temporariamente desabilitadas (por atingir limite de taxa)
        this.disabledKeys = new Map();
    }
    
    // Obtém a próxima chave de API disponível
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
                console.log(`🔑 Usando chave #${this.currentKeyIndex + 1}: ${this.maskKey(key)}`);
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
    
    // Mascara a chave para exibição segura em logs
    maskKey(key) {
        if (!key) return 'undefined';
        return key.substring(0, 6) + '...' + key.substring(key.length - 4);
    }
    
    // Desabilita temporariamente uma chave
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

    // Inicializa o serviço Gemini com chaves API
    async initializeGemini(apiKey) {
        console.log('Inicializando Gemini com chaves API internas');
        try {
            // Usa as chaves internas em vez da fornecida pelo usuário
            this.geminiInitialized = true;
            return { success: true, data: 'API configurada com chaves internas' };
        } catch (error) {
            console.error('Erro ao configurar API:', error);
            throw error;
        }
    }

    // Converte arquivo para bytes (base64)
    async fileToBytes(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Obtém a string base64 removendo o prefixo (ex: data:image/jpeg;base64,)
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
            reader.readAsDataURL(file);
        });
    }

    // Analisa um único arquivo usando as chaves API internas com retry e backoff exponencial
    async analyzeFile(file, analysisType = 'financial-receipt', company = 'enia-marcia-joias', forceStructuredFormat = true, retryCount = 0, maxRetries = 3) {
        try {
            // Obtém a próxima chave API disponível
            const apiKey = this.getNextKey();
            
            // Converte o arquivo para base64
            const fileBase64 = await this.fileToBytes(file);
            
            // Prepara os dados para a API do Gemini
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;
            
            // Determina o prompt com base no tipo de análise e empresa
            let prompt = `Analise esta imagem de recibo financeiro e extraia todas as informações relevantes em formato JSON.`;
            if (analysisType === 'financial-document') {
                prompt = `Analise este documento financeiro e extraia todas as informações relevantes em formato JSON.`;
            }
            
            // Adiciona contexto específico da empresa
            if (company === 'fliper') {
                prompt += ` Este documento é da empresa Fliper.`;
            } else if (company === 'enia-marcia-joias') {
                prompt += ` Este documento é da empresa Enia Marcia Joias.`;
            } else if (company === 'marcondes') {
                prompt += ` Este documento é da empresa Marcondes.`;
            }
            
            // Adiciona instrução para formato estruturado
            if (forceStructuredFormat) {
                prompt += ` Retorne APENAS o JSON, sem texto adicional.`;
            }
            
            // Prepara o corpo da requisição
            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: file.type,
                                    data: fileBase64
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 4096,
                }
            };
            
            // Adiciona um identificador único para evitar cache
            const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
            const antiCacheEndpoint = `${endpoint}&request_id=${requestId}`;
            
            // Faz a requisição para a API do Gemini
            const response = await fetch(antiCacheEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            // Verifica se houve erro na requisição
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Erro na API Gemini: ${response.status} ${response.statusText}`, errorText);
                
                // Verifica se é erro de limite de taxa (429)
                if (response.status === 429 || errorText.includes('quota') || errorText.includes('rate limit')) {
                    this.disableKey(apiKey);
                    console.warn(`Chave ${this.maskKey(apiKey)} desabilitada por limite de taxa. Tentando novamente...`);
                    
                    // Implementa backoff exponencial para retry
                    if (retryCount < maxRetries) {
                        const backoffTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                        console.log(`Aguardando ${Math.round(backoffTime/1000)} segundos antes de tentar novamente (tentativa ${retryCount + 1}/${maxRetries})`);
                        
                        // Aguarda o tempo de backoff
                        await new Promise(resolve => setTimeout(resolve, backoffTime));
                        
                        // Tenta novamente com outra chave e incrementa o contador de retries
                        return this.analyzeFile(file, analysisType, company, forceStructuredFormat, retryCount + 1, maxRetries);
                    } else {
                        throw new Error(`Erro na API Gemini após ${maxRetries} tentativas: limite de taxa excedido`);
                    }
                }
                
                // Para outros erros, verifica se deve tentar novamente
                if (retryCount < maxRetries) {
                    const backoffTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                    console.log(`Erro ${response.status}. Aguardando ${Math.round(backoffTime/1000)} segundos antes de tentar novamente (tentativa ${retryCount + 1}/${maxRetries})`);
                    
                    // Aguarda o tempo de backoff
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                    
                    // Tenta novamente com outra chave
                    return this.analyzeFile(file, analysisType, company, forceStructuredFormat, retryCount + 1, maxRetries);
                }
                
                throw new Error(`Erro na API Gemini: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Processa a resposta da API
            if (result.candidates && result.candidates.length > 0) {
                const content = result.candidates[0].content;
                if (content && content.parts && content.parts.length > 0) {
                    let responseText = content.parts[0].text;
                    
                    // Tenta extrair o JSON da resposta
                    try {
                        // Procura por blocos de código JSON na resposta
                        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                                         responseText.match(/```([\s\S]*?)```/) || 
                                         responseText.match(/{[\s\S]*}/);
                        
                        if (jsonMatch) {
                            responseText = jsonMatch[1] || jsonMatch[0];
                        }
                        
                        // Remove caracteres que não são JSON válido
                        responseText = responseText.trim();
                        if (responseText.startsWith('```') && responseText.endsWith('```')) {
                            responseText = responseText.substring(3, responseText.length - 3).trim();
                        }
                        
                        // Tenta fazer o parse do JSON
                        const parsedResult = JSON.parse(responseText);
                        return parsedResult;
                    } catch (jsonError) {
                        console.warn('Falha ao fazer parse do JSON, retornando texto bruto:', jsonError);
                        return { raw_text: responseText };
                    }
                }
            }
            
            // Se chegou aqui, a resposta não está no formato esperado
            if (retryCount < maxRetries) {
                console.warn('Formato de resposta inesperado. Tentando novamente...');
                const backoffTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                return this.analyzeFile(file, analysisType, company, forceStructuredFormat, retryCount + 1, maxRetries);
            }
            
            throw new Error('Formato de resposta inesperado da API Gemini após múltiplas tentativas');
        } catch (error) {
            console.error('Falha na análise do arquivo:', error);
            
            // Verifica se deve tentar novamente para erros não tratados
            if (retryCount < maxRetries) {
                console.warn(`Erro não tratado. Tentando novamente (tentativa ${retryCount + 1}/${maxRetries})...`);
                const backoffTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                return this.analyzeFile(file, analysisType, company, forceStructuredFormat, retryCount + 1, maxRetries);
            }
            
            throw error;
        }
    }

    // Analisa múltiplos arquivos em lote usando as chaves API internas com processamento paralelo
    async analyzeMultipleFiles(files, analysisType = 'financial-receipt', company = 'enia-marcia-joias', forceStructuredFormat = true, batchId = null) {
        try {
            // Gera um ID de lote se não for fornecido
            const currentBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            
            // Resultados do lote
            const batchResults = [];
            
            // Número máximo de análises simultâneas (baseado no número de chaves disponíveis)
            const maxConcurrentAnalyses = this.apiKeys.length;
            console.log(`🚀 Iniciando análise em lote com até ${maxConcurrentAnalyses} análises simultâneas`);
            
            // Processa os arquivos em lotes para controlar o número de requisições simultâneas
            for (let i = 0; i < files.length; i += maxConcurrentAnalyses) {
                // Cria um lote de arquivos para processar simultaneamente
                const batch = files.slice(i, i + maxConcurrentAnalyses);
                console.log(`Processando lote ${Math.floor(i/maxConcurrentAnalyses) + 1}: ${batch.length} arquivos (${i+1}-${Math.min(i+batch.length, files.length)} de ${files.length})`);
                
                // Cria um array de promessas para processar cada arquivo do lote simultaneamente
                const analysisPromises = batch.map((file, batchIndex) => {
                    // Índice global do arquivo
                    const fileIndex = i + batchIndex;
                    
                    // Retorna uma promessa que resolve com o resultado da análise ou rejeita com erro
                    return new Promise(async (resolve) => {
                        try {
                            // Atualiza o progresso
                            const progress = Math.round(((fileIndex + 1) / files.length) * 100);
                            console.log(`Iniciando análise do arquivo ${fileIndex + 1}/${files.length} (${progress}%)`);
                            
                            // Analisa o arquivo
                            const result = await this.analyzeFile(file, analysisType, company, forceStructuredFormat);
                            
                            // Cria o objeto de resultado
                            const analysisResult = {
                                filename: file.name,
                                file_size: file.size,
                                analysis_type: analysisType,
                                company: company,
                                analysis_result: result,
                                success: true,
                                timestamp: new Date().toISOString()
                            };
                            
                            console.log(`✅ Análise do arquivo ${fileIndex + 1}/${files.length} concluída com sucesso`);
                            resolve(analysisResult);
                        } catch (fileError) {
                            console.error(`❌ Erro ao analisar arquivo ${fileIndex + 1}/${files.length}:`, fileError);
                            
                            // Cria o objeto de erro
                            const errorResult = {
                                filename: file.name,
                                file_size: file.size,
                                analysis_type: analysisType,
                                company: company,
                                error: fileError.message,
                                success: false,
                                timestamp: new Date().toISOString()
                            };
                            
                            resolve(errorResult); // Resolve com erro para não interromper o Promise.all
                        }
                    });
                });
                
                // Aguarda todas as análises do lote atual serem concluídas
                const batchResultsArray = await Promise.all(analysisPromises);
                
                // Adiciona os resultados ao array de resultados do lote
                batchResults.push(...batchResultsArray);
                
                console.log(`Lote ${Math.floor(i/maxConcurrentAnalyses) + 1} concluído: ${batchResultsArray.length} arquivos processados`);
            }
            
            // Armazena os resultados do lote na memória
            if (!window.batchResultsCache) {
                window.batchResultsCache = {};
            }
            window.batchResultsCache[currentBatchId] = batchResults;
            
            console.log(`🏁 Análise em lote concluída: ${batchResults.length} arquivos processados`);
            
            return {
                batch_id: currentBatchId,
                total_files: files.length,
                successful: batchResults.filter(r => r.success).length,
                failed: batchResults.filter(r => !r.success).length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Falha na análise em lote:', error);
            throw error;
        }
    }

    // Obtém resultados de um lote específico do cache local
    async getBatchResults(batchId) {
        try {
            // Verifica se o cache de lotes existe
            if (!window.batchResultsCache) {
                throw new Error('Cache de lotes não inicializado');
            }
            
            // Verifica se o lote existe no cache
            if (!window.batchResultsCache[batchId]) {
                throw new Error(`Lote não encontrado: ${batchId}`);
            }
            
            // Retorna os resultados do lote
            return window.batchResultsCache[batchId];
        } catch (error) {
            console.error('Falha ao obter resultados do lote:', error);
            throw error;
        }
    }

    // Obtém tipos de análise disponíveis - valores fixos
    async getAnalysisTypes() {
        // Retorna valores fixos em vez de fazer requisição ao servidor
        return [
            { id: 'financial-receipt', name: 'Recibo Financeiro' },
            { id: 'financial-document', name: 'Documento Financeiro' }
        ];
    }

    // Obtém empresas disponíveis - valores fixos
    async getCompanies() {
        // Retorna valores fixos em vez de fazer requisição ao servidor
        return [
            { id: 'enia-marcia-joias', name: 'Enia Marcia Joias' },
            { id: 'fliper', name: 'Fliper' },
            { id: 'marcondes', name: 'Marcondes' }
        ];
    }

    // Limpa o cache de análises - versão local
    async clearCache() {
        try {
            // Limpa o cache de lotes
            if (window.batchResultsCache) {
                window.batchResultsCache = {};
            }
            
            // Limpa o cache de análises individuais (se existir)
            if (window.analysisCache) {
                window.analysisCache = {};
            }
            
            // Limpa contadores de cache
            if (window.cacheStats) {
                window.cacheStats = { hits: 0, misses: 0, size: 0 };
            }
            
            console.log('Cache limpo com sucesso');
            return { message: 'Cache limpo com sucesso' };
        } catch (error) {
            console.error('Falha ao limpar cache:', error);
            throw error;
        }
    }

    // Obtém estatísticas do cache - versão local
    async getCacheStats() {
        try {
            // Inicializa estatísticas se não existirem
            if (!window.cacheStats) {
                window.cacheStats = { hits: 0, misses: 0, size: 0 };
            }
            
            // Calcula o tamanho atual do cache
            let cacheSize = 0;
            
            // Conta itens no cache de lotes
            if (window.batchResultsCache) {
                cacheSize += Object.keys(window.batchResultsCache).length;
            }
            
            // Conta itens no cache de análises individuais (se existir)
            if (window.analysisCache) {
                cacheSize += Object.keys(window.analysisCache).length;
            }
            
            // Atualiza o tamanho do cache
            window.cacheStats.size = cacheSize;
            
            return window.cacheStats;
        } catch (error) {
            console.error('Falha ao obter estatísticas do cache:', error);
            // Retorna estatísticas vazias em caso de erro
            return { hits: 0, misses: 0, size: 0 };
        }
    }

    // Salva um arquivo - versão web
    async saveFile(fileContent, suggestedName, fileType = 'text/plain') {
        try {
            // Usa a API de download do navegador
            const blob = new Blob([fileContent], { type: fileType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = suggestedName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return { success: true, path: null };
        } catch (error) {
            console.error('Falha ao salvar arquivo:', error);
            throw error;
        }
    }

    // Gera e baixa um CSV com os resultados - versão web
    async generateAndDownloadCsv(results, filename = 'analysis_results.csv') {
        if (!results || results.length === 0) {
            throw new Error('Sem resultados para exportar');
        }
        
        try {
            // Método 1: Gerar CSV no cliente
            // Função para escapar valores CSV
            const escapeCsvValue = (value) => {
                if (value === null || value === undefined) return '';
                value = String(value);
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            };
            
            // Obtém todas as chaves únicas de todos os objetos
            const allKeys = new Set();
            results.forEach(result => {
                if (result.analysis_result && typeof result.analysis_result === 'object') {
                    Object.keys(result.analysis_result).forEach(key => allKeys.add(key));
                }
            });
            
            // Cria o cabeçalho do CSV
            const headers = ['filename', ...Array.from(allKeys)];
            let csvContent = headers.map(escapeCsvValue).join(',') + '\n';
            
            // Adiciona as linhas de dados
            results.forEach(result => {
                const row = [result.filename];
                
                allKeys.forEach(key => {
                    let value = '';
                    if (result.analysis_result && typeof result.analysis_result === 'object') {
                        value = result.analysis_result[key] || '';
                    }
                    row.push(escapeCsvValue(value));
                });
                
                csvContent += row.join(',') + '\n';
            });
            
            // Salva o arquivo CSV usando o método saveFile
            return await this.saveFile(csvContent, filename, 'text/csv');
            
            // Método 2 (alternativo): Solicitar CSV do servidor
            /*
            const response = await fetch('/api/generate-csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ results })
            });
            
            if (!response.ok) {
                throw new Error(`Erro ao gerar CSV: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return { success: true, path: null };
            */
        } catch (error) {
            console.error('Falha ao gerar e baixar CSV:', error);
            throw error;
        }
    }

    // Verifica se está rodando no Tauri
    get isRunningInTauri() {
        return this.isTauri;
    }

    // Verifica se o Gemini está inicializado
    get isGeminiInitialized() {
        return this.geminiInitialized;
    }
}

// Instância global
window.tauriIntegration = new TauriIntegration();

// Exporta para uso em outros scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TauriIntegration;
}

// Inicializa o cache
if (!window.batchResultsCache) {
    window.batchResultsCache = {};
}
if (!window.analysisCache) {
    window.analysisCache = {};
}
if (!window.cacheStats) {
    window.cacheStats = { hits: 0, misses: 0, size: 0 };
}

// Inicializa o Gemini automaticamente
window.tauriIntegration.geminiInitialized = true;
console.log('TauriIntegration inicializado com 13 chaves de API internas');