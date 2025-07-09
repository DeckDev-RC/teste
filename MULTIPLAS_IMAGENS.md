# 📸 Análise de Múltiplas Imagens

## 🎯 Visão Geral

A funcionalidade de análise de múltiplas imagens permite processar várias imagens simultaneamente, ideal para analisar lotes de comprovantes, documentos ou qualquer conjunto de imagens.

## 🚀 Como Usar

### 1. Ativar Modo Múltiplas Imagens
- Acesse `http://localhost:3000`
- Ative o toggle "Analisar múltiplas imagens"
- O texto da área de upload mudará para "Arraste suas imagens aqui"

### 2. Selecionar Imagens
- **Arrastar e soltar**: Arraste múltiplas imagens para a área de upload
- **Clique para selecionar**: Clique na área e selecione múltiplas imagens (Ctrl+clique)
- **Adicionar mais**: Repita o processo para adicionar mais imagens

### 3. Gerenciar Imagens
- **Visualizar**: Veja preview de todas as imagens selecionadas
- **Remover**: Clique no ❌ para remover imagens individuais
- **Limpar todas**: Use o botão "Limpar Todas" para remover todas

### 4. Analisar
- Selecione o tipo de análise desejado
- Clique em "Analisar Todas as Imagens"
- Acompanhe o progresso em tempo real

## 📊 Características

### Limitações
- **Máximo**: 20 imagens por análise
- **Tamanho**: 10MB por imagem
- **Formatos**: JPG, PNG, GIF, WebP, BMP

### Processamento
- **Lotes**: Processa em grupos de 3 imagens simultaneamente
- **Progresso**: Barra de progresso em tempo real
- **Resiliente**: Continua mesmo se algumas imagens falharem

### Resultados
- **Organizados**: Cada resultado mostra a imagem correspondente
- **Status**: Indica sucesso ✅ ou erro ❌ para cada imagem
- **Formatação**: Resultados de comprovantes são formatados automaticamente

## 🎨 Interface

### Preview das Imagens
```
┌─────────────────────────────────────┐
│ Preview das Imagens (5)             │
├─────────────────────────────────────┤
│ [img1] [img2] [img3] [img4] [img5]  │
│                                     │
│ [Analisar Todas] [Limpar Todas]     │
└─────────────────────────────────────┘
```

### Resultados
```
┌─────────────────────────────────────┐
│ Resultados das Análises (5)         │
├─────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐     │
│ │[img] file1  │ │[img] file2  │     │
│ │✅ Sucesso   │ │❌ Erro      │     │
│ │Resultado... │ │Erro: ...    │     │
│ └─────────────┘ └─────────────┘     │
└─────────────────────────────────────┘
```

## 🔧 Funcionalidades Avançadas

### Análise de Comprovantes em Lote
Ideal para processar múltiplos comprovantes:
```
Resultado 1: 01-04 POSTO GASOLINA 150,00
Resultado 2: 02-04 SUPERMERCADO ABC 89,50
Resultado 3: 03-04 FARMACIA XYZ 45,30
```

### Download em Lote
- **Copiar Todos**: Copia todos os resultados para área de transferência
- **Baixar Todos**: Gera arquivo .txt com todos os resultados organizados

### Histórico Múltiplo
- Salva análises múltiplas no histórico
- Mostra estatísticas (total de imagens, sucessos, erros)
- Permite reexibir resultados anteriores

## 📈 Performance

### Otimizações
- **Processamento em lotes**: Evita sobrecarga do servidor
- **Progresso visual**: Feedback em tempo real
- **Tratamento de erros**: Não para por falhas individuais
- **Memória eficiente**: Libera recursos após processamento

### Tempos Estimados
- **1-5 imagens**: 10-30 segundos
- **6-10 imagens**: 30-60 segundos  
- **11-20 imagens**: 1-3 minutos

*Tempos variam conforme complexidade da análise e velocidade da conexão*

## 🛠️ Casos de Uso

### 1. Contabilidade
```
Entrada: 15 comprovantes de despesas
Saída: Lista formatada com data, estabelecimento e valor
Uso: Importação para planilhas contábeis
```

### 2. Inventário
```
Entrada: Fotos de produtos em estoque
Saída: Descrições detalhadas de cada item
Uso: Catalogação automática
```

### 3. Documentação
```
Entrada: Múltiplos documentos digitalizados
Saída: Texto extraído de cada documento
Uso: Digitalização de arquivos físicos
```

### 4. Análise Técnica
```
Entrada: Fotos de equipamentos/instalações
Saída: Relatórios técnicos de cada item
Uso: Inspeções e laudos
```

## 🔍 Solução de Problemas

### Imagens não carregam
- Verifique se são formatos suportados
- Confirme se não excedem 10MB cada
- Tente com menos imagens por vez

### Análise lenta
- Reduza o número de imagens
- Verifique sua conexão com internet
- Aguarde - processamento pode demorar

### Resultados incompletos
- Algumas imagens podem falhar individualmente
- Verifique a qualidade das imagens com erro
- Tente reprocessar apenas as que falharam

### Erro de memória
- Reduza o número de imagens
- Feche outras abas do navegador
- Reinicie a aplicação se necessário

## 🎯 Dicas de Uso

### Para Melhores Resultados
1. **Qualidade**: Use imagens nítidas e bem iluminadas
2. **Organização**: Nomeie arquivos de forma descritiva
3. **Lotes**: Processe grupos menores para maior controle
4. **Backup**: Baixe resultados importantes

### Fluxo Recomendado
1. Organize imagens por tipo/categoria
2. Ative modo múltiplas imagens
3. Adicione primeiro lote (5-10 imagens)
4. Selecione tipo de análise apropriado
5. Execute análise e baixe resultados
6. Repita para próximo lote

## 📱 Responsividade

A interface se adapta a diferentes tamanhos de tela:
- **Desktop**: Grade com múltiplas colunas
- **Tablet**: Grade com 2 colunas
- **Mobile**: Lista vertical

## 🔄 Integração

### API Endpoints
A funcionalidade usa os mesmos endpoints existentes:
- `POST /api/analyze` - Para cada imagem individual
- Processamento em paralelo no frontend
- Mesma validação e tratamento de erros

### Compatibilidade
- ✅ Funciona com todos os tipos de análise existentes
- ✅ Mantém compatibilidade com modo single
- ✅ Integra com histórico e funcionalidades existentes 