import geminiService from '../services/GeminiService.js';
import imageHelper from '../utils/imageHelper.js';

/**
 * Exemplo de análise de imagem simples
 */
async function simpleImageAnalysis() {
  console.log('=== Exemplo: Análise de Imagem Simples ===\n');
  
  try {
    // Exemplo com imagem base64 fictícia (você deve substituir por uma imagem real)
    const exampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const prompt = "Descreva o que você vê nesta imagem de forma detalhada.";
    console.log(`Prompt: ${prompt}\n`);
    
    const response = await geminiService.analyzeImage(prompt, exampleBase64, 'image/png');
    console.log('Análise da imagem:');
    console.log(response);
    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro na análise de imagem:', error.message);
  }
}

/**
 * Exemplo de análise de imagem a partir de arquivo
 */
async function analyzeImageFromFile(imagePath) {
  console.log('=== Exemplo: Análise de Imagem de Arquivo ===\n');
  
  try {
    console.log(`Analisando imagem: ${imagePath}\n`);
    
    // Prepara a imagem
    const imageData = await imageHelper.prepareImageForAnalysis(imagePath);
    
    const prompt = "Analise esta imagem e me diga: 1) O que está acontecendo na cena, 2) Quais objetos você identifica, 3) Que cores predominam na imagem.";
    console.log(`Prompt: ${prompt}\n`);
    
    const response = await geminiService.analyzeImage(prompt, imageData.data, imageData.mimeType);
    console.log('Análise detalhada:');
    console.log(response);
    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro na análise de arquivo:', error.message);
  }
}

/**
 * Exemplo de análise específica - reconhecimento de texto em imagem
 */
async function textRecognitionExample(imagePath) {
  console.log('=== Exemplo: Reconhecimento de Texto (OCR) ===\n');
  
  try {
    const imageData = await imageHelper.prepareImageForAnalysis(imagePath);
    
    const prompt = "Extraia todo o texto visível nesta imagem. Se não houver texto, me informe.";
    console.log(`Prompt: ${prompt}\n`);
    
    const response = await geminiService.analyzeImage(prompt, imageData.data, imageData.mimeType);
    console.log('Texto extraído:');
    console.log(response);
    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro no reconhecimento de texto:', error.message);
  }
}

/**
 * Exemplo de análise especializada - identificação de objetos
 */
async function objectIdentificationExample(imagePath) {
  console.log('=== Exemplo: Identificação de Objetos ===\n');
  
  try {
    const imageData = await imageHelper.prepareImageForAnalysis(imagePath);
    
    const prompt = `Analise esta imagem e forneça:
    1. Lista de todos os objetos identificados
    2. Localização aproximada de cada objeto na imagem
    3. Características relevantes de cada objeto
    4. Relações entre os objetos na cena`;
    
    console.log(`Prompt: ${prompt}\n`);
    
    const response = await geminiService.analyzeImage(prompt, imageData.data, imageData.mimeType);
    console.log('Identificação de objetos:');
    console.log(response);
    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro na identificação de objetos:', error.message);
  }
}

/**
 * Função para demonstrar análise de múltiplas imagens
 */
async function multipleImageAnalysis(imagePaths) {
  console.log('=== Exemplo: Análise de Múltiplas Imagens ===\n');
  
  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    console.log(`📸 Analisando imagem ${i + 1}/${imagePaths.length}: ${imagePath}`);
    
    try {
      const imageData = await imageHelper.prepareImageForAnalysis(imagePath);
      const prompt = "Resuma o conteúdo desta imagem em 2-3 frases.";
      
      const response = await geminiService.analyzeImage(prompt, imageData.data, imageData.mimeType);
      console.log(`Resumo: ${response}\n`);
    } catch (error) {
      console.error(`Erro ao analisar ${imagePath}:`, error.message);
    }
  }
  
  console.log('='.repeat(50) + '\n');
}

/**
 * Executa todos os exemplos de análise de imagem
 */
export async function runImageAnalysisExamples(imagePaths = []) {
  console.log('🖼️ Iniciando exemplos de análise de imagem...\n');
  
  // Sempre executa o exemplo simples
  await simpleImageAnalysis();
  
  // Executa exemplos com arquivos se fornecidos
  if (imagePaths.length > 0) {
    const firstImage = imagePaths[0];
    
    await analyzeImageFromFile(firstImage);
    await textRecognitionExample(firstImage);
    await objectIdentificationExample(firstImage);
    
    if (imagePaths.length > 1) {
      await multipleImageAnalysis(imagePaths);
    }
  } else {
    console.log('ℹ️ Para testar análise de imagens reais, execute:');
    console.log('node src/examples/imageAnalysis.js caminho/para/imagem.jpg\n');
  }
  
  console.log('✅ Exemplos de análise de imagem concluídos!');
}

/**
 * Exemplo de uso para diferentes tipos de análise
 */
export const analysisTypes = {
  general: "Descreva esta imagem de forma geral.",
  detailed: "Forneça uma análise detalhada desta imagem, incluindo objetos, cores, composição e contexto.",
  technical: "Analise os aspectos técnicos desta imagem: qualidade, resolução aparente, tipo de fotografia, iluminação.",
  artistic: "Analise os elementos artísticos desta imagem: composição, uso de cores, estilo, impacto visual.",
  ocr: "Extraia todo o texto visível nesta imagem.",
  objects: "Liste e localize todos os objetos visíveis nesta imagem.",
  people: "Identifique e descreva pessoas nesta imagem (sem identificar indivíduos específicos).",
  scene: "Descreva o tipo de ambiente ou cena retratada nesta imagem."
};

// Executa os exemplos se o arquivo for executado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const imageArgs = process.argv.slice(2);
  runImageAnalysisExamples(imageArgs);
} 