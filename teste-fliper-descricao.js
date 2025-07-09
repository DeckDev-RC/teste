/**
 * Script de teste para a extração de descrição entre parênteses
 * para a empresa Fliper no ParallelAnalysisManager
 */

import ParallelAnalysisManager from './src/utils/parallelAnalysisManager.js';

// Função de teste
function testarExtracaoDescricao() {
  console.log('Testando extração de descrição entre parênteses para Fliper');
  
  // Casos de teste
  const testCases = [
    '02-07 FERRO MIX COMERCIAL LTDA (FERRAGISTA).jpg',
    '03-07 FABRICIO RODRIGUES DE ALMEIDA (GRÁFICA).png',
    'Comprovante de pagamento (Conta de luz).pdf',
    'Sem descrição.jpg',
    'Descrição (com parênteses (aninhados)).jpg',
    null,
    undefined
  ];
  
  // Testa cada caso
  for (const fileName of testCases) {
    const descricao = ParallelAnalysisManager.extractDescriptionFromFileName(fileName);
    console.log(`Arquivo: ${fileName}`);
    console.log(`Descrição extraída: ${descricao || 'Nenhuma descrição encontrada'}`);
    console.log('---');
  }
  
  // Testa a formatação completa com diferentes formatos de dados
  const testFormatCases = [
    {
      rawData: 'DATA: 02-07\nNOME: FERRO MIX COMERCIAL LTDA\nVALOR: 288,00',
      fileName: '02-07 FERRO MIX COMERCIAL LTDA (FERRAGISTA).jpg',
      description: 'Formato estruturado com DATA, NOME e VALOR'
    },
    {
      rawData: 'Comprovante de pagamento\nData: 03/07\nNome do beneficiário: FABRICIO RODRIGUES DE ALMEIDA\nValor: R$ 150,00',
      fileName: '03-07 FABRICIO RODRIGUES DE ALMEIDA (GRÁFICA).png',
      description: 'Formato com prefixos R$ e variações de escrita'
    },
    {
      rawData: 'Pagamento realizado em 05-08 para EMPRESA XYZ no valor de 500,00',
      fileName: 'Pagamento (Serviço mensal).pdf',
      description: 'Formato em texto corrido sem palavras-chave'
    },
    {
      rawData: 'Comprovante de pagamento\nData: 10/09\nPagamento para CONSTRUTORA SILVA & FILHOS LTDA\nValor: R$ 1.250,00',
      fileName: 'Pagamento CONSTRUTORA (Material de construção).pdf',
      description: 'Formato com nome de empresa complexo'
    }
  ];
  
  console.log('\nTestes de formatação completa:');
  for (const testCase of testFormatCases) {
    const formatted = ParallelAnalysisManager.formatReceiptData(testCase.rawData, testCase.fileName, 'fliper');
    console.log(`\n${testCase.description}:`);
    console.log(`Dados brutos: ${testCase.rawData}`);
    console.log(`Nome do arquivo: ${testCase.fileName}`);
    console.log(`Resultado formatado: ${formatted}`);
  }
}

// Função para formatar o valor monetário corretamente
function formatarValor(valor) {
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

// Sobrescreve a função formatReceiptData para testes
const originalFormatReceiptData = ParallelAnalysisManager.formatReceiptData;
ParallelAnalysisManager.formatReceiptData = function(formatted, fileName, company) {
  if (company.toLowerCase() === 'fliper' && fileName) {
    // Extrai a descrição do nome do arquivo
    const fileDescription = this.extractDescriptionFromFileName(fileName) || 'ND';
    
    // Procura por padrões como "DATA: 02-07" ou "Data: 02/07"
    const datePattern = /(?:DATA|Date|Data):?\s*(\d{1,2})[-\/](\d{1,2})/i;
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
      valor = formatarValor(valor);
      
      // Retorna no formato especificado: DD-MM NOME (DESCRIÇÃO) XXX,XX
      return `${date} ${nome} (${fileDescription}) ${valor}`;
    } else {
      // Fallback: tenta extrair informações usando padrões mais genéricos
      // Padrão para extrair data no formato DD-MM
      const genericDatePattern = /(\d{1,2})[-\/](\d{1,2})/;
      const genericDateMatch = formatted.match(genericDatePattern);
      
      // Padrão para extrair valor monetário
      const genericValuePattern = /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\b/g;
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
        valor = formatarValor(valor);
        
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
  
  return originalFormatReceiptData.call(this, formatted, fileName, company);
};

// Executa o teste
testarExtracaoDescricao();

// Restaura a função original
ParallelAnalysisManager.formatReceiptData = originalFormatReceiptData;