# Configuração do Supabase Self-Hosted

## ✅ O que foi configurado

1. **Tabela de perfis criada** (`public.profiles`)
   - Vinculada à tabela `auth.users`
   - RLS (Row Level Security) habilitado
   - Políticas de segurança configuradas
   - Triggers para criação automática de perfil

2. **Sistema de autenticação**
   - Login ✅
   - Cadastro ✅
   - Recuperação de senha ✅

3. **Variáveis de ambiente**
   - `supabaseClient.js` atualizado para usar variáveis de ambiente
   - Arquivo `env-exemplo.txt` atualizado

## 🔧 Configuração na VPS

### 1. Localizar as credenciais do Supabase

Execute na VPS:

```bash
cd /root/supabase-project

# Ver URL e chaves do Supabase
grep -E "POSTGRES_PASSWORD|JWT_SECRET|ANON_KEY|SERVICE_KEY" .env docker-compose.yml 2>/dev/null

# Ou ver variáveis de ambiente dos containers
docker exec supabase-kong env | grep -E "KONG|ANON|SERVICE"
```

### 2. Criar arquivo .env no frontend

No seu projeto local, crie `frontend/.env`:

```env
# URL do Supabase self-hosted (use HTTP, não HTTPS)
VITE_SUPABASE_URL=http://31.97.164.208:8000

# Chave anônima (anon key) - substitua pela chave real
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 3. Obter a chave anônima

A chave anônima está no seu `mcp.json` ou pode ser obtida na VPS:

```bash
# Ver anon key do Supabase
docker exec supabase-kong env | grep ANON_KEY
```

## 📋 Estrutura das tabelas

### Tabela `auth.users` (automática do Supabase)
- Gerenciada automaticamente pelo Supabase Auth
- Contém: id, email, encrypted_password, etc.

### Tabela `public.profiles`
- `id` (UUID) - Referência a auth.users
- `email` (TEXT)
- `full_name` (TEXT)
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🔒 Segurança (RLS)

As políticas RLS garantem que:
- Usuários só veem seu próprio perfil
- Usuários só atualizam seu próprio perfil
- Perfis são criados automaticamente ao registrar

## 🚀 Próximos passos

1. Configure o `.env` no frontend com as credenciais corretas
2. Reinicie o servidor de desenvolvimento
3. Teste o fluxo de autenticação completo

## ⚠️ Importante

- **Nunca commite** o arquivo `.env` no repositório
- Use `env-exemplo.txt` como referência
- Mantenha as credenciais seguras
