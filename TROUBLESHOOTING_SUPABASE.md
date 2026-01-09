# Troubleshooting - Erro 500 no Signup

## 🔍 Diagnóstico do Erro 500

O erro 500 (Internal Server Error) no signup geralmente ocorre por:

1. **Configuração de Email (SMTP) não configurada** ⚠️ MAIS COMUM
2. Problema com a função `handle_new_user`
3. Problema com políticas RLS
4. Configuração incorreta do JWT

## 📋 Verificar Logs na VPS

Execute na VPS para ver o erro específico:

```bash
# Ver logs do GoTrue (Supabase Auth)
docker logs supabase-auth --tail 50

# Ver logs do Kong (API Gateway)
docker logs supabase-kong --tail 50

# Ver logs do PostgreSQL
docker logs supabase-db --tail 50
```

## 🔧 Solução 1: Desabilitar Confirmação de Email (Desenvolvimento)

Para desenvolvimento, você pode desabilitar a confirmação de email:

### Na VPS, edite o docker-compose.yml:

```bash
cd /root/supabase-project
nano docker-compose.yml
```

Procure pela seção `supabase-auth` e adicione/modifique:

```yaml
supabase-auth:
  # ... outras configurações ...
  environment:
    # ... outras variáveis ...
    GOTRUE_MAILER_AUTOCONFIRM: 'true'  # Adicione esta linha
    GOTRUE_SITE_URL: 'http://31.97.164.208:8000'  # Verifique se está correto
```

Depois reinicie:

```bash
docker compose restart supabase-auth
```

## 🔧 Solução 2: Configurar SMTP (Produção)

Para produção, configure SMTP no GoTrue:

### No docker-compose.yml, adicione:

```yaml
supabase-auth:
  environment:
    # Configurações de Email
    GOTRUE_SMTP_ADMIN_EMAIL: 'noreply@seudominio.com'
    GOTRUE_SMTP_HOST: 'smtp.gmail.com'  # ou seu servidor SMTP
    GOTRUE_SMTP_PORT: '587'
    GOTRUE_SMTP_USER: 'seu-email@gmail.com'
    GOTRUE_SMTP_PASS: 'sua-senha-app'
    GOTRUE_SMTP_SENDER_NAME: 'Leitor de Docs'
    GOTRUE_MAILER_URLPATHS_INVITE: 'http://31.97.164.208:8000/auth/v1/verify'
    GOTRUE_MAILER_URLPATHS_CONFIRMATION: 'http://31.97.164.208:8000/auth/v1/verify'
    GOTRUE_MAILER_URLPATHS_RECOVERY: 'http://31.97.164.208:8000/auth/v1/verify'
    GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: 'http://31.97.164.208:8000/auth/v1/verify'
```

## 🔧 Solução 3: Verificar Função handle_new_user

Se o problema for na função, teste:

```sql
-- Verificar se a função existe e está correta
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Testar a função manualmente (substitua o UUID)
SELECT public.handle_new_user();
```

## 🔧 Solução 4: Verificar Políticas RLS

```sql
-- Verificar políticas da tabela profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Se necessário, recriar políticas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recriar políticas
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

## 🚀 Teste Rápido

Após aplicar a Solução 1 (desabilitar confirmação de email), teste novamente o cadastro.

## 📝 Notas

- Para desenvolvimento: use `GOTRUE_MAILER_AUTOCONFIRM: 'true'`
- Para produção: configure SMTP adequadamente
- Sempre verifique os logs para identificar o erro específico
