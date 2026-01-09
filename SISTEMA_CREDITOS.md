# Sistema de Créditos - Documentação

## ✅ Implementação Completa

Sistema de créditos por usuário implementado no Supabase com segurança total no backend/banco de dados.

## 📋 Estrutura Criada

### 1. Tabela `user_credits` (Supabase)
- `id` (UUID) - Primary key
- `user_id` (UUID) - Referência a `auth.users`
- `credits_used` (INTEGER) - Créditos usados no mês
- `credits_limit` (INTEGER) - Limite mensal (2500)
- `month_year` (VARCHAR) - Mês/ano no formato 'YYYY-MM'
- `last_reset_at` (TIMESTAMP) - Último reset
- `created_at` / `updated_at` (TIMESTAMP)

**RLS Habilitado:**
- Usuários só veem seus próprios créditos
- Apenas funções do sistema podem modificar

### 2. Funções PostgreSQL (Seguras)

#### `get_user_credits(user_id)`
- Obtém ou cria registro de créditos do mês atual
- Retorna: `credits_used`, `credits_limit`, `credits_remaining`, `month_year`

#### `debit_user_credit(user_id, amount)`
- Verifica créditos disponíveis
- Debita de forma atômica (transação)
- Retorna JSON com sucesso/erro e saldo atualizado

#### `reset_monthly_credits()`
- Cria registros para o mês atual para todos os usuários
- Deve ser chamada no primeiro dia de cada mês

### 3. Serviços Backend

#### `creditsService.js`
- `getUserCredits(userId)` - Obtém créditos do usuário
- `debitCredit(userId, amount)` - Debita créditos (seguro)
- `hasEnoughCredits(userId, amount)` - Verifica disponibilidade
- `resetMonthlyCredits()` - Reseta créditos mensalmente

#### `auth.js` (Middleware)
- `authenticate` - Valida token JWT do Supabase
- Extrai `user_id` do token
- Bloqueia requisições não autenticadas

### 4. Integração no Controller

#### `analysisController.js`
- Verifica créditos antes de processar
- Debita crédito após análise bem-sucedida
- Retorna erro 403 se sem créditos

## 🔒 Segurança

✅ **Tudo no backend/DB:**
- Verificação de créditos no PostgreSQL
- Débito atômico (transação)
- RLS habilitado
- Funções com `SECURITY DEFINER`

✅ **Autenticação obrigatória:**
- Token JWT do Supabase necessário
- Middleware valida token antes de processar
- `user_id` extraído do token (não confiável do frontend)

✅ **Sem manipulação no frontend:**
- Frontend apenas consulta créditos via API
- Débito acontece automaticamente no backend
- Impossível burlar via frontend

## 🚀 Como Usar

### 1. Configurar Variáveis de Ambiente

No `.env` do backend:

```env
SUPABASE_URL=http://31.97.164.208:8000
SUPABASE_SERVICE_KEY=sua_service_key_aqui
SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 2. Frontend - Obter Créditos

```javascript
// Obter token do Supabase
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Consultar créditos
const response = await fetch('http://localhost:3001/api/credits', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
const { data } = await response.json();
// data: { credits_used, credits_limit, credits_remaining, month_year }
```

### 3. Frontend - Analisar Documento

```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('analysisType', 'financial-receipt');

const response = await fetch('http://localhost:3001/api/analyze', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}` // Token JWT obrigatório
    },
    body: formData
});
```

### 4. Reset Mensal (Cron Job)

Execute no primeiro dia de cada mês:

```bash
# Na VPS ou servidor
node backend/scripts/reset-monthly-credits.js
```

Ou configure um cron job:

```bash
# Editar crontab
crontab -e

# Adicionar (executa todo dia 1 às 00:00)
0 0 1 * * cd /caminho/do/projeto && node backend/scripts/reset-monthly-credits.js
```

## 📊 Fluxo Completo

1. **Usuário faz login** → Obtém token JWT do Supabase
2. **Frontend consulta créditos** → `GET /api/credits` com token
3. **Usuário analisa documento** → `POST /api/analyze` com token
4. **Backend verifica créditos** → Chama `debit_user_credit()` no DB
5. **Se tiver créditos** → Processa análise e debita 1 crédito
6. **Se não tiver** → Retorna erro 403

## 🔄 Reset Mensal Automático

A função `reset_monthly_credits()` cria automaticamente registros para o mês atual quando:
- Usuário tenta usar créditos pela primeira vez no mês
- Script de reset é executado

**Não precisa resetar manualmente** - o sistema cria registros sob demanda.

## 🧪 Testar

1. **Obter token:**
   ```bash
   # No frontend, após login
   const { data: { session } } = await supabase.auth.getSession();
   console.log(session.access_token);
   ```

2. **Consultar créditos:**
   ```bash
   curl -H "Authorization: Bearer SEU_TOKEN" \
        http://localhost:3001/api/credits
   ```

3. **Analisar documento:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer SEU_TOKEN" \
        -F "image=@documento.jpg" \
        -F "analysisType=financial-receipt" \
        http://localhost:3001/api/analyze
   ```

## ⚠️ Importante

- **Service Key:** Mantenha segura, nunca exponha no frontend
- **Autenticação:** Todas as rotas de análise requerem token JWT
- **Reset Mensal:** Configure cron job para executar automaticamente
- **Fallback:** Se créditos falharem, usa quota global como backup

## 📝 Próximos Passos

1. Configure as variáveis de ambiente no backend
2. Teste o fluxo completo
3. Configure cron job para reset mensal
4. Atualize frontend para mostrar créditos do usuário
