# 📊 Onde os Créditos Usados são Contabilizados

## 🎯 Resumo

Os créditos usados são contabilizados na **tabela `user_credits` do banco de dados PostgreSQL**, especificamente na coluna `credits_used`. O incremento acontece através de uma função PostgreSQL segura que garante atomicidade.

---

## 📍 Localização no Banco de Dados

### Tabela: `public.user_credits`

```sql
CREATE TABLE public.user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    credits_used INTEGER NOT NULL DEFAULT 0,        -- ⭐ AQUI são contabilizados
    credits_limit INTEGER NOT NULL DEFAULT 2500,
    month_year VARCHAR(7) NOT NULL,                 -- Formato: 'YYYY-MM'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reset_at TIMESTAMPTZ,
    UNIQUE(user_id, month_year)
);
```

**Coluna principal:** `credits_used` - Armazena quantos créditos o usuário já utilizou no mês atual.

---

## 🔄 Fluxo Completo de Contabilização

### 1. **Frontend** → Usuário clica em "Analisar"
   - `frontend/src/pages/HomePage.jsx` linha ~255
   - Faz requisição POST para `/api/analyze` com token JWT

### 2. **Backend Controller** → Recebe requisição
   - `backend/src/controllers/analysisController.js` linha 12
   - Verifica autenticação (linha 15-22)
   - Verifica se tem créditos suficientes (linha 26)
   - Processa análise do documento (linha 58-71)

### 3. **Débito de Crédito** → Após análise bem-sucedida
   - `backend/src/controllers/analysisController.js` linha 73-76
   ```javascript
   const debitResult = await creditsService.debitCredit(userId, 1);
   ```

### 4. **Serviço de Créditos** → Chama função PostgreSQL
   - `backend/src/services/creditsService.js` linha 62-88
   ```javascript
   async debitCredit(userId, amount = 1) {
       const { data, error } = await this.supabase.rpc('debit_user_credit', {
           p_user_id: userId,
           p_amount: amount
       });
   }
   ```

### 5. **Função PostgreSQL** → Atualiza banco de dados
   - Função: `public.debit_user_credit(p_user_id UUID, p_amount INTEGER)`
   - **Localização:** Banco de dados PostgreSQL (Supabase)
   - **Ação:** Faz UPDATE na tabela `user_credits`:
   ```sql
   UPDATE public.user_credits uc
   SET 
       credits_used = uc.credits_used + p_amount,  -- ⭐ INCREMENTA AQUI
       updated_at = TIMEZONE('utc'::text, NOW())
   WHERE uc.user_id = p_user_id 
     AND uc.month_year = v_month_year
   RETURNING uc.credits_used INTO v_credits_used;
   ```

---

## 📊 Estrutura de Dados

### Exemplo de Registro na Tabela:

```json
{
  "id": "a5845dbe-312e-4208-8b33-f5945e3f6a62",
  "user_id": "53941d60-535e-47a4-83a0-b1b450e543fa",
  "credits_used": 5,              // ⭐ 5 créditos já foram usados
  "credits_limit": 2500,           // Limite mensal
  "month_year": "2026-01",        // Janeiro de 2026
  "created_at": "2026-01-09T17:04:19.161Z",
  "updated_at": "2026-01-09T17:15:52.363Z",
  "last_reset_at": "2026-01-09T17:15:52.363Z"
}
```

**Cálculo de créditos restantes:**
```javascript
credits_remaining = credits_limit - credits_used
// Exemplo: 2500 - 5 = 2495 créditos restantes
```

---

## 🔍 Como Verificar os Créditos Contabilizados

### 1. Via Supabase Studio (Interface Web)
   - Acesse: `http://31.97.164.208:8000` → Supabase Studio
   - Navegue: Table Editor → `user_credits`
   - Veja a coluna `credits_used` para cada usuário

### 2. Via SQL (PostgreSQL)
   ```sql
   -- Ver créditos de um usuário específico
   SELECT 
       user_id,
       credits_used,
       credits_limit,
       credits_limit - credits_used AS credits_remaining,
       month_year
   FROM public.user_credits
   WHERE user_id = '53941d60-535e-47a4-83a0-b1b450e543fa'::uuid;
   ```

### 3. Via API Backend
   ```bash
   GET /api/credits
   Authorization: Bearer <JWT_TOKEN>
   ```
   Retorna:
   ```json
   {
     "success": true,
     "data": {
       "credits_used": 5,
       "credits_limit": 2500,
       "credits_remaining": 2495,
       "month_year": "2026-01"
     }
   }
   ```

### 4. Via Frontend
   - A interface mostra automaticamente após cada análise
   - Card "USO MENSAL" exibe: `{credits_used} / {credits_limit}`

---

## ⚙️ Características Importantes

### ✅ Atomicidade
- O UPDATE é feito em uma única transação
- Garante que não há race conditions
- Se falhar, nada é atualizado

### ✅ Verificação Antes do Débito
- A função verifica se há créditos suficientes
- Retorna erro se `credits_remaining < amount`
- Evita débitos negativos

### ✅ Segurança
- Usa `SECURITY DEFINER` para bypass RLS
- Valida `user_id` antes de debitar
- Apenas o backend (com SERVICE_KEY) pode debitar

### ✅ Isolamento por Mês
- Cada mês tem seu próprio registro
- `month_year` identifica o período (ex: "2026-01")
- Reset automático a cada mês novo

---

## 🔄 Reset Mensal

Os créditos são resetados automaticamente quando:
1. Um novo mês começa
2. A função `get_user_credits` é chamada e detecta mês diferente
3. A função `reset_monthly_credits()` é executada (via cron job)

**Script de reset:** `backend/scripts/reset-monthly-credits.js`

---

## 📝 Resumo Visual

```
┌─────────────┐
│  Frontend   │ Usuário clica "Analisar"
└──────┬──────┘
       │ POST /api/analyze (com JWT)
       ▼
┌─────────────┐
│  Backend    │ analysisController.js
│ Controller  │ - Verifica créditos
└──────┬──────┘ - Processa análise
       │ - Chama debitCredit()
       ▼
┌─────────────┐
│  Service    │ creditsService.js
│  Layer      │ - Chama RPC PostgreSQL
└──────┬──────┘
       │ RPC: debit_user_credit()
       ▼
┌─────────────┐
│ PostgreSQL  │ Função debit_user_credit()
│  Function   │ - UPDATE user_credits
└──────┬──────┘ - SET credits_used = credits_used + 1
       │
       ▼
┌─────────────┐
│   Banco     │ Tabela: user_credits
│   Dados     │ Coluna: credits_used ⭐
└─────────────┘ (AQUI está contabilizado!)
```

---

## 🎯 Conclusão

**Os créditos usados são contabilizados na coluna `credits_used` da tabela `user_credits` no banco de dados PostgreSQL**, através de uma função segura que garante atomicidade e validação antes do débito.
