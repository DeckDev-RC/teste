import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import geminiService from '../src/services/GeminiService.js';
import imageHelper from '../src/utils/imageHelper.js';
import fileNameHelper from '../src/utils/fileNameHelper.js';
import { getPrompt, getAvailableAnalysisTypes } from '../src/config/prompts.js';
import cacheHelper from '../src/utils/cacheHelper.js';
import analysisStore from '../src/utils/analysisStore.js';
import parallelAnalysisManager from '../src/utils/parallelAnalysisManager.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório de upload:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gera nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB (aumentado para PDFs)
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp|bmp/;
    const allowedDocTypes = /pdf/;
    
    const extname = path.extname(file.originalname).toLowerCase();
    const isImage = allowedImageTypes.test(extname.substring(1)) && file.mimetype.startsWith('image/');
    const isPDF = allowedDocTypes.test(extname.substring(1)) && file.mimetype === 'application/pdf';

    if (isImage || isPDF) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPEG, PNG, GIF, WebP, BMP) e documentos PDF são permitidos!'));
    }
  }
});

/**
 * Gera um hash do conteúdo do arquivo
 * @param {Buffer} buffer - Buffer do arquivo
 * @returns {string} - Hash SHA-256 do conteúdo
 */
async function generateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Gera um ID único para um lote de processamento
 * @returns {string} - ID do lote
 */
function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

// Rotas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para listar tipos de análise disponíveis
app.get('/api/analysis-types', (req, res) => {
  res.json({
    success: true,
    data: {
      availableTypes: getAvailableAnalysisTypes(),
      timestamp: new Date().toISOString()
    }
  });
});

// Endpoint para análise de imagem
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhuma imagem foi enviada' 
      });
    }

    const { analysisType = 'general', company = 'enia-marcia-joias' } = req.body;
    const imagePath = req.file.path;
    // Gera um ID de lote único para esta análise individual
    const batchId = generateBatchId();

    console.log(`📸 Analisando imagem: ${req.file.originalname}`);
    console.log(`🔍 Tipo de análise: ${analysisType}`);
    console.log(`🏢 Empresa: ${company}`);
    console.log(`🆔 ID do lote: ${batchId}`);

    // Obtém o prompt centralizado
    const prompt = getPrompt(company, analysisType);
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: `Tipo de análise não suportado. Tipos disponíveis: ${getAvailableAnalysisTypes().join(', ')}`
      });
    }

    // Lê o arquivo para gerar hash
    const fileBuffer = await fs.readFile(imagePath);
    const fileHash = await generateFileHash(fileBuffer);

    // Verifica se já temos essa análise armazenada
    let analysis = analysisStore.getAnalysis(req.file.originalname, fileHash, analysisType);
    
    // Se não encontrou no armazenamento, realiza a análise
    if (!analysis) {
      // Detecta se é um prompt de teste para desabilitar formatação estruturada
      const isTestPrompt = prompt && (
        prompt.toLowerCase().includes('pizza') || 
        prompt.toLowerCase().includes('teste') ||
        prompt.length < 50
      );

      // Verifica se é PDF ou imagem
      const isPDF = req.file.mimetype === 'application/pdf';

      if (isPDF) {
        console.log(`📄 Analisando PDF: ${req.file.originalname}`);
        
        // Analisa o PDF com o Gemini
        analysis = await geminiService.analyzePDF(
          fileBuffer,
          prompt,
          !isTestPrompt, // Se for teste, desabilita formatação (false), senão habilita (true)
          req.file.originalname, // Nome do arquivo para anti-cache
          null, // fileIndex
          company,
          analysisType
        );
      } else {
        console.log(`🖼️ Analisando imagem: ${req.file.originalname}`);
        
        // Prepara a imagem para análise
        const imageData = await imageHelper.prepareImageForAnalysis(imagePath);

        // Analisa a imagem com o Gemini
        analysis = await geminiService.analyzeReceipt(
          imageData.data,
          imageData.mimeType,
          prompt,
          !isTestPrompt, // Se for teste, desabilita formatação (false), senão habilita (true)
          req.file.originalname, // Nome do arquivo para anti-cache
          null, // fileIndex
          company,
          analysisType
        );
      }

      // Armazena o resultado para uso futuro, associado ao lote
      analysisStore.storeAnalysis(req.file.originalname, fileHash, analysisType, analysis, batchId);
    }

    // Remove o arquivo temporário após a análise
    try {
      await fs.unlink(imagePath);
    } catch (error) {
      console.warn('Aviso: Não foi possível remover arquivo temporário:', error.message);
    }

    // Retorna o resultado
    res.json({
      success: true,
      data: {
        analysis,
        analysisType,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        batchId, // Inclui o ID do lote na resposta
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro na análise:', error);
    
    // Remove arquivo em caso de erro
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn('Erro ao remover arquivo:', unlinkError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: `Erro na análise: ${error.message}`
    });
  }
});

