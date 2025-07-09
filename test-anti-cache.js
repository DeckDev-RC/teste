/**
 * Script de teste para verificar eficácia do sistema anti-cache
 * 
 * Este script testa se o sistema consegue gerar respostas diferentes
 * para a mesma imagem usando as estratégias anti-cache implementadas.
 */

import GeminiService from './src/services/GeminiService.js';
import imageHelper from './src/utils/imageHelper.js';
import AntiCacheHelper from './src/utils/antiCacheHelper.js';
import fs from 'fs/promises';
import path from 'path';

const geminiService = new GeminiService();

/**
 * Testa a eficácia do anti-cache usando a mesma imagem múltiplas vezes
 */
async function testAntiCacheEffectiveness() {
  console.log('🧪 TESTE DO SISTEMA ANTI-CACHE');
  console.log('=' .repeat(50));
  
  // Verifica se existe uma imagem de teste
  const testImagePath = 'test-images/comprovante-teste.jpg';
  
  try {
    await fs.access(testImagePath);
  } catch (error) {
    console.log('❌ Imagem de teste não encontrada em:', testImagePath);
    console.log('💡 Crie uma pasta "test-images" e adicione "comprovante-teste.jpg"');
    return;
  }

  console.log(`📸 Usando imagem de teste: ${testImagePath}`);
  console.log('🔄 Executando 5 análises da mesma imagem...\n');

  const results = [];
  const prompt = 'Analise este comprovante e extraia: data, estabelecimento e valor no formato DD-MM ESTABELECIMENTO VALOR';

  // Prepara a imagem uma vez
  const imageData = await imageHelper.prepareImageForAnalysis(testImagePath);

  // Executa múltiplas análises com diferentes estratégias anti-cache
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`🔍 Análise ${i + 1}/5...`);
      
      // Varia o nome do arquivo para simular arquivos diferentes
      const fakeFileName = `comprovante-${i + 1}-${Date.now()}.jpg`;
      
      const analysis = await geminiService.analyzeReceipt(
        imageData.data,
        imageData.mimeType,
        prompt,
        true, // Formatação estruturada habilitada
        fakeFileName, // Nome único para anti-cache
        i // Índice para anti-cache
      );

      results.push({
        attempt: i + 1,
        analysis: analysis,
        fileName: fakeFileName
      });

      console.log(`✅ Resultado ${i + 1}: ${analysis}`);
      
      // Aguarda um pouco entre requisições
      if (i < 4) {
        console.log('⏳ Aguardando 2 segundos...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log(`❌ Erro na análise ${i + 1}:`, error.message);
      results.push({
        attempt: i + 1,
        analysis: `ERRO: ${error.message}`,
        fileName: `comprovante-${i + 1}.jpg`
      });
    }
  }

  // Analisa os resultados
  console.log('\n' + '='.repeat(50));
  console.log('📊 ANÁLISE DOS RESULTADOS');
  console.log('='.repeat(50));

  const uniqueResults = new Set(results.map(r => r.analysis));
  const totalResults = results.length;
  const uniqueCount = uniqueResults.size;
  const duplicateCount = totalResults - uniqueCount;

  console.log(`📈 Total de análises: ${totalResults}`);
  console.log(`✨ Resultados únicos: ${uniqueCount}`);
  console.log(`🔄 Resultados duplicados: ${duplicateCount}`);
  console.log(`📊 Taxa de sucesso anti-cache: ${((uniqueCount / totalResults) * 100).toFixed(1)}%`);

  if (uniqueCount > totalResults * 0.8) {
    console.log('🎉 EXCELENTE! Sistema anti-cache funcionando bem!');
  } else if (uniqueCount > totalResults * 0.6) {
    console.log('👍 BOM! Sistema anti-cache funcionando parcialmente.');
  } else {
    console.log('⚠️  ATENÇÃO! Sistema anti-cache precisa de melhorias.');
  }

  // Mostra todos os resultados
  console.log('\n📋 DETALHES DOS RESULTADOS:');
  console.log('-'.repeat(50));
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.analysis}`);
  });

  // Analisa padrões
  const resultFrequency = {};
  results.forEach(result => {
    resultFrequency[result.analysis] = (resultFrequency[result.analysis] || 0) + 1;
  });

  console.log('\n📊 FREQUÊNCIA DOS RESULTADOS:');
  console.log('-'.repeat(50));
  Object.entries(resultFrequency).forEach(([result, count]) => {
    const percentage = ((count / totalResults) * 100).toFixed(1);
    console.log(`${count}x (${percentage}%): ${result}`);
  });

  return {
    totalResults,
    uniqueCount,
    duplicateCount,
    successRate: (uniqueCount / totalResults) * 100,
    results
  };
}

/**
 * Testa diferentes estratégias de anti-cache
 */
async function testDifferentStrategies() {
  console.log('\n🔬 TESTE DE DIFERENTES ESTRATÉGIAS');
  console.log('='.repeat(50));

  const strategies = [
    { name: 'Sem anti-cache', useAntiCache: false },
    { name: 'Com anti-cache básico', useAntiCache: true },
    { name: 'Com anti-cache + contexto', useAntiCache: true, useContext: true }
  ];

  for (const strategy of strategies) {
    console.log(`\n🧪 Testando: ${strategy.name}`);
    console.log('-'.repeat(30));

    // Implementar testes específicos para cada estratégia
    console.log('⚙️  Estratégia configurada');
  }
}

// Executa os testes
async function main() {
  try {
    const results = await testAntiCacheEffectiveness();
    
    // Testa diferentes estratégias se disponível
    // await testDifferentStrategies();
    
    console.log('\n🏁 TESTE CONCLUÍDO!');
    
    if (results.successRate > 80) {
      console.log('🎯 Sistema funcionando otimamente!');
      process.exit(0);
    } else if (results.successRate > 60) {
      console.log('⚡ Sistema funcionando bem, mas pode melhorar.');
      process.exit(0);
    } else {
      console.log('🔧 Sistema precisa de ajustes.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    process.exit(1);
  }
}

// Executa apenas se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 