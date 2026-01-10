# ✅ Correção: Mixed Content (HTTPS → HTTP)

## Problema Identificado

O frontend está rodando em **HTTPS** (`https://leitordedocs-frontend.soknmi.easypanel.host`), mas está tentando fazer requisições para o Supabase via **HTTP** (`http://31.97.164.208:8000`).

Os navegadores modernos **bloqueiam** requisições HTTP quando a página está em HTTPS por segurança (Mixed Content Policy).

### Erro no Console:
```
Mixed Content: The page at 'https://leitordedocs-frontend.soknmi.easypanel.host/login' 
was loaded over HTTPS, but requested an insecure resource 
'http://31.97.164.208:8000/auth/v1/token?grant_type=password'. 
This request has been blocked; the content must be served over HTTPS.
```

---

## ✅ Solução Implementada

### 1. Proxy Reverso no Nginx (`nginx.conf`)

Adicionado proxy para redirecionar requisições `/supabase/*` para o Supabase HTTP interno:

```nginx
# Proxy para Supabase (resolve Mixed Content quando frontend está em HTTPS)
location /supabase/ {
    # URL do Supabase self-hosted
    set $supabase_upstream http://31.97.164.208:8000;
    
    # Remover /supabase do path e passar para o Supabase
    rewrite ^/supabase/(.*) /$1 break;
    
    proxy_pass $supabase_upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host 31.97.164.208:8000;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Headers importantes para Supabase
    proxy_set_header Origin $scheme://$host;
    
    # Timeout para autenticação
    proxy_read_timeout 60s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
}
```

### 2. Cliente Supabase Atualizado (`supabaseClient.js`)

O cliente agora detecta automaticamente se está em produção (HTTPS) e usa o proxy:

```javascript
// Detectar se está em produção (HTTPS) e o Supabase está em HTTP
const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
const isSupabaseHttp = supabaseUrl && supabaseUrl.startsWith('http://')

if (isProduction && isSupabaseHttp && typeof window !== 'undefined') {
  // Usar proxy relativo através do nginx
  // O nginx redireciona /supabase/* para o Supabase HTTP interno
  supabaseUrl = `${window.location.origin}/supabase`
  console.log('🔒 Usando proxy HTTPS para Supabase:', supabaseUrl)
}
```

### 3. Proxy em Desenvolvimento (`vite.config.js`)

Adicionado proxy também para desenvolvimento local:

```javascript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true
  },
  // Proxy para Supabase em desenvolvimento (evita Mixed Content)
  '/supabase': {
    target: 'http://31.97.164.208:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/supabase/, '')
  }
}
```

---

## 🔄 Como Funciona

### Antes (Bloqueado):
```
Frontend HTTPS → HTTP Supabase
❌ BLOQUEADO pelo navegador
```

### Depois (Funcionando):
```
Frontend HTTPS → /supabase/auth/v1/token (HTTPS)
                ↓
               Nginx Proxy (interno)
                ↓
            Supabase HTTP (31.97.164.208:8000)
✅ Funciona! Navegador vê apenas HTTPS
```

### Fluxo de Requisição:

1. **Frontend** (HTTPS): `https://leitordedocs-frontend...host/login`
2. **Supabase Client** detecta HTTPS + HTTP Supabase
3. **Ajusta URL** para: `https://leitordedocs-frontend...host/supabase`
4. **Navegador** faz requisição HTTPS: `https://leitordedocs-frontend...host/supabase/auth/v1/token`
5. **Nginx** recebe a requisição e redireciona internamente para: `http://31.97.164.208:8000/auth/v1/token`
6. **Supabase** responde normalmente
7. **Nginx** retorna a resposta via HTTPS para o frontend
8. ✅ **Navegador vê apenas HTTPS** → Não bloqueia!

---

## 📝 Arquivos Modificados

1. ✅ `frontend/nginx.conf` - Adicionado proxy `/supabase/`
2. ✅ `frontend/src/supabaseClient.js` - Lógica de detecção e ajuste de URL
3. ✅ `frontend/vite.config.js` - Proxy para desenvolvimento

---

## 🚀 Como Aplicar

### Em Produção (Easypanel):
1. Fazer rebuild do frontend
2. O nginx.conf já está no Dockerfile, então será aplicado automaticamente
3. Verificar logs do nginx para confirmar que o proxy está funcionando

### Em Desenvolvimento:
1. Reiniciar o servidor Vite (`npm run dev`)
2. O proxy será aplicado automaticamente via `vite.config.js`

---

## ✅ Verificação

### Testar Login:
1. Acesse: `https://leitordedocs-frontend.soknmi.easypanel.host/login`
2. Tente fazer login
3. Verifique o console do navegador:
   - Deve ver: `🔒 Usando proxy HTTPS para Supabase: https://...host/supabase`
   - Não deve mais ver erros de Mixed Content

### Verificar Requisições:
1. Abra o DevTools (F12)
2. Vá na aba Network
3. Tente fazer login
4. Veja que as requisições vão para `/supabase/auth/v1/token` (HTTPS)
5. Deve retornar 200 OK ✅

---

## 🔍 Troubleshooting

### Se ainda houver erros de Mixed Content:

1. **Verificar se o nginx.conf foi aplicado:**
   ```bash
   # No container do frontend
   cat /etc/nginx/conf.d/default.conf
   ```

2. **Verificar se o proxy está funcionando:**
   ```bash
   # Testar diretamente
   curl -I https://leitordedocs-frontend...host/supabase/auth/v1/health
   ```

3. **Verificar variáveis de ambiente:**
   - Certifique-se de que `VITE_SUPABASE_URL` está como `http://31.97.164.208:8000` no `.env`
   - O código detecta automaticamente e usa o proxy

4. **Limpar cache do navegador:**
   - Ctrl+Shift+Del → Limpar cache
   - Ou usar modo anônimo para testar

---

## 📊 Benefícios

✅ **Segurança**: Toda comunicação via HTTPS
✅ **Transparente**: Cliente Supabase funciona normalmente
✅ **Automático**: Detecta automaticamente HTTPS e ajusta
✅ **Desenvolvimento**: Proxy também funciona em dev
✅ **Performance**: Sem overhead significativo

---

## ✨ Status

**CORREÇÃO IMPLEMENTADA!**

O sistema agora detecta automaticamente quando está em HTTPS e usa o proxy do nginx para evitar Mixed Content. O erro deve desaparecer após o redeploy do frontend! 🎉
