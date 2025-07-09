# 🚦 Gerenciamento de Rate Limits - API Gemini

## Visão Geral
Este documento explica como o sistema lida com os limites de taxa da API do Gemini e as estratégias implementadas para garantir uma experiência robusta.

## Limites da API Gemini (Plano Gratuito)

### Quotas por Minuto
- **Requisições**: 15 por minuto
- **Tokens**: 32.000 por minuto

### Quotas por Dia
- **Requisições**: 1.500 por dia
- **Tokens**: 50.000 por dia

## Estratégias Implementadas

### 1. Rate Limiting Proativo
- **Delay entre requisições**: 4 segundos (15 req/min = 1 req/4s)
- **Processamento sequencial**: Evita sobrecarga da API
- **Monitoramento de histórico**: Rastreia requisições dos últimos 60 segundos

### 2. Sistema de Retry Inteligente
- **Detecção automática**: Identifica erros 429 (Too Many Requests)
- **Extração de delay**: Lê o tempo sugerido pela API na resposta de erro
- **Retry automático**: Até 3 tentativas com backoff exponencial
- **Fallback**: Delay padrão de 60 segundos se não conseguir extrair tempo

### 3. Feedback para o Usuário

#### Modal de Aviso (5+ imagens)
- Estimativa de tempo de processamento
- Dicas sobre otimização
- Opção de cancelar ou continuar

#### Indicadores Visuais
- Barra de progresso detalhada
- Status de rate limiting em tempo real
- Contadores de sucesso/erro

## Códigos de Erro Tratados

### Erro 429 - Too Many Requests
```json
{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.RetryInfo",
        "retryDelay": "17s"
      }
    ]
  }
}
```

**Tratamento**:
1. Extrai o `retryDelay` da resposta
2. Aguarda o tempo especificado
3. Tenta novamente (até 3 vezes)
4. Se falhar, marca como erro e continua

## Otimizações Implementadas

### Backend (`GeminiService.js`)
```javascript
class GeminiService {
  constructor() {
    this.lastRequestTime = 0;
    this.minRequestInterval = 4000; // 4 segundos
    this.maxRetries = 3;
  }

  async executeWithRetry(requestFn, retryCount = 0) {
    // Implementação de retry com rate limiting
  }
}
```

### Frontend (`script.js`)
- Processamento sequencial de imagens
- Modal informativo para análises múltiplas
- Feedback visual de rate limiting
- Retry automático em caso de erro 429

## Dicas para Usuários

### Para Análises Múltiplas
- ✅ **Até 5 imagens**: Processamento rápido
- ⚠️ **6-15 imagens**: ~2-5 minutos (com avisos)
- 🚨 **15+ imagens**: Considere dividir em lotes

### Otimização de Uso
1. **Processe em lotes**: Máximo 10-15 imagens por vez
2. **Aguarde entre lotes**: 1-2 minutos entre grupos
3. **Monitore erros**: Se muitos erros 429, aguarde mais tempo
4. **Considere upgrade**: Plano pago tem limites maiores

## Monitoramento e Logs

### Logs do Console
```
⏳ Aguardando 4000ms para respeitar rate limit...
🔄 Rate limit atingido. Tentativa 1/3. Aguardando 17s...
✅ Processada: imagem.jpg -> 04-05 POSTO DE GASOLINA 300,00
❌ Erro ao processar imagem2.jpg: Rate limit persistente
```

### Métricas Rastreadas
- Tempo entre requisições
- Número de requisições por minuto
- Taxa de sucesso/erro
- Delays aplicados

## Arquivos Relacionados

### Backend
- `src/services/GeminiService.js` - Implementação principal
- `src/utils/rateLimitHelper.js` - Utilitários de rate limiting

### Frontend
- `web-interface/public/script.js` - Interface e controle
- `web-interface/public/style.css` - Estilos para feedback visual

## Próximas Melhorias

### Planejadas
- [ ] Cache de resultados para evitar reprocessamento
- [ ] Configuração de delays personalizáveis
- [ ] Dashboard de uso de quota
- [ ] Integração com planos pagos

### Considerações
- [ ] Implementar circuit breaker para falhas consecutivas
- [ ] Adicionar métricas de performance
- [ ] Suporte a múltiplas chaves de API
- [ ] Balanceamento de carga entre chaves

## Troubleshooting

### Problema: Muitos erros 429
**Solução**: 
1. Reduza o número de imagens por lote
2. Aumente o delay entre requisições
3. Verifique se não há outros processos usando a API

### Problema: Processamento muito lento
**Solução**:
1. Normal para plano gratuito (4s entre requisições)
2. Considere upgrade para plano pago
3. Processe em horários de menor uso

### Problema: Falhas persistentes
**Solução**:
1. Verifique conectividade
2. Confirme validade da chave API
3. Monitore logs para padrões de erro

## Recursos Adicionais
- [Documentação oficial - Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Planos e Preços do Gemini](https://ai.google.dev/pricing)
- [Melhores Práticas da API](https://ai.google.dev/gemini-api/docs/best-practices) 