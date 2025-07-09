# Documentação - Análise Financeira

## Visão Geral

O sistema agora possui funcionalidades específicas para análise de documentos financeiros, divididas em duas categorias principais:

1. **Recebimentos**: Análise de documentos que comprovam recebimento de valores
2. **Pagamentos**: Análise de documentos que comprovam pagamentos realizados

## Tipos de Análise Financeira

### 1. Recebimentos (`financial-receipt`)

**Objetivo**: Extrair informações de documentos de recebimento, incluindo ordens de serviço, comprovantes STONE e comprovantes de venda.

#### Tipos de Documentos Suportados:

##### Ordens de Serviço
**Identificação**: Geralmente está escrito "ordem de serviço" no canto superior direito da folha.

**Dados Extraídos**:
- Data
- Nome do cliente (ao lado de "Cliente:")
- Número da ordem (N + 4 dígitos, ex: "Nº 5866")
- Valor (ao lado de "Valor Total:")

##### Comprovantes de Recebimento STONE
**Identificação**: No topo da folha escrito abaixo de "STONE" "Comprovante de recebimento" ou rodapé escrito "Stone Instituição de Pagamentos S.A.".

**Dados Extraídos**:
- Data (abaixo de "Comprovante de recebimento")
- Nome de quem pagou
- Número de venda (se escrito à mão)
- Valor (abaixo de "Valor:")

##### Comprovantes de Venda
**Identificação**: No rodapé no canto inferior direito vai estar escrito "Nº" em vermelho e geralmente 3 números após e acima escrito "agradecemos a preferência".

**Dados Extraídos**:
- Data (sempre em "Entrada:")
- Nome (geralmente no campo "Nome:")
- Número de venda (canto inferior direito em vermelho, nunca manuscrito)
- Valor (em "Total R$")

**Formato de Retorno**:
- Formato padrão: `XX-XX VENDA XXXX NOME_CLIENTE XXX,XX`
- Se não houver dados: substitua por `ND`

**Exemplos**:
- Ordem de serviço: Hélio Filho, R$ 2090,00, 01 de abril, Nº 5866 → `01-04 VENDA 5866 HELIO FILHO 2090,00`
- Comprovante STONE: Hélio Filho, R$ 2090,00, 01 de abril, Nº 5866 → `01-04 VENDA 5866 HELIO FILHO 2090,00`
- Comprovante de venda: Hélio Filho, R$ 2090,00, 01 de abril, Nº 5866 → `01-04 VENDA 5866 HELIO FILHO 2090,00`

### 2. Pagamentos (`financial-payment`)

**Objetivo**: Extrair informações de documentos de pagamento, identificando automaticamente o tipo de documento.

**Tipos de Documentos Suportados**:

#### Boleto
- **Dados**: Data de vencimento + Nome do fornecedor + Valor
- **Formato**: `XX-XX NOME_FORNECEDOR XXX,XX`

#### Comprovante
- **Dados**: Data + Nome do fornecedor + Valor
- **Formato**: `XX-XX NOME_FORNECEDOR XXX,XX`

#### Nota
- **Dados**: Nome do fornecedor + Valor + Data de emissão (se houver)
- **Formato**: `XX-XX NOME_FORNECEDOR XXX,XX` ou `NOME_FORNECEDOR XXX,XX`

#### Nota Fiscal
- **Dados**: Data de emissão + Nome do fornecedor + Valor
- **Formato**: `XX-XX NOME_FORNECEDOR XXX,XX`

**Exemplo**:
- Entrada: Boleto da Enel, vencimento 20/04, R$ 89,50
- Saída: `20-04 ENEL 89,50`

## Prompts Utilizados

### Prompt para Recebimentos
```
Analise este documento de RECEBIMENTO e extraia SOMENTE: DATA, NOME DO CLIENTE (quem pagou) e VALOR.
FORMATO DE RETORNO OBRIGATÓRIO: XX-XX NOME_CLIENTE XXX,XX
Se não houver data, retorne apenas: NOME_CLIENTE XXX,XX
EXEMPLO: Para um recebimento de João Silva no valor de R$ 150,00 em 15 de março, retorne: 15-03 JOÃO SILVA 150,00
RETORNE APENAS NO FORMATO ESPECIFICADO, NADA MAIS.
```

### Prompt para Pagamentos
```
Analise este documento de PAGAMENTO e identifique o tipo (boleto, comprovante, nota ou nota fiscal) e extraia:

BOLETO: Data de vencimento + Nome do fornecedor + Valor
COMPROVANTE: Data + Nome do fornecedor + Valor  
NOTA: Nome do fornecedor + Valor + Data de emissão (se houver)
NOTA FISCAL: Data de emissão + Nome do fornecedor + Valor

FORMATO DE RETORNO OBRIGATÓRIO: XX-XX NOME_FORNECEDOR XXX,XX
Para notas sem data: NOME_FORNECEDOR XXX,XX

EXEMPLO: Boleto da Enel vencimento 20/04 valor R$ 89,50 = 20-04 ENEL 89,50
RETORNE APENAS NO FORMATO ESPECIFICADO, NADA MAIS.
```

## Implementação Técnica

### Backend (server.js)
- Adicionados novos tipos de análise: `financial-receipt` e `financial-payment`
- Prompts específicos para cada tipo de documento
- Integração com o método `analyzeReceipt` do GeminiService

### GeminiService.js
- Método `analyzeReceipt` atualizado para aceitar prompts personalizados
- Mantém compatibilidade com o prompt padrão existente
- Processamento rigoroso para garantir formato correto

### Frontend (index.html + script.js)
- Novas opções na interface: "Recebimentos" e "Pagamentos"
- Ícones específicos para cada tipo de análise
- Labels atualizados na função `getAnalysisTypeName`

## Como Usar

1. **Acesse a interface web** em `http://localhost:3000`
2. **Selecione o tipo de análise**:
   - Para documentos de recebimento: escolha "Recebimentos"
   - Para documentos de pagamento: escolha "Pagamentos"
3. **Faça upload da imagem** do documento
4. **Clique em "Analisar Imagem"**
5. **Visualize o resultado** no formato padronizado

## Benefícios

- **Padronização**: Formato consistente de saída para todos os documentos
- **Automação**: Identificação automática do tipo de documento de pagamento
- **Flexibilidade**: Suporte a documentos com ou sem data
- **Precisão**: Prompts específicos para cada tipo de documento
- **Integração**: Funciona com análise única e múltipla de imagens

## Limitações

- Depende da qualidade da imagem para extração precisa
- Formato de data limitado a DD-MM
- Requer que o texto seja legível na imagem
- Sujeito aos limites de rate da API do Gemini

## Próximos Passos

- Implementar validação adicional dos dados extraídos
- Adicionar suporte a mais formatos de data
- Criar relatórios automáticos baseados nos dados extraídos
- Implementar exportação para planilhas (CSV/Excel) 