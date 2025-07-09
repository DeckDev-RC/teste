import geminiService from '../services/GeminiService.js';

/**
 * Exemplo de geração de texto simples
 */
async function simpleTextGeneration() {
  console.log('=== Exemplo: Geração de Texto Simples ===\n');
  
  try {
    const prompt = "Explique o que é inteligência artificial em 3 parágrafos.";
    console.log(`Prompt: ${prompt}\n`);
    
    const response = await geminiService.generateText(prompt);
    console.log('Resposta:');
    console.log(response);
    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro na geração de texto:', error.message);
  }
}

/**
 * Exemplo de geração com configurações personalizadas
 */
async function customTextGeneration() {
  console.log('=== Exemplo: Geração com Configurações Personalizadas ===\n');
  
  try {
    const prompt = "Crie uma receita criativa de pizza com ingredientes inusitados.";
    console.log(`Prompt: ${prompt}\n`);
    
    const options = {
      temperature: 0.9,     // Mais criativo
      maxTokens: 500,       // Resposta mais curta
      topP: 0.95,          // Maior diversidade
      topK: 50             // Mais opções de palavras
    };
    
    const response = await geminiService.generateText(prompt, options);
    console.log('Resposta:');
    console.log(response);
    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro na geração de texto:', error.message);
  }
}

/**
 * Exemplo de contagem de tokens
 */
async function tokenCounting() {
  console.log('=== Exemplo: Contagem de Tokens ===\n');
  
  try {
    const text = "Esta é uma frase de exemplo para contagem de tokens.";
    console.log(`Texto: ${text}\n`);
    
    const tokenCount = await geminiService.countTokens(text);
    console.log(`Número de tokens: ${tokenCount}`);
    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro na contagem de tokens:', error.message);
  }
}

/**
 * Executa todos os exemplos de geração de texto
 */
export async function runTextGenerationExamples() {
  console.log('🚀 Iniciando exemplos de geração de texto...\n');
  
  await simpleTextGeneration();
  await customTextGeneration();
  await tokenCounting();
  
  console.log('✅ Exemplos de geração de texto concluídos!');
}

// Executa os exemplos se o arquivo for executado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runTextGenerationExamples();
} 