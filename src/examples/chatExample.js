import geminiService from '../services/GeminiService.js';

/**
 * Exemplo de chat simples
 */
async function simpleChatExample() {
  console.log('=== Exemplo: Chat Simples ===\n');
  
  try {
    // Inicia o chat
    const chat = await geminiService.startChat();
    
    // Primeira mensagem
    console.log('Usuário: Olá! Qual é o seu nome?');
    let response = await geminiService.sendMessage(chat, 'Olá! Qual é o seu nome?');
    console.log(`Gemini: ${response}\n`);
    
    // Segunda mensagem
    console.log('Usuário: Pode me explicar como funciona a fotossíntese?');
    response = await geminiService.sendMessage(chat, 'Pode me explicar como funciona a fotossíntese?');
    console.log(`Gemini: ${response}\n`);
    
    // Terceira mensagem
    console.log('Usuário: Obrigado pela explicação!');
    response = await geminiService.sendMessage(chat, 'Obrigado pela explicação!');
    console.log(`Gemini: ${response}\n`);
    
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro no chat:', error.message);
  }
}

/**
 * Exemplo de chat com histórico inicial
 */
async function chatWithHistoryExample() {
  console.log('=== Exemplo: Chat com Histórico ===\n');
  
  try {
    // Histórico inicial da conversa
    const history = [
      {
        role: 'user',
        parts: [{ text: 'Você é um assistente especializado em culinária.' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Olá! Sou seu assistente culinário. Posso ajudá-lo com receitas, técnicas de cozimento, dicas de ingredientes e muito mais. Como posso ajudá-lo hoje?' }]
      }
    ];
    
    // Inicia chat com histórico
    const chat = await geminiService.startChat(history);
    
    // Mensagem sobre receitas
    console.log('Usuário: Preciso de uma receita rápida para o jantar usando frango.');
    let response = await geminiService.sendMessage(chat, 'Preciso de uma receita rápida para o jantar usando frango.');
    console.log(`Chef Gemini: ${response}\n`);
    
    // Pergunta sobre substituições
    console.log('Usuário: Posso substituir o frango por peixe nessa receita?');
    response = await geminiService.sendMessage(chat, 'Posso substituir o frango por peixe nessa receita?');
    console.log(`Chef Gemini: ${response}\n`);
    
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro no chat com histórico:', error.message);
  }
}

/**
 * Exemplo de chat com configurações personalizadas
 */
async function customChatExample() {
  console.log('=== Exemplo: Chat com Configurações Personalizadas ===\n');
  
  try {
    const options = {
      temperature: 0.3,    // Mais conservador
      maxTokens: 300,      // Respostas mais concisas
      topP: 0.7,          // Menos diversidade
      topK: 20            // Vocabulário mais focado
    };
    
    const chat = await geminiService.startChat([], options);
    
    console.log('Usuário: Preciso de uma explicação técnica sobre machine learning.');
    const response = await geminiService.sendMessage(chat, 'Preciso de uma explicação técnica sobre machine learning.');
    console.log(`Gemini (modo técnico): ${response}\n`);
    
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.error('Erro no chat personalizado:', error.message);
  }
}

/**
 * Executa todos os exemplos de chat
 */
export async function runChatExamples() {
  console.log('💬 Iniciando exemplos de chat...\n');
  
  await simpleChatExample();
  await chatWithHistoryExample();
  await customChatExample();
  
  console.log('✅ Exemplos de chat concluídos!');
}

// Executa os exemplos se o arquivo for executado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runChatExamples();
} 