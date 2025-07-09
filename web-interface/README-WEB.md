# 🌐 Interface Web - Leitor de Fotos com Gemini AI

Interface web moderna e intuitiva para análise de imagens usando Google Gemini AI.

## 🚀 Como Usar a Interface

### 1. **Iniciar o Servidor**

```bash
# Inicia o servidor web
npm run web

# Ou para desenvolvimento com reload automático
npm run web-dev
```

O servidor estará disponível em: **http://localhost:3000**

### 2. **Usando a Interface**

#### 📸 **Upload de Imagem**
- **Arrastar e Soltar**: Arraste qualquer imagem para a área de upload
- **Clique para Selecionar**: Clique na área de upload para escolher arquivo
- **Colar (Ctrl+V)**: Cole imagem diretamente da área de transferência
- **Formatos Suportados**: JPG, PNG, GIF, WebP, BMP (máx. 10MB)

#### 🔍 **Tipos de Análise**
1. **Descrição Geral** - Análise completa da imagem
2. **Extrair Texto (OCR)** - Reconhecimento de texto
3. **Identificar Objetos** - Lista objetos na imagem
4. **Pessoas na Imagem** - Identifica e descreve pessoas
5. **Análise Técnica** - Aspectos técnicos da fotografia
6. **Elementos Artísticos** - Composição e estilo

#### ⚡ **Funcionalidades**
- ✅ **Preview em Tempo Real** - Veja a imagem antes de analisar
- ✅ **Histórico Local** - Suas análises ficam salvas no navegador
- ✅ **Copiar Resultado** - Um clique para copiar a análise
- ✅ **Download** - Baixe o resultado como arquivo .txt
- ✅ **Responsivo** - Funciona em desktop, tablet e celular
- ✅ **Atalhos de Teclado** - Para uso mais rápido

### 3. **Atalhos de Teclado**

| Tecla | Ação |
|-------|------|
| `Ctrl+V` | Colar imagem da área de transferência |
| `Enter` | Analisar imagem selecionada |
| `Esc` | Nova análise |

## 🎨 Recursos da Interface

### **Design Moderno**
- Interface responsiva e intuitiva
- Gradientes modernos e animações suaves
- Ícones FontAwesome para melhor UX
- Tema escuro/claro automático

### **Experiência do Usuário**
- Feedback visual em tempo real
- Notificações toast para ações
- Loading states durante processamento
- Tratamento de erros amigável

### **Funcionalidades Avançadas**
- Histórico persistente no localStorage
- Drag & Drop com feedback visual
- Validação de arquivos em tempo real
- Compressão automática se necessário

## 🔧 Configuração Técnica

### **Estrutura de Arquivos**
```
web-interface/
├── server.js              # Servidor Express
├── public/
│   ├── index.html         # Interface principal
│   ├── style.css          # Estilos modernos
│   ├── script.js          # Funcionalidades JavaScript
│   └── uploads/           # Pasta temporária (criada automaticamente)
└── README-WEB.md          # Esta documentação
```

### **Endpoints da API**
- `GET /` - Interface principal
- `POST /api/analyze` - Análise de imagem via upload
- `POST /api/analyze-base64` - Análise via base64
- `GET /api/test` - Teste de conectividade

### **Configurações do Servidor**
- **Porta**: 3000 (configurável via PORT env)
- **Limite de arquivo**: 10MB
- **CORS**: Habilitado
- **Upload**: Multer com validação

## 📱 Compatibilidade

### **Navegadores Suportados**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### **Dispositivos**
- 💻 **Desktop** - Experiência completa
- 📱 **Mobile** - Interface adaptada
- 📱 **Tablet** - Layout otimizado

## 🛠️ Personalização

### **Modificar Tipos de Análise**
Edite o arquivo `server.js` na seção `prompts`:

```javascript
const prompts = {
  custom: "Seu prompt personalizado aqui",
  // ... outros prompts
};
```

### **Alterar Estilos**
Modifique `public/style.css` para personalizar:
- Cores do tema
- Fontes e tamanhos
- Animações e transições
- Layout responsivo

### **Adicionar Funcionalidades**
Edite `public/script.js` para:
- Novos tipos de análise
- Integração com outras APIs
- Recursos adicionais

## 🚨 Solução de Problemas

### **Servidor não inicia**
```bash
# Verifique se a porta 3000 está livre
netstat -an | findstr :3000

# Ou use outra porta
PORT=3001 npm run web
```

### **Erro na análise de imagem**
1. Verifique se a API Gemini está configurada
2. Teste: `npm start 4`
3. Verifique conexão de internet
4. Veja logs do servidor no terminal

### **Upload não funciona**
1. Verifique tamanho do arquivo (máx. 10MB)
2. Confirme formato suportado
3. Limpe cache do navegador
4. Verifique permissões da pasta uploads/

### **Interface não carrega**
1. Verifique se o servidor está rodando
2. Acesse http://localhost:3000 diretamente
3. Verifique console do navegador (F12)
4. Desabilite extensões do navegador

## 📈 Métricas e Analytics

### **Histórico Local**
- Máximo 50 análises armazenadas
- Dados salvos no localStorage
- Pesquisável por tipo e data

### **Performance**
- Carregamento < 2s
- Análise média: 3-8s (depende da imagem)
- Interface responsiva em < 100ms

## 🔐 Segurança

### **Dados**
- Imagens são removidas após análise
- Nenhum dado pessoal é armazenado no servidor
- Histórico fica apenas no seu navegador

### **Validações**
- Tipo de arquivo verificado
- Tamanho máximo limitado
- Sanitização de inputs
- Proteção CORS configurada

## 🆕 Próximas Atualizações

- [ ] Suporte a múltiplas imagens simultâneas
- [ ] Comparação entre imagens
- [ ] Exportação para PDF
- [ ] Temas personalizáveis
- [ ] PWA para uso offline
- [ ] Integração com cloud storage

---

**🎯 Agora você tem uma interface web completa para usar o Gemini AI!**

Acesse: **http://localhost:3000** e comece a analisar suas imagens! 🚀 