import geminiService from './src/services/GeminiService.js';

async function exemploSimples() {
  console.log('🤖 Testando Gemini API...\n');
  
  try {
    // Exemplo 1: Pergunta simples
    console.log('📝 Fazendo uma pergunta simples...');
    const resposta1 = await geminiService.generateText("Qual é a capital do Brasil?");
    console.log('Resposta:', resposta1);
    console.log('\n' + '-'.repeat(50) + '\n');
    
    // Exemplo 2: Chat conversacional
    console.log('💬 Iniciando um chat...');
    const chat = await geminiService.startChat();
    
    const pergunta1 = "Olá! Como você está?";
    console.log(`Você: ${pergunta1}`);
    const resposta2 = await geminiService.sendMessage(chat, pergunta1);
    console.log(`Gemini: ${resposta2}\n`);
    
    const pergunta2 = "Pode me contar uma curiosidade interessante?";
    console.log(`Você: ${pergunta2}`);
    const resposta3 = await geminiService.sendMessage(chat, pergunta2);
    console.log(`Gemini: ${resposta3}\n`);
    
    console.log('✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executa o exemplo
exemploSimples(); 