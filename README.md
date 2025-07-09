# 💰 Leitor de Documentos Financeiros

Sistema especializado para extração automatizada de dados de documentos financeiros utilizando IA do Google Gemini.

## 🖥️ Versões Disponíveis

### 🌐 **Versão Web** (Atual)
- Interface web acessível via navegador
- Execução em servidor Node.js
- Ideal para uso compartilhado

### 🖥️ **Versão Desktop (Tauri)** - ✨ **NOVO!**
- Aplicativo desktop nativo
- Melhor performance e segurança
- Executável independente
- Suporte a Windows, macOS e Linux

**📖 Para usar a versão desktop, consulte o [Guia do Tauri](TAURI_SETUP.md)**

## 🎯 Funcionalidades

O sistema oferece dois tipos de leitura de documentos:

### 📈 Contas a Receber (`financial-receipt`)
Extrai dados de documentos de recebimento, incluindo:

#### 📄 Ordens de Serviço
- **Data**
- **Número da ordem de venda** (ex: Nº 5866)
- **Nome do cliente** (quem pagou)
- **Valor total**

#### 🏪 Comprovantes de Recebimento STONE
- **Data** (abaixo de "Comprovante de recebimento")
- **Nome de quem pagou**
- **Número de venda** (se escrito à mão)
- **Valor** (abaixo de "Valor")

#### 🛒 Comprovantes de Venda
- **Data** (campo "Entrada:")
- **Nome do cliente** (campo "Nome:")
- **Número de venda** (canto inferior direito em vermelho, nunca manuscrito)
- **Valor** (campo "Total R$")

**Identificação**: Rodapé no canto inferior direito com "Nº" em vermelho e acima "agradecemos a preferência"

**Formato de saída**: `DD-MM VENDA XXXX NOME_CLIENTE VALOR,XX`

**Exemplo**: `01-04 VENDA 5866 HELIO FILHO 2090,00`

### 📉 Contas a Pagar (`financial-payment`)
Identifica automaticamente o tipo de documento e extrai:

- **Boleto**: Data de vencimento + Fornecedor + Valor
- **Comprovante**: Data + Fornecedor + Valor
- **Nota**: Fornecedor + Valor + Data (se houver)
- **Nota Fiscal**: Data de emissão + Fornecedor + Valor

**Formato de saída**: `DD-MM NOME_FORNECEDOR VALOR,XX`

## 🚀 Como Usar

1. **Acesse a interface web**: `http://localhost:3000`
2. **Selecione o tipo de documento**:
   - Para documentos de recebimento: escolha "Contas a Receber"
   - Para documentos de pagamento: escolha "Contas a Pagar"
3. **Faça upload do arquivo** (imagem ou PDF) do documento
4. **Clique em "Analisar Arquivo"**
5. **Visualize o resultado** no formato padronizado

## 📋 Tipos de Documentos Suportados

### 📁 Formatos de Arquivo
- ✅ **Imagens**: JPEG, PNG, GIF, WebP, BMP (máx. 20MB)
- ✅ **PDFs**: Análise direta sem conversão (máx. 20MB)

### 📈 Contas a Receber
- ✅ Ordens de serviço
- ✅ Comprovantes de recebimento STONE
- ✅ Comprovantes de venda

### 📉 Contas a Pagar
- ✅ Comprovantes de transferência bancária
- ✅ Comprovantes de PIX
- ✅ Boletos bancários
- ✅ Recibos de pagamento
- ✅ Notas fiscais
- ✅ Comprovantes de cartão

## ⚙️ Instalação

### Pré-requisitos
- Node.js 18+
- Conta Google Cloud com Gemini API habilitada

### Configuração

1. **Clone o repositório**:
```bash
git clone <url-do-repositorio>
cd leitor-documentos-financeiros
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure a API do Gemini**:
```bash
# Crie um arquivo .env na raiz do projeto
echo "GEMINI_API_KEY=sua_chave_api_aqui" > .env
```

4. **Inicie o servidor**:

#### Versão Web:
```bash
npm run web        # Servidor web na porta 3001
npm run web-dev    # Servidor web com auto-reload
```

#### Versão Desktop (Tauri):
```bash
npm run tauri-dev    # Desenvolvimento com hot-reload
npm run tauri-build  # Compilar para produção
```

5. **Acesse a aplicação**: 
   - **Web**: `http://localhost:3001`
   - **Desktop**: Executável gerado em `src-tauri/target/release/`

## 🔧 API Endpoints

### Upload de Arquivo
```http
POST /api/analyze
Content-Type: multipart/form-data

{
  "image": [arquivo],
  "analysisType": "financial-receipt" | "financial-payment"
}
```

