# Teste - Comprovantes de Venda

## Descrição

Este documento serve como guia para testar a nova funcionalidade de processamento de **Comprovantes de Venda** no sistema de análise financeira.

## Como Identificar um Comprovante de Venda

### Características Visuais
- **Rodapé**: No canto inferior direito deve estar escrito "Nº" em vermelho
- **Numeração**: Geralmente 3 números após o "Nº" vermelho
- **Texto Superior**: Acima do número deve estar escrito "agradecemos a preferência"

### Campos Específicos
- **Data**: Sempre no campo "Entrada:"
- **Cliente**: Geralmente no campo "Nome:"
- **Valor**: Campo "Total R$"
- **Número de Venda**: Canto inferior direito em vermelho (nunca manuscrito)

## Como Testar

### 1. Preparação
```bash
# Inicie o servidor
cd web-interface
node server.js
```

### 2. Acesso à Interface
- Abra o navegador em `http://localhost:3000`
- Selecione o tipo de análise: **"Contas a Receber"** (`financial-receipt`)

### 3. Upload da Imagem
- Faça upload de uma imagem de comprovante de venda
- Clique em "Analisar Imagem"

### 4. Resultado Esperado
O sistema deve retornar no formato:
```
DD-MM VENDA XXXX NOME_CLIENTE VALOR,XX
```

## Exemplos de Teste

### Exemplo 1: Comprovante Completo
**Dados da imagem:**
- Data (Entrada:): 15/03/2024
- Nome: João Silva
- Total R$: 250,75
- Nº (vermelho): 123

**Resultado esperado:**
```
15-03 VENDA 123 JOÃO SILVA 250,75
```

### Exemplo 2: Dados Faltando
**Dados da imagem:**
- Data (Entrada:): 10/04/2024
- Nome: Maria Santos
- Total R$: (não visível)
- Nº (vermelho): 456

**Resultado esperado:**
```
10-04 VENDA 456 MARIA SANTOS ND
```

### Exemplo 3: Sem Número de Venda
**Dados da imagem:**
- Data (Entrada:): 20/05/2024
- Nome: Pedro Costa
- Total R$: 1890,00
- Nº (vermelho): (não visível)

**Resultado esperado:**
```
20-05 VENDA ND PEDRO COSTA 1890,00
```

## Casos de Teste Específicos

### Teste 1: Identificação Correta do Tipo
- **Objetivo**: Verificar se o sistema identifica corretamente como comprovante de venda
- **Método**: Upload de imagem com "Nº" em vermelho e "agradecemos a preferência"
- **Resultado**: Deve processar como comprovante de venda (não como ordem de serviço ou STONE)

### Teste 2: Extração de Data
- **Objetivo**: Verificar extração do campo "Entrada:"
- **Método**: Imagem com data clara no campo "Entrada:"
- **Resultado**: Data no formato DD-MM

### Teste 3: Extração de Nome
- **Objetivo**: Verificar extração do campo "Nome:"
- **Método**: Imagem com nome claro no campo "Nome:"
- **Resultado**: Nome completo do cliente

### Teste 4: Extração de Valor
- **Objetivo**: Verificar extração do campo "Total R$"
- **Método**: Imagem com valor claro em "Total R$"
- **Resultado**: Valor no formato XXX,XX

### Teste 5: Número de Venda
- **Objetivo**: Verificar extração do número vermelho
- **Método**: Imagem com número vermelho no canto inferior direito
- **Resultado**: Número após "VENDA"

## Debugging

### Verificar Logs do Servidor
```bash
# O servidor deve mostrar:
🔍 DEBUG - Prompt obtido: Identifique se é uma ORDEM DE SERVIÇO, um COMPROVANTE DE RECEBIMENTO DA STONE ou um COMPROVANTE DE VENDA...
🤖 DEBUG - Resposta bruta da IA: [resposta]
✅ DEBUG - Resposta final: [resultado formatado]
```

### Verificar Prompt
```javascript
// No console do navegador ou teste direto:
import { getPrompt } from '../src/config/prompts.js';
console.log(getPrompt('financial-receipt'));
// Deve incluir seção "COMPROVANTE DE VENDA"
```

## Problemas Comuns

### 1. Sistema não reconhece como comprovante de venda
- **Causa**: Falta "Nº" vermelho ou "agradecemos a preferência"
- **Solução**: Verificar se a imagem contém essas características

### 2. Data não extraída corretamente
- **Causa**: Campo "Entrada:" não visível ou em formato diferente
- **Solução**: Verificar se o campo está claro na imagem

### 3. Nome não extraído
- **Causa**: Campo "Nome:" não visível ou em posição diferente
- **Solução**: Verificar layout do documento

### 4. Valor não extraído
- **Causa**: Campo "Total R$" não visível ou formato diferente
- **Solução**: Verificar se o valor está claramente marcado

## Integração com Outros Tipos

### Compatibilidade
O sistema deve continuar processando corretamente:
- **Ordens de Serviço**: Identificação por "ordem de serviço" no canto superior
- **Comprovantes STONE**: Identificação por "STONE" ou "Stone Instituição"
- **Comprovantes de Venda**: Identificação por "Nº" vermelho e "agradecemos a preferência"

### Formato Unificado
Todos os tipos retornam no mesmo formato:
```
DD-MM VENDA XXXX NOME_CLIENTE VALOR,XX
```

## Conclusão

O sistema agora suporta três tipos de documentos de recebimento, mantendo total compatibilidade com os tipos existentes e usando o mesmo formato de saída padronizado. 