// Endpoint para análise via base64
app.post('/api/analyze-base64', async (req, res) => {
  try {
    const { imageData, analysisType = 'general', mimeType = 'image/jpeg', company = 'enia-marcia-joias' } = req.body;

    if (!imageData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados da imagem não fornecidos' 
      });
    }

    console.log(`🔍 Análise via base64 - Tipo: ${analysisType}`);
    console.log(`🏢 Empresa: ${company}`);

    // Obtém o prompt centralizado
    const prompt = getPrompt(company, analysisType);
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: `Tipo de análise não suportado. Tipos disponíveis: ${getAvailableAnalysisTypes().join(', ')}`
      });
    }

    // Remove o prefixo data:image se presente
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    // Detecta se é um prompt de teste para desabilitar formatação estruturada
    const isTestPrompt = prompt && (
      prompt.toLowerCase().includes('pizza') || 
      prompt.toLowerCase().includes('teste') ||
      prompt.length < 50
    );

    // Analisa a imagem
    const analysis = await geminiService.analyzeReceipt(
      base64Data, 
      mimeType, 
      prompt,
      !isTestPrompt, // Se for teste, desabilita formatação (false), senão habilita (true)
      '', // fileName
      null, // fileIndex
      company,
      analysisType
    );

    res.json({
      success: true,
      data: {
        analysis,
        analysisType,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro na análise base64:', error);
    res.status(500).json({
      success: false,
      error: `Erro na análise: ${error.message}`
    });
  }
});

