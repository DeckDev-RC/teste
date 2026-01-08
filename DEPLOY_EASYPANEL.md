# 🚀 Tutorial: Deploy no Easypanel

## Pré-requisitos
- VPS Hostinger KVM2 com Easypanel instalado
- Domínio `leitordedoc.agregarnegocios.com.br` apontando para a VPS
- Repositório Git: `https://github.com/DeckDev-RC/teste.git`

---

## Passo 1: Criar Projeto no Easypanel

1. Acesse o painel Easypanel da sua VPS
2. Clique em **"Create Project"**
3. Nome do projeto: `leitor-docs`
4. Clique em **"Create"**

---

## Passo 2: Criar App do Backend (API)

### 2.1 Criar o App
1. Dentro do projeto `leitor-docs`, clique em **"+ Service"**
2. Selecione **"App"**
3. Nome do app: `api`

### 2.2 Configurar Source
1. Vá na aba **"Source"**
2. Selecione **"GitHub"**
3. Repository: `https://github.com/DeckDev-RC/teste.git`
4. Branch: `master`
5. **Root Path**: `backend`
6. Clique em **Save**

### 2.3 Configurar Build
1. Vá na aba **"Build"**
2. Type: **Dockerfile**
3. Dockerfile Path: `Dockerfile` (já está na pasta backend)

### 2.4 Configurar Environment Variables
1. Vá na aba **"Environment"**
2. Adicione as seguintes variáveis:

```
GEMINI_API_KEY=sua_chave_aqui
OPENAI_API_KEY=sua_chave_aqui
OPEN_ROUTE_API_KEY=chave1,chave2,chave3
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://leitordedoc.agregarnegocios.com.br
```

### 2.5 Configurar Network
1. Vá na aba **"Network"**
2. Clique em **"Add Port"**
3. Port: `3001`
4. **Importante**: Marque como **Internal** (sem domínio público)
   - O frontend vai acessar internamente via `api:3001`

### 2.6 Deploy
1. Clique em **"Deploy"**
2. Aguarde o build completar (pode levar 2-5 minutos)
3. Verifique os logs para confirmar que está rodando

---

## Passo 3: Criar App do Frontend

### 3.1 Criar o App
1. Clique em **"+ Service"** novamente
2. Selecione **"App"**
3. Nome do app: `frontend`

### 3.2 Configurar Source
1. Vá na aba **"Source"**
2. Selecione **"GitHub"**
3. Repository: `https://github.com/DeckDev-RC/teste.git`
4. Branch: `master`
5. **Root Path**: `frontend`

### 3.3 Configurar Build
1. Vá na aba **"Build"**
2. Type: **Dockerfile**
3. Dockerfile Path: `Dockerfile`

### 3.4 Configurar Environment Variables
1. Vá na aba **"Environment"**
2. Adicione:

```
BACKEND_URL=http://api:3001
```

> ⚠️ **Nota**: `api` é o nome do serviço do backend. O Easypanel resolve automaticamente.

### 3.5 Configurar Domain
1. Vá na aba **"Domains"**
2. Clique em **"Add Domain"**
3. Digite: `leitordedoc.agregarnegocios.com.br`
4. Selecione **HTTPS** (Let's Encrypt automático)
5. Clique em **Save**

### 3.6 Configurar Network
1. Vá na aba **"Network"**
2. Port: `80`
3. Este será exposto publicamente via o domínio

### 3.7 Deploy
1. Clique em **"Deploy"**
2. Aguarde o build completar

---

## Passo 4: Verificar

### 4.1 Testar Backend (interno)
No terminal do Easypanel do container `api`:
```bash
curl http://localhost:3001/health
```
Deve retornar: `{"status":"ok","timestamp":"..."}`

### 4.2 Testar Frontend
1. Acesse: https://leitordedoc.agregarnegocios.com.br
2. A interface deve carregar
3. Teste fazer upload de um arquivo e analisar

---

## 🔧 Troubleshooting

### Erro de CORS
Se aparecer erro de CORS no console:
1. Verifique se `CORS_ORIGIN` no backend está correto
2. Reinicie o container do backend

### Frontend não conecta ao Backend
1. Verifique se o backend está rodando: Status = "Running"
2. Confirme que `BACKEND_URL` está como `http://api:3001`
3. Verifique os logs do nginx no container frontend

### Build falha no Backend
1. Verifique se as dependências nativas (canvas) estão instalando
2. Confira os logs de build

### Certificado SSL não funciona
1. Aguarde alguns minutos (Let's Encrypt pode demorar)
2. Verifique se o domínio está apontando corretamente para a VPS

---

## 📊 Arquitetura Final

```
┌─────────────────────────────────────────────────────────────┐
│  Easypanel (VPS Hostinger - KVM2)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │   frontend          │      │   api               │      │
│  │   (Nginx + React)   │─────▶│   (Node.js)         │      │
│  │   Port: 80          │      │   Port: 3001        │      │
│  └─────────────────────┘      └─────────────────────┘      │
│           │                           │                     │
│           │                           │                     │
│  leitordedoc.agregar...        (interno)                   │
│  (HTTPS público)                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Para Atualizar

Quando fizer mudanças no código:
1. `git push origin master`
2. No Easypanel, clique em **"Redeploy"** em cada serviço
3. Ou configure **Auto-deploy** para rebuild automático

---

## ✅ Checklist Final

- [ ] Backend rodando (verificar /health)
- [ ] Frontend acessível pelo domínio
- [ ] HTTPS funcionando
- [ ] Upload de arquivos funcionando
- [ ] Análise de imagens funcionando
- [ ] Download de ZIP funcionando