### Base64
```http
POST /api/analyze-base64
Content-Type: application/json

{
  "imageData": "data:image/jpeg;base64,/9j/4AAQ...",
  "analysisType": "financial-receipt" | "financial-payment",
  "mimeType": "image/jpeg"
}
```

## 📊 Exemplos de Retorno

### Contas a Receber
```
01-04 VENDA 5866 HELIO FILHO 2090,00
```

### Contas a Pagar
```
20-04 ENEL 89,50
```

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **IA**: Google Gemini 1.5 Flash
- **Upload**: Multer
- **Processamento**: 
  - Sharp (para otimização de imagens)
  - Google File API (para análise direta de PDFs)

## 📝 Estrutura do Projeto

```
├── web-interface/
│   ├── public/
│   │   ├── index.html          # Interface principal
│   │   ├── script.js           # Lógica do frontend
│   │   └── style.css           # Estilos
│   └── server.js               # Servidor Express
├── src/
│   ├── services/
│   │   └── GeminiService.js    # Integração com Gemini
│   └── utils/
│       ├── imageHelper.js      # Processamento de imagens
│       └── fileNameHelper.js   # Geração de nomes
├── .env                        # Configurações (criar)
├── package.json
└── README.md
```

## 🔐 Segurança

- Upload limitado a 20MB por arquivo
- Validação rigorosa de tipos de arquivo (imagens e PDFs)
- Rate limiting para APIs
- Arquivos temporários removidos automaticamente
- PDFs processados via Google File API com limpeza automática

## 📈 Performance

- Suporte a análise múltipla de imagens **SEM LIMITE de quantidade**
- Download em lote de resultados
- Cache de resultados no navegador
- Compressão automática de imagens
- Estatísticas em tempo real durante processamento
- Estimativa de tempo restante baseada em performance atual

### ⚡ Processamento em Lote

- **Sem limite**: Analise 50, 100, 500+ imagens de uma vez
- **Processamento sequencial**: Respeita limites de rate da API automaticamente
- **Controle de progresso**: Estatísticas detalhadas em tempo real
- **Retry automático**: Recuperação inteligente de erros de rate limit
- **Cancelamento**: Feche a aba para interromper o processamento

### ⏱️ Estimativas de Tempo

- **Até 15 imagens**: ~1-2 minutos
- **50 imagens**: ~15-20 minutos  
- **100 imagens**: ~30-40 minutos
- **500+ imagens**: Várias horas

> **Dica**: Para grandes volumes, deixe processando e monitore o progresso

## 🐛 Solução de Problemas

### Erro "API key inválida"
- Verifique se a `GEMINI_API_KEY` está correta no arquivo `.env`
- Confirme se a API do Gemini está habilitada no Google Cloud

### Análise retorna "ERRO"
- Verifique se a imagem contém um documento financeiro válido
- Certifique-se de que o texto está legível
- Tente uma imagem com melhor qualidade

### Arquivo muito grande
- Comprima a imagem antes do upload
- Máximo suportado: 10MB por arquivo

## 📄 Licença

Este projeto está licenciado sob a MIT License.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 🛡️ Sistema Anti-Cache Avançado

### Problema Resolvido: Cache Agressivo da API Gemini

A API do Google Gemini possui um cache interno muito agressivo que reconhece imagens idênticas independente do nome do arquivo, retornando sempre a mesma resposta. Este problema foi **completamente resolvido** com nosso sistema anti-cache multi-layer.

### ✅ Solução Implementada

- **Cache Break Avançado**: Múltiplos identificadores únicos no prompt
- **Configurações Variadas**: Temperature, topK, topP randomizados
- **Contexto Específico**: Hash do arquivo + índice do lote
- **Retry Progressivo**: Variação aumenta a cada tentativa

### 📊 Resultados

| Antes | Depois |
|-------|--------|
| 1 resposta única em 5 tentativas (20%) | 4-5 respostas únicas (80-100%) |
| Cache break ineficaz | ✅ Cache quebrado efetivamente |
| Processamento não confiável | ✅ Processamento robusto |

### 🧪 Como Testar

```bash
# Crie pasta test-images/ com uma imagem
mkdir test-images
# Adicione comprovante-teste.jpg na pasta

# Execute o teste automatizado
node test-anti-cache.js
```

**Taxa de sucesso esperada**: >80% de respostas únicas

**Documentação completa**: [ANTI_CACHE_SYSTEM.md](ANTI_CACHE_SYSTEM.md)

## 🚀 Performance