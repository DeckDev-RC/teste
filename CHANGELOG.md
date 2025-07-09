# Changelog

## [2.6.0] - 2025-01-31
### Adicionado
- **Versão Desktop com Tauri** 🖥️
  - Aplicativo desktop nativo para Windows, macOS e Linux
  - Melhor performance usando WebView nativo do sistema
  - Executáveis menores que Electron
  - Sandboxing e permissões granulares para maior segurança
  - Backend em Rust para performance superior
  - Servidor Node.js integrado como processo filho
  - Inicialização automática do servidor ao abrir o aplicativo
  - Detecção automática de ambiente (Tauri vs Browser)
  - Fallback inteligente para funcionamento em ambas as versões

### Configuração
- **Estrutura Tauri completa**:
  - `src-tauri/src/main.rs` - Ponto de entrada principal
  - `src-tauri/src/lib.rs` - Lógica do aplicativo com comandos Tauri
  - `src-tauri/src/server.rs` - Gerenciamento do servidor integrado
  - `src-tauri/tauri.conf.json` - Configuração do aplicativo
  - `src-tauri/Cargo.toml` - Dependências Rust
  - Ícones gerados para todas as plataformas

### Scripts
- **Novos comandos npm**:
  - `npm run tauri-dev` - Desenvolvimento com hot-reload
  - `npm run tauri-build` - Compilação para produção
  - `npm run tauri-build-debug` - Compilação debug (mais rápida)
  - `npm run tauri` - Acesso direto ao CLI do Tauri

### Integração
- **JavaScript de integração** (`tauri-integration.js`):
  - Classe `TauriIntegration` para comunicação com backend Rust
  - Métodos para gerenciar servidor (start/stop/status)
  - Wrapper para requisições HTTP funcionando em ambos os ambientes
  - Upload de arquivos único e múltiplo
  - Download de resultados e ZIP com imagens renomeadas
  - Limpeza de cache e estatísticas
  - Detecção automática de ambiente Tauri vs Browser

### Documentação
- **Guia completo** (`TAURI_SETUP.md`):
  - Instruções de instalação do Rust
  - Configuração de dependências do sistema
  - Comandos de compilação e desenvolvimento
  - Troubleshooting detalhado
  - Benefícios do Tauri vs Electron
  - Estrutura do projeto explicada

### Melhorado
- **README.md atualizado** com seção sobre versões disponíveis
- **package.json** com scripts do Tauri
- **Frontend** preparado para funcionar em ambos os ambientes
- **Compatibilidade total** entre versões web e desktop

## [2.5.0] - 2025-01-31
### Corrigido
- **PARIDADE TOTAL ENTRE VERSÕES**: Versão desktop agora funciona EXATAMENTE igual à web
- **Prompts Unificados**: Substituído sistema simplificado por prompts completos da versão web
  - Suporte completo a ordens de serviço, Stone, Sicoob, comprovantes de venda
  - Regras detalhadas e específicas para cada tipo de documento
  - Formatação avançada com múltiplos cenários
- **Endpoints Completos**: Adicionados endpoints faltantes no Electron:
  - `/api/analyze-base64` - Análise via base64
  - `/api/download-renamed` - Download de arquivo renomeado
  - `/api/progress` - Endpoint SSE para progresso
  - `/api/download-multiple-renamed` - Download múltiplo em ZIP
- **Funcionalidades Avançadas**: Implementados recursos que estavam apenas na web:
  - Suporte completo a múltiplos tipos de documentos
  - Análise de PDFs no Electron
  - Sistema de renomeação de arquivos
  - Processamento em lote com ZIP
  - Geração de nomes de arquivo baseada em análise

### Adicionado
- **Compatibilidade 100%**: Interface desktop agora acessa TODOS os recursos da web
- **Análise Avançada**: Versão Electron com mesma capacidade da web
- **Processamento Múltiplo**: Download em ZIP na versão desktop
- **Diagnóstico Completo**: Análise profunda revelou diferenças críticas

### Melhorado
- **Arquitetura Unificada**: Eliminadas diferenças entre versões
- **Manutenibilidade**: Código base mais consistente
- **Experiência do Usuário**: Funcionalidades idênticas em ambas as versões

