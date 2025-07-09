import { runTextGenerationExamples } from './examples/textGeneration.js';
import { runChatExamples } from './examples/chatExample.js';
import { runImageAnalysisExamples } from './examples/imageAnalysis.js';
import geminiConfig from './config/gemini.js';

/**
 * Menu interativo para escolher exemplos
 */
function showMenu() {
  console.log('\n🤖 === INTEGRAÇÃO COM GOOGLE GEMINI ===\n');
  console.log('Escolha uma opção:');
  console.log('1. Exemplos de Geração de Texto');
  console.log('2. Exemplos de Chat Conversacional');
  console.log('3. Exemplos de Análise de Imagem');
  console.log('4. Testar Configuração da API');
  console.log('5. Executar Todos os Exemplos');
  console.log('0. Sair\n');
}

/**
 * Testa se a configuração da API está funcionando
 */
async function testApiConfiguration() {
  console.log('🔧 Testando configuração da API...\n');
  
  try {
    // Testa conexão básica
    const model = geminiConfig.getModel();
    const result = await model.generateContent('Olá! Você está funcionando?');
    const response = await result.response;
    
    console.log('✅ API configurada corretamente!');
    console.log(`🤖 Resposta: ${response.text()}\n`);
    
    // Tenta listar modelos disponíveis
    try {
      console.log('📋 Modelos disponíveis:');
      const models = await geminiConfig.getAvailableModels();
      
      if (models && models.length > 0) {
        models.slice(0, 5).forEach(model => {
          console.log(`  - ${model.name}`);
        });
        if (models.length > 5) {
          console.log(`  ... e mais ${models.length - 5} modelos`);
        }
      }
    } catch (error) {
      console.log('ℹ️ Não foi possível listar modelos (isso é normal em algumas configurações)');
    }
    
  } catch (error) {
    console.error('❌ Erro na configuração da API:');
    console.error(`   ${error.message}\n`);
    console.log('💡 Verifique se:');
    console.log('   - Sua chave API está correta');
    console.log('   - Você tem conexão com a internet');
    console.log('   - A chave API tem as permissões necessárias\n');
  }
}

/**
 * Simula um prompt interativo simples
 */
async function interactiveMode() {
  console.log('🎯 Modo Interativo - Digite suas perguntas!\n');
  console.log('Digite "sair" para voltar ao menu principal.\n');
  
  // Como não temos readline, vamos simular algumas interações
  const exampleQuestions = [
    "Qual é a capital do Brasil?",
    "Explique o que é inteligência artificial",
    "Como fazer um bolo de chocolate?",
    "Conte uma piada"
  ];
  
  try {
    const model = geminiConfig.getModel();
    
    for (const question of exampleQuestions) {
      console.log(`👤 Pergunta: ${question}`);
      
      const result = await model.generateContent(question);
      const response = await result.response;
      
      console.log(`🤖 Resposta: ${response.text()}\n`);
      console.log('-'.repeat(50) + '\n');
    }
    
    console.log('ℹ️ Exemplo de modo interativo concluído!');
    console.log('💡 Para implementar entrada real do usuário, use uma biblioteca como "readline" ou "prompt-sync"\n');
    
  } catch (error) {
    console.error('Erro no modo interativo:', error.message);
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando aplicação Gemini...\n');
  
  // Verifica argumentos da linha de comando
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const option = args[0];
    
    switch (option) {
      case '1':
      case 'text':
        await runTextGenerationExamples();
        break;
      case '2':
      case 'chat':
        await runChatExamples();
        break;
      case '3':
      case 'image':
        const imagePaths = args.slice(1);
        await runImageAnalysisExamples(imagePaths);
        break;
      case '4':
      case 'test':
        await testApiConfiguration();
        break;
      case '5':
      case 'all':
        await testApiConfiguration();
        await runTextGenerationExamples();
        await runChatExamples();
        await runImageAnalysisExamples();
        break;
      case 'interactive':
        await interactiveMode();
        break;
      default:
        console.log('❌ Opção inválida!');
        showMenu();
    }
    
    return;
  }
  
  // Menu interativo simples
  showMenu();
  console.log('💡 Execute com argumentos para pular o menu:');
  console.log('   npm start 1    # Exemplos de texto');
  console.log('   npm start 2    # Exemplos de chat');
  console.log('   npm start 3    # Exemplos de imagem');
  console.log('   npm start 4    # Testar API');
  console.log('   npm start 5    # Todos os exemplos');
  console.log('   npm start interactive  # Modo interativo\n');
  
  // Executa teste básico por padrão
  await testApiConfiguration();
}

// Tratamento de erros globais
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erro não tratado:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

// Executa a aplicação
main().catch(console.error); 