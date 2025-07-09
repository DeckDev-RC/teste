# 🛡️ Tratamento de Erros 503 (Service Unavailable) - API Gemini

## 📋 Problema

A API Gemini ocasionalmente retorna erros 503 (Service Unavailable) com a mensagem "The model is overloaded. Please try again later." Esses erros ocorrem quando os servidores da Google estão sobrecarregados e não conseguem processar todas as solicitações recebidas.

Diferentemente dos erros 429 (Too Many Requests) que estão relacionados ao limite de requisições por minuto de uma chave específica, os erros 503 indicam um problema de capacidade no lado do servidor da Google, afetando todas as chaves de API.

## ✅ Solução Implementada

### 1. **Detecção de Erros 503**

Implementamos a detecção de erros 503 em vários pontos do `GeminiService.js`:

```javascript
// No método executeWithRetry
const is503Error = error.message.includes('503') || 
                    error.message.includes('Service Unavailable') || 
                    error.message.includes('overloaded');

// No método sendMessage
if (error.message.includes('503') || 
    error.message.includes('Service Unavailable') || 
    error.message.includes('overloaded')) {
  // Tratamento específico para chat
}
```

### 2. **Backoff Exponencial Inteligente**

Para erros 503, aplicamos uma estratégia de backoff exponencial inteligente que tenta extrair o tempo de espera sugerido pela API ou usa um backoff exponencial calculado:

```javascript
if (is503Error) {
  // Para erros 503 (Service Unavailable), usamos backoff exponencial
  if (retryCount < this.maxRetries) {
    // Tenta extrair o tempo de retry do erro ou usa backoff exponencial
    let retryDelay;
    const extractedDelay = this.extractRetryDelay(error);
    
    if (extractedDelay) {
      // Se conseguiu extrair um tempo do erro, usa ele com um multiplicador baseado na tentativa
      retryDelay = extractedDelay * Math.pow(1.5, retryCount);
    } else {
      // Caso contrário, usa o backoff exponencial padrão
      retryDelay = this.calculateBackoff(retryCount);
    }
    
    console.log(`🔄 Erro de serviço sobrecarregado (503). Tentativa ${retryCount + 1}/${this.maxRetries}. Aguardando ${Math.round(retryDelay/1000)}s...`);
    
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    return this.executeWithRetry(requestFn, retryCount + 1);
  }
}
```

### 3. **Aumento do Número de Tentativas**

Aumentamos o número máximo de tentativas de 3 para 5 para dar mais chances de sucesso durante períodos de sobrecarga:

```javascript
this.maxRetries = 5; // Aumentado para 5 tentativas para lidar com erros 503
```

### 4. **Extração Inteligente do Tempo de Espera**

Adaptamos o método `extractRetryDelay` para também extrair informações de tempo de espera de erros 503:

```javascript
extractRetryDelay(error) {
  try {
    const errorMessage = error.message;
    
    // Tenta extrair pelo formato padrão
    const retryMatch = errorMessage.match(/"retryDelay":"(\d+)s"/);
    if (retryMatch) {
      return parseInt(retryMatch[1]) * 1000; // Converte para milissegundos
    }
    
    // Tenta extrair por formatos alternativos
    const secondaryMatch = errorMessage.match(/retry after (\d+)s/i);
    if (secondaryMatch) {
      return parseInt(secondaryMatch[1]) * 1000;
    }
    
    // Busca qualquer número seguido de s no erro
    const generalMatch = errorMessage.match(/(\d+)s/);
    if (generalMatch) {
      return parseInt(generalMatch[1]) * 1000;
    }
    
    // Verifica se é um erro 503 (Service Unavailable)
    if (errorMessage.includes('503') || 
        errorMessage.includes('Service Unavailable') || 
        errorMessage.includes('overloaded')) {
      // Para erros 503, usamos um tempo inicial maior
      return 30000; // 30 segundos para primeira tentativa
    }
  } catch (e) {
    console.warn('Não foi possível extrair retry delay do erro');
  }
  
  // Backoff exponencial: 60s na primeira tentativa, dobra a cada retry
  return 60000; // Default: 1 minuto
}
```

### 5. **Cálculo do Tempo de Espera**

Utilizamos o método `calculateBackoff` existente como fallback, que implementa um backoff exponencial com jitter (variação aleatória) para evitar que múltiplos clientes tentem novamente ao mesmo tempo:

```javascript
calculateBackoff(retryCount) {
  // Base: 30 segundos, dobra a cada tentativa
  const baseDelay = 30000;
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  
  // Adiciona jitter (variação aleatória) de até 25%
  const jitter = Math.random() * 0.25 * exponentialDelay;
  
  // Limita a no máximo 5 minutos
  return Math.min(exponentialDelay + jitter, 300000);
}
```

## 📊 Tempos de Espera por Tentativa

| Tentativa | Tempo Base | Tempo com Jitter (aprox.) | Descrição |
|-----------|------------|---------------------------|------------|
| 1         | 30s        | 30-37.5s                  | Primeira tentativa após falha |
| 2         | 60s        | 60-75s                    | Segunda tentativa |
| 3         | 120s       | 120-150s                  | Terceira tentativa |
| 4         | 240s       | 240-300s                  | Quarta tentativa |
| 5         | 300s       | 300s (máximo)             | Quinta tentativa |

## 🔍 Diferenças no Tratamento de Erros

| Tipo de Erro | Estratégia | Justificativa |
|--------------|------------|---------------|
| **429 (Too Many Requests)** | Rotação de chave API + retry rápido (2s) | Problema específico da chave atual, trocar para outra chave resolve |
| **503 (Service Unavailable)** | Extração inteligente de tempo + Backoff exponencial (30s → 300s) | Problema do servidor Gemini, afeta todas as chaves, necessário aguardar mais tempo e adaptar-se às recomendações da API |

## 🚀 Benefícios

1. **Maior Resiliência**: O sistema agora consegue lidar com períodos de sobrecarga da API Gemini
2. **Redução de Falhas**: Menos erros propagados para o usuário final
3. **Uso Eficiente**: Evita sobrecarregar ainda mais os servidores com tentativas muito frequentes
4. **Adaptação Inteligente**: Extrai e utiliza informações de tempo de espera sugeridas pela API quando disponíveis
5. **Escalabilidade Progressiva**: Aumenta o tempo de espera progressivamente com base no número de tentativas
6. **Experiência Melhorada**: Maior probabilidade de completar análises mesmo durante períodos de instabilidade

## 🧪 Como Testar

Foi criado um script de teste para verificar o tratamento de erros 503:

```bash
node teste-erro-503.js
```

Este script realiza dois testes:

1. **Simulação de Erro 503**: Testa o mecanismo de retry com um erro 503 simulado
2. **Requisição Real**: Testa uma requisição real para a API Gemini

O código do teste está disponível em `teste-erro-503.js` e pode ser usado para verificar se o sistema está tratando corretamente os erros 503.