// Endpoint para testar API
app.get('/api/test', async (req, res) => {
  try {
    const result = await geminiService.generateText(getPrompt('api-test') || 'Olá! Você está funcionando?');
    res.json({
      success: true,
      message: 'API funcionando corretamente!',
      response: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para estatísticas de uso da API e cache
app.get('/api/stats', (req, res) => {
  try {
    // Obtém estatísticas do cache
    const cacheStats = cacheHelper.getStats();
    
    // Obtém estatísticas do armazenamento de análises
    const analysisStats = analysisStore.getStats();
    
    // Obtém estatísticas do gerenciador de chaves de API
    const keyStats = geminiService.getKeyStats();
    
    // Obtém estatísticas do gerenciador de análises paralelas
    const parallelStats = parallelAnalysisManager.getStats();
    
    // Obtém estatísticas do GeminiService
    const apiStats = {
      queueSize: geminiService.requestQueue ? geminiService.requestQueue.length : 0,
      processingActive: geminiService.processingQueue || false,
      recentRequestsCount: geminiService.recentRequests ? geminiService.recentRequests.length : 0,
      maxRequestsPerMinute: geminiService.maxRequestsPerMinute || 15,
      minRequestInterval: geminiService.minRequestInterval || 4000,
      retryCount: geminiService.maxRetries || 3
    };
    
    // Retorna as estatísticas combinadas
    res.json({
      success: true,
      data: {
        cache: cacheStats,
        analysisStore: analysisStats,
        apiKeys: keyStats,
        parallelAnalysis: parallelStats,
        api: apiStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para download de arquivo renomeado
app.post('/api/download-renamed', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhum arquivo foi enviado' 
      });
    }

    const { analysisType = 'general' } = req.body;
    const imagePath = req.file.path;
    const originalExtension = path.extname(req.file.originalname);

    console.log(`📸 Analisando e renomeando: ${req.file.originalname}`);

    // Obtém o prompt centralizado
    const prompt = getPrompt(analysisType);

    if (!prompt) {
      // Remove arquivo e retorna erro
      try {
        await fs.unlink(imagePath);
      } catch (unlinkError) {
        console.warn('Erro ao remover arquivo:', unlinkError.message);
      }
      
      return res.status(400).json({
        success: false,
        error: `Tipo de análise não suportado. Tipos disponíveis: ${getAvailableAnalysisTypes().join(', ')}`
      });
    }

    // Detecta se é um prompt de teste para desabilitar formatação estruturada
    const isTestPrompt = prompt && (
      prompt.toLowerCase().includes('pizza') || 
      prompt.toLowerCase().includes('teste') ||
      prompt.length < 50
    );

    // Lê o arquivo para análise e geração de hash
    const fileBuffer = await fs.readFile(imagePath);
    const fileHash = await generateFileHash(fileBuffer);
    
    // Verifica se já temos essa análise armazenada
    let analysis = analysisStore.getAnalysis(req.file.originalname, fileHash, analysisType);
    
    if (analysis) {
      console.log(`🔄 Reutilizando análise existente para ${req.file.originalname}`);
    } else {
      console.log(`📋 Cache miss. Processando nova análise.`);
      
      // Verifica se é PDF ou imagem
      const isPDF = req.file.mimetype === 'application/pdf';

      if (isPDF) {
        console.log(`📄 Analisando PDF para renomear: ${req.file.originalname}`);
        
        // Analisa o PDF com o Gemini
        analysis = await geminiService.analyzePDF(
          fileBuffer,
          prompt,
          !isTestPrompt, // Se for teste, desabilita formatação (false), senão habilita (true)
          req.file.originalname, // Nome do arquivo para anti-cache
          null, // fileIndex
          'enia-marcia-joias', // company padrão
          analysisType
        );
      } else {
        console.log(`🖼️ Analisando imagem para renomear: ${req.file.originalname}`);
        
        // Prepara a imagem para análise
        const imageData = await imageHelper.prepareImageForAnalysis(imagePath);

        // Analisa a imagem com o Gemini
        analysis = await geminiService.analyzeReceipt(
          imageData.data,
          imageData.mimeType,
          prompt,
          !isTestPrompt, // Se for teste, desabilita formatação (false), senão habilita (true)
          req.file.originalname, // Nome do arquivo para anti-cache
          null // fileIndex
        );
      }
      
      // Armazena o resultado para uso futuro
      analysisStore.storeAnalysis(req.file.originalname, fileHash, analysisType, analysis);
    }

    // Gera o novo nome baseado na análise
    const newFileName = fileNameHelper.generateFileNameFromAnalysis(
      analysis,
      analysisType,
      originalExtension
    );

    // O arquivo já foi lido para análise (fileBuffer)

    // Remove o arquivo temporário
    try {
      await fs.unlink(imagePath);
    } catch (error) {
      console.warn('Aviso: Não foi possível remover arquivo temporário:', error.message);
    }

    // Configura headers para download
    res.setHeader('Content-Type', req.file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${newFileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Envia o arquivo
    res.send(fileBuffer);

  } catch (error) {
    console.error('Erro no download renomeado:', error);
    
    // Remove arquivo em caso de erro
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn('Erro ao remover arquivo:', unlinkError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: `Erro no download: ${error.message}`
    });
  }
});

// Armazena conexões SSE ativas
const sseClients = new Set();

// Função para enviar atualização de progresso para todos os clientes
function broadcastProgress(data) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// Endpoint SSE para progresso
app.get('/api/progress', (req, res) => {
  // Configura headers para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Adiciona cliente à lista
  sseClients.add(res);

  // Remove cliente quando a conexão for fechada
  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Endpoint para download de múltiplos arquivos renomeados (ZIP)
app.post('/api/download-multiple-renamed', upload.array('images', 1000), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhum arquivo foi enviado' 
      });
    }

    const { analysisType = 'general' } = req.body;
    const totalFiles = req.files.length;
    // Gera um ID de lote único para este processamento em massa
    const batchId = generateBatchId();
    
    console.log(`📦 Processando ${totalFiles} arquivos para ZIP renomeado`);
    console.log(`🆔 ID do lote: ${batchId}`);
    console.log(`🚀 Usando processamento paralelo com até ${parallelAnalysisManager.maxParallelAnalyses} análises simultâneas`);

    // Envia progresso inicial
    broadcastProgress({
      processed: 0,
      total: totalFiles,
      errors: 0,
      currentFile: '',
      lastError: null,
      status: 'iniciando',
      batchId
    });

    // Obtém o prompt centralizado
    const prompt = getPrompt(analysisType);
    
    if (!prompt) {
      // Remove arquivos em caso de erro
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.warn('Erro ao remover arquivo:', unlinkError.message);
        }
      }
      
      return res.status(400).json({
        success: false,
        error: `Tipo de análise não suportado. Tipos disponíveis: ${getAvailableAnalysisTypes().join(', ')}`
      });
    }

    // Cria o arquivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 } // Máxima compressão
    });

    // Configura headers para download do ZIP
    const zipFileName = `arquivos_analisados_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    // Pipe do archive para a resposta
    archive.pipe(res);

    const existingNames = new Set();
    let processedCount = 0;
    let errorCount = 0;
    
    // Preparar todas as imagens para análise em paralelo
    const analysisPromises = [];
    const fileDetails = [];
    
    console.log('🎯 Preparando análises em paralelo...');

    // Prepara todos os arquivos para análise
    for (const file of req.files) {
      try {
        const imagePath = file.path;
        const originalExtension = path.extname(file.originalname);
        
        // Lê o arquivo para gerar hash e preparar para análise
        const fileBuffer = await fs.readFile(imagePath);
        const fileHash = await generateFileHash(fileBuffer);
        
        // Verifica se já temos essa análise armazenada
        let analysis = analysisStore.getAnalysis(file.originalname, fileHash, analysisType);
        
        if (analysis) {
          // Se já temos a análise, adiciona diretamente aos resultados
          fileDetails.push({
            file,
            analysis,
            imagePath,
            originalExtension,
            fromCache: true
          });
          
          console.log(`🔄 Reutilizando análise existente para ${file.originalname}`);
          
          // Atualiza progresso
          broadcastProgress({
            processed: ++processedCount,
            total: totalFiles,
            errors: errorCount,
            currentFile: file.originalname,
            status: 'reutilizando_analise',
            batchId
          });
        } else {
          // Se não temos a análise, prepara para processamento
          const isPDF = file.mimetype === 'application/pdf';
          
          // Detecta se é um prompt de teste
          const isTestPrompt = prompt && (
            prompt.toLowerCase().includes('pizza') || 
            prompt.toLowerCase().includes('teste') ||
            prompt.length < 50
          );

          let analysisPromise;

          if (isPDF) {
            // Para PDFs, analisa diretamente
            analysisPromise = geminiService.analyzePDF(
              fileBuffer,
              prompt,
              !isTestPrompt,
              file.originalname,
              req.files.indexOf(file),
              'enia-marcia-joias',
              analysisType
            );
          } else {
            // Para imagens, prepara e usa o gerenciador paralelo
            const imageData = await imageHelper.prepareImageForAnalysis(imagePath);
            
            // Adiciona à fila de análises paralelas
            analysisPromise = parallelAnalysisManager.queueAnalysis({
              imageData: imageData.data,
              mimeType: imageData.mimeType,
              prompt,
              fileName: file.originalname,
              fileIndex: req.files.indexOf(file),
              forceStructuredFormat: !isTestPrompt
            });
          }
          
          // Adiciona a promessa ao array
          analysisPromises.push(
            analysisPromise
              .then(result => {
                // Armazena o resultado para uso futuro
                analysisStore.storeAnalysis(file.originalname, fileHash, analysisType, result, batchId);
                
                // Adiciona aos detalhes de arquivo
                fileDetails.push({
                  file,
                  analysis: result,
                  imagePath,
                  originalExtension,
                  fromCache: false
                });
                
                // Atualiza progresso
                broadcastProgress({
                  processed: ++processedCount,
                  total: totalFiles,
                  errors: errorCount,
                  currentFile: file.originalname,
                  status: 'analisado',
                  batchId
                });
              })
              .catch(error => {
                console.error(`❌ Erro ao analisar ${file.originalname}:`, error);
                errorCount++;
                
                // Adiciona aos detalhes de arquivo com erro
                fileDetails.push({
                  file,
                  error: error.message,
                  imagePath,
                  originalExtension,
                  hasError: true
                });
                
                // Atualiza progresso com erro
                broadcastProgress({
                  processed: ++processedCount,
                  total: totalFiles,
                  errors: errorCount,
                  currentFile: file.originalname,
                  lastError: error.message,
                  batchId
                });
              })
          );
          
          // Atualiza progresso para analisando
          broadcastProgress({
            processed: processedCount,
            total: totalFiles,
            errors: errorCount,
            currentFile: file.originalname,
            status: 'analisando',
            batchId,
            parallelCount: analysisPromises.length
          });
        }
      } catch (error) {
        console.error(`❌ Erro ao preparar ${file.originalname}:`, error);
        errorCount++;
        
        // Adiciona aos detalhes de arquivo com erro
        fileDetails.push({
          file,
          error: error.message,
          imagePath: file.path,
          originalExtension: path.extname(file.originalname),
          hasError: true
        });
        
        // Atualiza progresso com erro
        broadcastProgress({
          processed: ++processedCount,
          total: totalFiles,
          errors: errorCount,
          currentFile: file.originalname,
          lastError: error.message,
          batchId
        });
      }
    }
    
    // Aguarda todas as análises paralelas serem concluídas
    if (analysisPromises.length > 0) {
      console.log(`⏳ Aguardando ${analysisPromises.length} análises paralelas...`);
      await Promise.all(analysisPromises);
      console.log('✅ Todas as análises concluídas');
    }
    
    // Processa os resultados e adiciona ao ZIP
    console.log('📦 Adicionando arquivos ao ZIP...');
    processedCount = 0;
    
    for (const fileDetail of fileDetails) {
      try {
        const { file, analysis, imagePath, originalExtension, hasError } = fileDetail;
        
        // Atualiza progresso
        broadcastProgress({
          processed: processedCount,
          total: totalFiles,
          errors: errorCount,
          currentFile: file.originalname,
          status: 'empacotando',
          batchId
        });
        
        if (hasError) {
          // Adiciona arquivo com erro ao ZIP
          const fallbackName = `erro_${file.originalname}`;
          archive.file(imagePath, { name: fallbackName });
          console.log(`⚠️ Adicionado com erro: ${fallbackName}`);
        } else {
          // Gera o novo nome baseado na análise
          let newFileName = fileNameHelper.generateFileNameFromAnalysis(
            analysis,
            analysisType,
            originalExtension
          );
          
          // Garante que o nome é único
          newFileName = fileNameHelper.generateUniqueName(newFileName, existingNames);
          existingNames.add(newFileName);
          
          // Adiciona ao ZIP
          archive.file(imagePath, { name: newFileName });
          console.log(`📎 Adicionado ao ZIP: ${newFileName}`);
        }
        
        processedCount++;
      } catch (error) {
        console.error(`❌ Erro ao processar resultado para ${fileDetail.file.originalname}:`, error);
        errorCount++;
        
        // Adiciona arquivo com erro ao ZIP
        const fallbackName = `erro_${fileDetail.file.originalname}`;
        archive.file(fileDetail.imagePath, { name: fallbackName });
        
        // Atualiza progresso com erro
        broadcastProgress({
          processed: ++processedCount,
          total: totalFiles,
          errors: errorCount,
          currentFile: fileDetail.file.originalname,
          lastError: error.message,
          batchId
        });
      }
    }

    // Envia progresso final
    broadcastProgress({
      processed: totalFiles,
      total: totalFiles,
      errors: errorCount,
      currentFile: '',
      lastError: null,
      status: 'concluído',
      batchId
    });

    console.log(`\n📊 Resumo do processamento:
- Total de arquivos: ${totalFiles}
- Processados com sucesso: ${processedCount - errorCount}
- Erros: ${errorCount}
- ID do lote: ${batchId}
- Análises paralelas: ${parallelAnalysisManager.getStats().totalProcessed}
`);

    // Finaliza o ZIP
    console.log('🔒 Finalizando arquivo ZIP...');
    await archive.finalize();
    console.log('✅ ZIP finalizado com sucesso');

    // Limpa o armazenamento deste lote após finalizar o ZIP
    console.log(`🧹 Limpando dados do lote ${batchId} do armazenamento...`);
    const removedCount = analysisStore.clearBatch(batchId);
    console.log(`✅ Armazenamento limpo: ${removedCount} entradas removidas`);

    // Remove arquivos temporários após finalizar o ZIP
    setTimeout(async () => {
      console.log('🧹 Removendo arquivos temporários...');
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
          console.log(`✅ Removido: ${file.originalname}`);
        } catch (error) {
          console.warn('⚠️ Erro ao remover arquivo temporário:', error.message);
        }
      }
      console.log('✨ Limpeza concluída');
    }, 1000);

  } catch (error) {
    console.error('❌ Erro no download múltiplo renomeado:', error);
    
    // Remove arquivos em caso de erro
    if (req.files) {
      console.log('🧹 Removendo arquivos temporários após erro...');
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
          console.log(`✅ Removido: ${file.originalname}`);
        } catch (unlinkError) {
          console.warn('⚠️ Erro ao remover arquivo:', unlinkError.message);
        }
      }
    }

    res.status(500).json({
      success: false,
      error: `Erro no download: ${error.message}`
    });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo muito grande! Máximo permitido: 20MB'
      });
    }
  }
  
  console.error('Erro no servidor:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📁 Servindo arquivos de: ${path.join(__dirname, 'public')}`);
  console.log(`🤖 Interface Gemini disponível em: http://localhost:${PORT}`);
  console.log(`📋 Tipos de análise disponíveis: ${getAvailableAnalysisTypes().join(', ')}`);
  console.log('\n💡 Para testar a API: http://localhost:${PORT}/api/test');
}); 