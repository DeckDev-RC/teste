# 📄 Análise de Comprovantes e Boletos

## Visão Geral

A funcionalidade de análise de comprovantes e boletos permite extrair dados estruturados de documentos financeiros, retornando informações organizadas em um formato padronizado.

## Como Usar

1. **Acesse a interface web**: `http://localhost:3000`
2. **Selecione o tipo de análise**: "Comprovantes/Boletos"
3. **Faça upload da imagem**: Arraste ou clique para selecionar
4. **Clique em "Analisar Imagem"**

## Formato de Retorno

O sistema retorna os dados **EXATAMENTE** no seguinte formato:
```
DD-MM NOME VALOR
```

### Exemplo de Retorno
```
01-04 CAMINHOS DO OESTE 726,02
```

**IMPORTANTE**: A resposta contém apenas esses dados, sem texto adicional ou formatação extra.

## Dados Extraídos

### 1. Data (DD-MM)
- Formato: Dia-Mês (ex: 04-12)
- Busca por padrões: DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA
- Se não encontrada: "N/A"

### 2. Nome do Pagador
- Nome da pessoa que realizou o pagamento
- Extraído de campos como "Pagador", "Cliente", etc.
- Se não encontrado: "N/A"

### 3. Estabelecimento/Beneficiário
- Nome da empresa, loja ou pessoa que recebeu o pagamento
- Extraído de campos como "Beneficiário", "Empresa", etc.
- Se não encontrado: "N/A"

### 4. Valor
- Valor da transação
- Formatos aceitos: R$ 1.000,00, 1000.00, 1.000,00
- Se não encontrado: "N/A"

## Tipos de Documentos Suportados

- ✅ Comprovantes de transferência bancária
- ✅ Comprovantes de PIX
- ✅ Boletos bancários
- ✅ Recibos de pagamento
- ✅ Notas fiscais simples
- ✅ Comprovantes de cartão

## Tratamento de Erros

Se o documento não for reconhecido como um comprovante válido:
```
ERRO: Não é um comprovante válido
```

## Dicas para Melhores Resultados

### Qualidade da Imagem
- Use imagens com boa resolução
- Evite imagens borradas ou com baixa qualidade
- Certifique-se de que o texto está legível

### Iluminação
- Evite sombras sobre o documento
- Use iluminação uniforme
- Evite reflexos que possam ocultar informações

### Enquadramento
- Capture todo o documento
- Mantenha o documento reto (não inclinado)
- Evite cortar partes importantes

## Exemplos de Uso

### Comprovante de PIX
**Entrada**: Imagem de comprovante PIX
**Saída**: `15-03 SUPERMERCADO ABC 89,50`

### Boleto Bancário
**Entrada**: Imagem de boleto pago
**Saída**: `28-02 ENERGIA ELÉTRICA 245,67`

### Transferência Bancária
**Entrada**: Imagem de comprovante TED/DOC
**Saída**: `10-01 CONSULTORIA XYZ 1.500,00`

## API Endpoints

### Upload de Arquivo
```http
POST /api/analyze
Content-Type: multipart/form-data

{
  "image": [arquivo],
  "analysisType": "receipt"
}
```

### Base64
```http
POST /api/analyze-base64
Content-Type: application/json

{
  "imageData": "data:image/jpeg;base64,/9j/4AAQ...",
  "analysisType": "receipt",
  "mimeType": "image/jpeg"
}
```

## Limitações

- Tamanho máximo do arquivo: 10MB
- Formatos suportados: JPG, PNG, GIF, WebP, BMP
- Funciona melhor com documentos em português
- Requer conexão com a API do Google Gemini

## Solução de Problemas

### "ERRO: Não é um comprovante válido"
- Verifique se a imagem contém um documento financeiro
- Certifique-se de que o texto está legível
- Tente uma imagem com melhor qualidade

### Dados incompletos (N/A)
- Verifique se todas as informações estão visíveis na imagem
- Alguns documentos podem não conter todos os campos
- Tente uma imagem com melhor resolução

### Erro de conexão
- Verifique sua conexão com a internet
- Confirme se a API key do Gemini está configurada
- Verifique os logs do servidor para mais detalhes

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do console do navegador
2. Consulte os logs do servidor
3. Teste com diferentes tipos de imagem
4. Verifique a configuração da API do Gemini 