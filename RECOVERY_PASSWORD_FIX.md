# Correções na Recuperação de Senha

## ✅ Problemas Corrigidos

### 1. URLs configuradas como localhost
**Problema:** `SITE_URL` e `API_EXTERNAL_URL` estavam como `localhost:8000`, fazendo os links apontarem para localhost.

**Solução:** Atualizado para `http://31.97.164.208:8000` no `.env` da VPS.

### 2. RecoveryPage não processava query params
**Problema:** O componente só verificava `window.location.hash`, mas o link vem como query string.

**Solução:** Atualizado para verificar tanto hash quanto query params.

## 📋 Configurações Atualizadas

### No .env da VPS:
```env
SITE_URL=http://31.97.164.208:8000
API_EXTERNAL_URL=http://31.97.164.208:8000
```

### No RecoveryPage.jsx:
- Agora verifica `window.location.search` (query params)
- Processa token de recuperação corretamente
- Detecta modo de reset tanto por hash quanto por query params

## 🧪 Como Testar

1. **Solicitar recuperação de senha:**
   - Acesse `/recovery`
   - Digite seu email
   - Clique em "Enviar Link de Recuperação"

2. **Verificar email:**
   - O link agora deve apontar para `http://31.97.164.208:8000/auth/v1/verify?...`
   - Clique no link

3. **Redefinir senha:**
   - Você será redirecionado para `/recovery` com o token
   - Digite a nova senha
   - Clique em "Definir Nova Senha"

## ⚠️ Sobre Emails Indo para Spam

Isso é comum com Gmail quando:
- O servidor SMTP não tem SPF/DKIM configurado
- O domínio não está verificado
- É a primeira vez enviando emails

**Soluções:**
1. **Verificar domínio no Gmail** (recomendado para produção)
2. **Configurar SPF/DKIM** no DNS do domínio
3. **Usar serviço de email profissional** (SendGrid, Mailgun, etc.)

Para desenvolvimento, verificar a pasta de spam é aceitável.

## 🔄 Próximos Passos

Os próximos emails de recuperação já terão o link correto apontando para `31.97.164.208:8000` ao invés de `localhost:8000`.
