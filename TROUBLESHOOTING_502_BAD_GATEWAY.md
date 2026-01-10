# 🔧 Troubleshooting: 502 Bad Gateway na API

## Problema

Erro 502 Bad Gateway nas rotas `/api/*`, indicando que o nginx não consegue conectar ao backend.

```
GET https://leitordedocs-frontend.soknmi.easypanel.host/api/credits 502 (Bad Gateway)
GET https://leitordedocs-frontend.soknmi.easypanel.host/api/stats 502 (Bad Gateway)
```

---

## ✅ Checklist de Verificação

### 1. Verificar se o Backend está Rodando

No Easypanel:
1. Acesse o projeto `leitor-docs`
2. Verifique se o serviço backend (ex: `api`) está com status **"Running"**
3. Verifique os logs do backend para erros

**Comando para verificar:**
```bash
# No terminal do Easypanel do container backend
curl http://localhost:3001/health
# Deve retornar: {"status":"ok","timestamp":"..."}
```

### 2. Verificar Nome do Serviço Backend

O nginx está configurado para usar `api:3001`. Se o nome do serviço no Easypanel for diferente, você precisa:

**Opção A:** Renomear o serviço no Easypanel para `api`

**Opção B:** Atualizar o `nginx.conf` manualmente:

```nginx
# Em vez de:
set $backend_service api;

# Use o nome do seu serviço, por exemplo:
set $backend_service leitor-docs-api;
# ou
set $backend_service api-backend;
```

### 3. Verificar Configuração de Rede

No Easypanel, o serviço backend deve ter:
- **Porta:** `3001`
- **Tipo:** **Internal** (não público)
- **Network:** Mesmo projeto que o frontend

### 4. Verificar DNS do Docker

O nginx usa o resolver do Docker: `127.0.0.11`. Isso deve funcionar automaticamente no Easypanel.

Para testar dentro do container frontend:
```bash
# No terminal do container frontend
nslookup api
# Deve retornar o IP interno do container backend
```

### 5. Verificar Logs do Nginx

No Easypanel, acesse os logs do serviço frontend e procure por erros como:
- `upstream timed out`
- `no resolver defined`
- `upstream server temporarily disabled`

---

## 🔧 Soluções Possíveis

### Solução 1: Verificar Nome do Serviço no Easypanel

1. No Easypanel, vá no serviço backend
2. Veja o nome exato do serviço (geralmente aparece no topo)
3. Se for diferente de `api`, atualize o `nginx.conf`:

```nginx
set $backend_service NOME_DO_SEU_SERVIÇO;
```

### Solução 2: Usar IP Interno Diretamente

Se o DNS não funcionar, você pode usar o IP interno:

1. Descubra o IP do container backend:
```bash
# No container backend
hostname -I
```

2. Atualize o `nginx.conf`:
```nginx
set $upstream http://172.x.x.x:3001;  # Use o IP do backend
```

**⚠️ Nota:** Isso é menos flexível, pois o IP pode mudar ao reiniciar.

### Solução 3: Verificar Se Backend Aceita Conexões Internas

Certifique-se de que o backend está configurado para aceitar conexões em `0.0.0.0:3001` e não apenas `127.0.0.1:3001`.

No `backend/server.js` ou similar:
```javascript
app.listen(3001, '0.0.0.0', () => {
  console.log('Server running on port 3001')
})
```

### Solução 4: Testar Conexão Manualmente

Dentro do container frontend:

```bash
# Testar conectividade
curl -v http://api:3001/health

# Ou se souber o IP:
curl -v http://172.x.x.x:3001/health
```

Se isso funcionar, o problema é na configuração do nginx. Se não funcionar, o problema é de rede/DNS.

---

## 📝 Configuração Recomendada no Easypanel

### Backend (serviço `api`):

**Network:**
- Port: `3001`
- Type: **Internal**

**Environment Variables:**
```
NODE_ENV=production
PORT=3001
SUPABASE_URL=http://31.97.164.208:8000
# ... outras variáveis
```

### Frontend:

**Network:**
- Port: `80`
- Type: **External** (com domínio HTTPS)

**Environment Variables:**
```
VITE_SUPABASE_URL=http://31.97.164.208:8000
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

---

## 🔍 Debug Avançado

### Verificar Configuração Atual do Nginx

Dentro do container frontend:
```bash
cat /etc/nginx/conf.d/default.conf | grep -A 5 "location /api"
```

### Testar Nginx Config

```bash
nginx -t
```

### Verificar Conexões de Rede

```bash
# Ver se consegue resolver o nome
getent hosts api

# Ver se consegue conectar
nc -zv api 3001
```

---

## ✅ Verificação Final

Após aplicar as correções:

1. ✅ Backend está rodando (status "Running")
2. ✅ Nome do serviço está correto no `nginx.conf`
3. ✅ Backend aceita conexões em `0.0.0.0:3001`
4. ✅ Ambos serviços estão no mesmo projeto Easypanel
5. ✅ Porta do backend está marcada como "Internal"
6. ✅ Teste manual funciona: `curl http://api:3001/health`

Se tudo estiver correto, faça rebuild do frontend no Easypanel para aplicar as mudanças no `nginx.conf`.

---

## 📞 Próximos Passos

Se o problema persistir:
1. Compartilhe os logs do nginx (frontend)
2. Compartilhe os logs do backend
3. Informe o nome exato do serviço backend no Easypanel
4. Verifique se ambos serviços estão no mesmo projeto Easypanel