## [2.4.1] - 2025-01-08
### Corrigido
- **Erro crítico na versão compilada do Electron** (#005)
  - Erro "Unexpected token '<', '<!DOCTYPE'... is not valid JSON" na aplicação instalada
  - Implementado sistema de retry com backoff exponencial para conexões com o servidor
  - Melhorado tratamento de erro em todas as chamadas fetch para verificar se a resposta é JSON válida
  - Aumentado delay de inicialização do servidor no Electron de 1s para 3s
  - Adicionado verificação de saúde do servidor antes de carregar a interface
  - Implementado retry automático no carregamento da URL principal do Electron
  - Correção de condição de corrida entre inicialização do servidor e carregamento da interface
  - **Versão Electron agora funciona exatamente igual à versão web**
  - Melhorado tratamento de erro no GeminiService com logs detalhados
  - Inicialização mais robusta com fallback automático

### Adicionado
- **Novos endpoints para diagnóstico** (#005)
  - `/api/test-gemini` para testar especificamente a API Gemini
  - Logs detalhados de inicialização e status dos serviços
  - Mensagens de erro mais específicas para diferentes tipos de falha
  - Logging detalhado no GeminiService para debugging

### Melhorado
- **Paridade total entre versões web e desktop** (#005)
  - Mesmos endpoints e funcionalidades
  - Mesma estrutura de resposta da API
  - Mesmo comportamento de erro e retry
  - Compatibilidade 100% entre as versões
- Robustez da aplicação Electron em diferentes ambientes
- Logs mais detalhados para debugging de problemas de conexão
- Tratamento de erro mais específico para diferentes tipos de resposta (JSON vs HTML)
- Tempo de inicialização mais confiável na versão compilada

## [2.4.0] - 2025-01-08
### Adicionado
- **Suporte nativo a PDFs** (#004)
  - Análise direta de documentos PDF sem conversão
  - Uso do Google File API para processamento otimizado
  - Suporte a PDFs de até 20MB
  - Preview específico para PDFs na interface
  
- **Interface atualizada** (#004)
  - Novos badges visuais para distinguir PDFs de imagens
  - Ícones específicos para cada tipo de arquivo
  - Textos atualizados para refletir suporte a múltiplos formatos
  - Preview melhorado com identificação de tipo de arquivo
  
- **Validação aprimorada** (#004)
  - Detecção automática de tipo de arquivo (imagem vs PDF)
  - Validação rigorosa de MIME types
  - Mensagens de erro específicas por tipo de arquivo
  - Limite de tamanho aumentado para 20MB

### Alterado
- Limite de upload aumentado de 10MB para 20MB para acomodar PDFs
- Textos da interface atualizados de "imagem" para "arquivo"
- Filtro de upload expandido para aceitar `.pdf`
- Função de análise roteada automaticamente por tipo de arquivo

### Melhorado
- Performance de análise de PDFs superior à conversão para imagem
- Limpeza automática de arquivos temporários
- Gerenciamento de memória otimizado para PDFs grandes
- Logs detalhados para debugging de PDFs

### Documentação
- **README.md atualizado** (#004)
  - Nova seção "Formatos de Arquivo" 
  - Instruções atualizadas para PDFs
  - Tecnologias expandidas com Google File API
  - Segurança atualizada com validação de PDFs

## [2.3.0] - 2024-12-20
### Adicionado
- **Sistema avançado de rate limiting** (#003)
  - Fila de requisições para processamento ordenado
  - Monitoramento em tempo real de limites da API
  - Backoff exponencial com jitter para erros 429
  - Controle de janela deslizante para melhor distribuição
  
- **Cache de imagens** (#003)
  - Armazenamento automático de resultados para reuso
  - Evita reprocessamento de imagens idênticas
  - Política LRU (Least Recently Used) para gestão de cache
  - Hash único baseado em conteúdo+prompt
  
- **Monitor de estatísticas** (#003)
  - Dashboard em tempo real de uso da API
  - Visualização da fila de processamento
  - Estatísticas de cache (hits/misses)
  - Barra de progresso visual para rate limits

### Melhorado
- Detecção e extração mais robusta de retry delay dos erros da API
- Aumento do intervalo mínimo entre requisições para 5s (12 req/min)
- Tratamento de erros com mensagens mais específicas
- Logs mais detalhados com status de processamento

### Corrigido
- Falhas repetidas por rate limit em lotes grandes de imagens
- Reprocessamento desnecessário de imagens idênticas
- Intervalos inconsistentes entre requisições
- Sobrecarga da API em uploads simultâneos

## [2.2.0] - 2024-12-19
### Adicionado
- **Suporte a Comprovantes de Venda** (#002)
  - Reconhecimento automático de comprovantes de venda além de ordens de serviço e comprovantes STONE
  - Extração de dados específicos: data (campo "Entrada:"), nome (campo "Nome:"), número de venda (canto inferior direito em vermelho) e valor (campo "Total R$")
  - Identificação automática pelo rodapé "Nº" em vermelho e texto "agradecemos a preferência"
  - Mesmo formato de retorno padronizado: `XX-XX VENDA XXXX NOME_CLIENTE XXX,XX`
  
### Alterado
- **Prompt unificado ampliado** (#002)
  - Agora identifica automaticamente três tipos: ordens de serviço, comprovantes STONE E comprovantes de venda
  - Mantém total compatibilidade com análises existentes
  - Instruções específicas para cada tipo de documento
  
### Documentação
- **README.md atualizado** (#002)
  - Nova seção "Comprovantes de Venda" em Contas a Receber
  - Documentação detalhada dos campos e identificação
  - Lista de documentos suportados expandida

## [2.1.0] - 2024-12-19
### Adicionado
- **Processamento ilimitado**: Removido limite de 20 imagens - agora analise quantas quiser
- **Estatísticas em tempo real**: Contador de processadas, erros, tempo decorrido e estimativa restante
- **Avisos inteligentes**: Alertas específicos baseados na quantidade de imagens (50+, 100+)
- **Estimativas precisas**: Tempo restante calculado baseado na performance atual
- **Feedback melhorado**: Emojis e cores diferenciadas para grandes volumes

### Alterado
- Limite do servidor aumentado de 50 para 1000 imagens por requisição
- Aviso de rate limit agora aparece com 10+ imagens (antes era 5+)
- Interface de upload atualizada para indicar "sem limite de quantidade"
- Estimativas de tempo agora mostram horas e minutos para grandes volumes
- Botões de ação com cores diferenciadas para volumes perigosos (100+ imagens)

### Melhorado
- Performance do processamento em lote
- Feedback visual durante análises longas
- Mensagens de conclusão mais informativas
- Documentação atualizada com estimativas de tempo

## [2.0.0] - 2024-12-19
### Alterado
- **BREAKING CHANGE**: Aplicação agora foca exclusivamente em documentos financeiros
- Removidos todos os tipos de análise exceto "Contas a Receber" e "Contas a Pagar"
- Interface simplificada com apenas 2 opções de leitura
- Título da aplicação alterado para "Leitor de Documentos Financeiros"
- Ícone principal alterado para `fa-file-invoice-dollar`
- Descrição atualizada para "Extraia dados de contas a pagar e receber com IA"

### Removido
- Análise geral de imagens
- Extração de texto (OCR) genérica
- Identificação de objetos
- Análise de pessoas
- Análise técnica de imagens
- Análise de elementos artísticos
- Tipo "Comprovantes/Boletos" genérico

### Adicionado
- Validação rigorosa de tipos de análise no backend
- Mensagens de erro específicas para tipos não suportados
- README.md completamente reescrito focando em documentos financeiros

### Corrigido
- Lógica simplificada no servidor removendo condicionais desnecessárias
- Formatação de resultados adaptada para os novos tipos
- Geração de nomes de arquivo atualizada para os tipos financeiros

## [1.1.0] - 2024-12-19
### Adicionado
- **Suporte a Comprovantes de Recebimento STONE** (#001)
  - Reconhecimento automático de comprovantes STONE além das ordens de serviço
  - Extração de dados: data, nome do pagador, número de venda e valor
  - Mesmo formato de retorno padronizado: `XX-XX VENDA XXXX NOME_CLIENTE XXX,XX`
  
### Alterado
- **Prompt unificado para financial-receipt** (#001)
  - Agora identifica automaticamente ordens de serviço E comprovantes STONE
  - Mantém compatibilidade com análises existentes
  
- **Função de formatação aprimorada** (#001)
  - Suporte ao novo formato com VENDA XXXX
  - Fallback para formato antigo (compatibilidade)
  - Parsing manual melhorado
  
- **Geração de nomes de arquivo atualizada** (#001)
  - Suporte ao novo formato com número de venda
  - Mantém compatibilidade com formatos anteriores

### Documentação
- **README.md atualizado** (#001)
  - Seção de Contas a Receber expandida
  - Exemplos atualizados com novo formato
  - Lista de documentos suportados reorganizada
  
- **DOCUMENTACAO_ANALISE_FINANCEIRA.md atualizada** (#001)
  - Detalhamento dos tipos de documentos suportados
  - Especificações técnicas de cada tipo
  
- **Arquivo de teste criado** (#001)
  - TESTE_COMPROVANTES_STONE.md com instruções de uso
  - Exemplos práticos e cenários de teste

## [1.0.0] - 2024-12-18
### Adicionado
- Sistema base de análise de documentos financeiros
- Suporte a ordens de serviço
- Interface web para upload e análise
- API REST para integração
- Processamento em lote de imagens
- Download de resultados renomeados

### Tecnologias
- Google Gemini 1.5 Flash para análise
- Node.js + Express.js backend
- Interface web responsiva
- Suporte a múltiplos formatos de imagem 