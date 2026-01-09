# 🔄 Como Funciona o Reset de Créditos Mensal

## 📅 Sistema de Reset Automático

O sistema de créditos funciona com **reset automático baseado em mês/ano**. Não é necessário resetar manualmente - o sistema detecta automaticamente quando o mês muda.

---

## 🔍 Como Funciona

### 1. **Detecção Automática de Mudança de Mês**

A função `get_user_credits()` **detecta automaticamente** o mês atual:

```sql
-- Dentro da função get_user_credits()
v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');  -- Ex: "2026-01"
```

**O que acontece:**
- Quando um usuário busca seus créditos, a função verifica o mês atual
- Se não existe registro para o mês atual, **cria automaticamente** um novo registro com:
  - `credits_used = 0`
  - `credits_limit = 2500`
  - `month_year = "2026-01"` (mês atual)

### 2. **Criação Automática de Registro**

```sql
-- Se não existir registro para o mês atual, cria automaticamente
IF v_credits_used IS NULL THEN
    INSERT INTO public.user_credits (user_id, credits_used, credits_limit, month_year, last_reset_at)
    VALUES (p_user_id, 0, v_credits_limit, v_month_year, NOW())
    ON CONFLICT (user_id, month_year) DO NOTHING;
END IF;
```

**Exemplo prático:**
- Usuário usou 500 créditos em Janeiro (2026-01)
- Em Fevereiro (2026-02), quando busca créditos:
  - Sistema detecta que `month_year` mudou de "2026-01" para "2026-02"
  - Cria automaticamente novo registro para "2026-02" com 2500 créditos
  - O registro de Janeiro permanece no banco (histórico)

---

## 🎯 Fluxo Completo

### Cenário: Usuário em Janeiro → Fevereiro

**Janeiro (2026-01):**
```
user_credits:
- user_id: abc-123
- credits_used: 500
- credits_limit: 2500
- month_year: "2026-01"
```

**1º de Fevereiro (2026-02) - Primeira vez que busca créditos:**
1. Sistema chama `get_user_credits(userId)`
2. Função detecta: `CURRENT_DATE = "2026-02-01"`
3. Busca registro com `month_year = "2026-02"` → **NÃO ENCONTRA**
4. **Cria automaticamente** novo registro:
   ```
   user_credits:
   - user_id: abc-123
   - credits_used: 0        ← RESETADO!
   - credits_limit: 2500
   - month_year: "2026-02"  ← NOVO MÊS!
   ```
5. Retorna: `credits_remaining = 2500` ✅

**Resultado:** Usuário tem 2500 créditos novamente, sem ação manual!

---

## 🔄 Script de Reset Mensal (Opcional)

### Função: `reset_monthly_credits()`

Esta função **não reseta créditos existentes**, mas **cria registros para usuários que ainda não têm**:

```sql
-- Cria registros para o mês atual para TODOS os usuários que não têm
INSERT INTO public.user_credits (user_id, credits_used, credits_limit, month_year, last_reset_at)
SELECT 
    u.id,
    0,
    2500,
    v_current_month,  -- "2026-02"
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_credits uc
    WHERE uc.user_id = u.id AND uc.month_year = v_current_month
)
ON CONFLICT (user_id, month_year) DO NOTHING;
```

**Quando usar:**
- **Não é necessário** para reset automático (já funciona automaticamente)
- Útil para **pré-criar** registros para todos os usuários no início do mês
- Pode ser executado via **cron job** no dia 1 de cada mês

### Script: `backend/scripts/reset-monthly-credits.js`

```javascript
// Executa: node scripts/reset-monthly-credits.js
const count = await creditsService.resetMonthlyCredits();
console.log(`✅ ${count} registros processados.`);
```

**Configurar Cron Job (Opcional):**
```bash
# Executar no dia 1 de cada mês às 00:00
0 0 1 * * cd /caminho/do/projeto/backend && node scripts/reset-monthly-credits.js
```

---

## 📊 Estrutura de Dados

### Tabela: `user_credits`

Cada usuário pode ter **múltiplos registros** (um por mês):

```
user_id: abc-123
├── month_year: "2026-01" → credits_used: 500, credits_limit: 2500
├── month_year: "2026-02" → credits_used: 0, credits_limit: 2500  ← Mês atual
└── month_year: "2026-03" → (será criado automaticamente quando necessário)
```

**Vantagens:**
- ✅ Histórico de uso por mês
- ✅ Reset automático sem perder histórico
- ✅ Múltiplos meses armazenados

---

## 🔍 Detalhes Técnicos

### 1. **Detecção de Mês**

```sql
-- Sempre usa a data atual do servidor
v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
-- Exemplo: "2026-01", "2026-02", etc.
```

### 2. **Criação Automática**

A função `get_user_credits()` cria automaticamente quando:
- Usuário busca créditos pela primeira vez no mês
- Não existe registro para o mês atual
- **Não precisa de script externo**

### 3. **Constraint UNIQUE**

```sql
UNIQUE(user_id, month_year)
```

Garante que cada usuário tem apenas **um registro por mês**.

---

## ✅ Resumo

### Reset Automático (Recomendado)
- ✅ **Funciona automaticamente** quando usuário busca créditos
- ✅ **Não precisa de cron job** (mas pode ter para otimização)
- ✅ **Detecta mudança de mês** automaticamente
- ✅ **Cria registro** para o mês atual se não existir

### Reset Manual (Opcional)
- Script `reset-monthly-credits.js` pode ser executado manualmente
- Útil para pré-criar registros para todos os usuários
- Pode ser agendado via cron job no dia 1 de cada mês

---

## 🎯 Exemplo Prático

**Cenário:** Usuário usou todos os 2500 créditos em Janeiro

**Janeiro 31:**
```json
{
  "credits_used": 2500,
  "credits_limit": 2500,
  "credits_remaining": 0,
  "month_year": "2026-01"
}
```

**Fevereiro 1 (primeira vez que busca créditos):**
```json
{
  "credits_used": 0,        ← RESETADO AUTOMATICAMENTE!
  "credits_limit": 2500,
  "credits_remaining": 2500, ← NOVOS CRÉDITOS!
  "month_year": "2026-02"   ← NOVO MÊS!
}
```

**Sem ação manual necessária!** 🎉

---

## 📝 Notas Importantes

1. **Reset é Automático:** Não precisa fazer nada - acontece automaticamente
2. **Histórico Preservado:** Registros antigos permanecem no banco
3. **Múltiplos Meses:** Cada mês tem seu próprio registro
4. **Cron Job Opcional:** Pode ser usado para otimização, mas não é necessário

---

## 🔧 Configurar Cron Job (Opcional)

Se quiser pré-criar registros para todos os usuários no dia 1:

```bash
# Editar crontab
crontab -e

# Adicionar linha (executa no dia 1 de cada mês às 00:00)
0 0 1 * * cd /caminho/do/projeto/backend && node scripts/reset-monthly-credits.js >> /var/log/reset-credits.log 2>&1
```

**Mas lembre-se:** O reset já funciona automaticamente sem cron job! 🎯
