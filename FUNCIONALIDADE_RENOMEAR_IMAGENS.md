# 📸 Funcionalidade de Renomeação de Imagens

## Descrição
Esta funcionalidade permite baixar as imagens analisadas com nomes baseados na resposta do Gemini AI, facilitando a organização e identificação dos arquivos.

## Como Funciona

### 1. Análise Única
- Após analisar uma imagem, aparece o botão **"Baixar Renomeada"**
- O sistema gera um nome baseado na análise do Gemini
- A imagem é baixada com o novo nome

### 2. Análise Múltipla
- Após analisar múltiplas imagens, aparece o botão **"Baixar ZIP Renomeado"**
- Todas as imagens são processadas e renomeadas
- Um arquivo ZIP é criado com todas as imagens renomeadas

## Regras de Nomenclatura

### Para Comprovantes/Boletos
- Formato: `DD-MM NOME VALOR,XX.extensão`
- Exemplo: `04-05 POSTO DE GASOLINA 300,00.jpg`
- Extrai data, nome do estabelecimento e valor mantendo formatação original

### Para Outros Tipos de Análise
- Usa as primeiras palavras significativas da análise
- Preserva espaços e vírgulas na formatação original
- Limita o tamanho do nome
- Exemplo: `Homem caminhando na praia.jpg`

## Sanitização de Nomes
- Remove apenas caracteres realmente problemáticos: `< > : " / \ | ? *`
- **PRESERVA espaços e vírgulas** conforme formatação original do Gemini
- Substitui múltiplos espaços por um único espaço
- Remove espaços, pontos, underscores e hífens do início e fim
- Limita o comprimento máximo
- Garante nomes únicos adicionando timestamp se necessário

## Endpoints da API

### `/api/download-renamed`
- **Método**: POST
- **Parâmetros**: 
  - `image`: arquivo de imagem
  - `analysisType`: tipo de análise
- **Retorna**: arquivo de imagem com nome baseado na análise

### `/api/download-multiple-renamed`
- **Método**: POST
- **Parâmetros**: 
  - `images[]`: array de arquivos de imagem
  - `analysisType`: tipo de análise
- **Retorna**: arquivo ZIP com todas as imagens renomeadas

## Arquivos Modificados

### Backend
- `src/utils/fileNameHelper.js` - Utilitários para sanitização e geração de nomes
- `web-interface/server.js` - Novos endpoints para download renomeado
- `package.json` - Adicionada dependência `archiver`

### Frontend
- `web-interface/public/index.html` - Novos botões de download
- `web-interface/public/script.js` - Funções para download renomeado
- `web-interface/public/style.css` - Estilos para os novos botões

## Tratamento de Erros
- Fallback para nome original em caso de erro na análise
- Logs detalhados para debugging
- Mensagens de erro amigáveis para o usuário
- Limpeza automática de arquivos temporários

## Limitações
- Máximo de 50 imagens por vez para análise múltipla
- Tamanho máximo de 10MB por imagem
- Nomes limitados a 100 caracteres
- Dependente da qualidade da resposta do Gemini

## Benefícios
- ✅ Organização automática de arquivos
- ✅ Identificação rápida do conteúdo
- ✅ Padronização de nomenclatura
- ✅ Facilita busca e categorização
- ✅ Especialmente útil para comprovantes financeiros

## Exemplo de Uso

1. **Upload de comprovante**
2. **Seleção do tipo "Comprovantes/Boletos"**
3. **Análise retorna**: `04-05 POSTO DE GASOLINA 300,00`
4. **Nome gerado**: `04-05 POSTO DE GASOLINA 300,00.jpg`
5. **Download da imagem renomeada**

## Próximos Passos
- [ ] Configuração de templates de nomenclatura
- [ ] Suporte a mais formatos de arquivo
- [ ] Integração com sistemas de armazenamento em nuvem
- [ ] Histórico de renomeações realizadas 