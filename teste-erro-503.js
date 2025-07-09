/**
 * Teste para verificar o tratamento de erros 503 (Service Unavailable)
 * Este script simula um erro 503 e verifica se o sistema consegue se recuperar
 */

import GeminiService from './src/services/GeminiService.js';

// Cria uma instância do serviço
const geminiService = new GeminiService();

// Função que simula uma requisição que falha com erro 503
async function simulateRequest503() {
  const requestFn = async () => {
    // Simula um erro 503
    throw new Error('[GoogleGenerativeAI Error]: Error fetching from `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent:` [503 Service Unavailable] The model is overloaded. Please try again later.');
  };

  try {
    // Tenta executar a requisição com o mecanismo de retry
    await geminiService.executeWithRetry(requestFn);
    console.log('✅ Sucesso! A requisição foi completada após os retries');
  } catch (error) {
    console.error('❌ Falha após todas as tentativas:', error.message);
  }
}

// Função que testa o sistema real com uma requisição simples
async function testRealRequest() {
  try {
    console.log('🧪 Testando geração de texto simples...');
    const result = await geminiService.generateText('Olá, como você está?');
    console.log('✅ Resposta recebida:', result);
  } catch (error) {
    console.error('❌ Erro na requisição real:', error.message);
  }
}

// Executa os testes
console.log('🚀 Iniciando teste de tratamento de erros 503...');

// Primeiro testa a simulação
console.log('\n📋 Teste 1: Simulação de erro 503');
await simulateRequest503();

// Depois testa uma requisição real
console.log('\n📋 Teste 2: Requisição real');
await testRealRequest();

console.log('\n🏁 Testes concluídos!');