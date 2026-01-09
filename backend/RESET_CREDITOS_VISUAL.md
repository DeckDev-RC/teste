# 🔄 Reset de Créditos - Explicação Visual

## 🎯 Resumo Rápido

**O reset é AUTOMÁTICO!** Não precisa fazer nada. Quando o mês muda, o sistema detecta e cria automaticamente um novo registro com 2500 créditos.

---

## 📅 Fluxo Visual

### Janeiro (2026-01)
```
Usuário busca créditos → Sistema verifica mês atual
                        ↓
                   "2026-01"
                        ↓
            Busca registro com month_year = "2026-01"
                        ↓
            ✅ ENCONTRA: credits_used = 500, remaining = 2000
```

### Fevereiro 1 (2026-02) - PRIMEIRA VEZ
```
Usuário busca créditos → Sistema verifica mês atual
                        ↓
                   "2026-02" ← MÊS MUDOU!
                        ↓
            Busca registro com month_year = "2026-02"
                        ↓
            ❌ NÃO ENCONTRA (não existe ainda)
                        ↓
            🔄 CRIA AUTOMATICAMENTE novo registro:
               - month_year: "2026-02"
               - credits_used: 0
               - credits_limit: 2500
               - credits_remaining: 2500 ✅
                        ↓
            ✅ RETORNA: 2500 créditos disponíveis!
```

---

## 🔍 Como Funciona na Prática

### Função: `get_user_credits(userId)`

```sql
-- 1. Detecta mês atual
v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');  -- "2026-02"

-- 2. Busca registro do mês atual
SELECT credits_used, credits_limit
FROM user_credits
WHERE user_id = ? AND month_year = "2026-02"

-- 3. Se não encontrou, CRIA AUTOMATICAMENTE
IF v_credits_used IS NULL THEN
    INSERT INTO user_credits (user_id, credits_used, credits_limit, month_year)
    VALUES (user_id, 0, 2500, "2026-02")  -- ← RESET AUTOMÁTICO!
END IF;
```

---

## 📊 Exemplo Real

### Estado em Janeiro 31:
```json
{
  "user_id": "abc-123",
  "credits_used": 2500,      // Usou todos
  "credits_limit": 2500,
  "credits_remaining": 0,    // Sem créditos
  "month_year": "2026-01"
}
```

### Estado em Fevereiro 1 (após primeira busca):
```json
{
  "user_id": "abc-123",
  "credits_used": 0,         // ← RESETADO!
  "credits_limit": 2500,
  "credits_remaining": 2500,  // ← NOVOS CRÉDITOS!
  "month_year": "2026-02"    // ← NOVO MÊS!
}
```

**Banco de dados agora tem 2 registros:**
```
user_id: abc-123
├── month_year: "2026-01" → credits_used: 2500 (histórico)
└── month_year: "2026-02" → credits_used: 0 (mês atual) ✅
```

---

## ⚙️ Dois Tipos de Reset

### 1. **Reset Automático (Já Funciona)**
- ✅ **Quando:** Toda vez que usuário busca créditos
- ✅ **Como:** Função `get_user_credits()` cria registro se não existir
- ✅ **Vantagem:** Funciona automaticamente, sem configuração

### 2. **Reset Manual via Script (Opcional)**
- 📅 **Quando:** Pode ser agendado no dia 1 de cada mês
- 🔧 **Como:** Script `reset-monthly-credits.js`
- 💡 **Vantagem:** Pré-cria registros para todos os usuários de uma vez

---

## 🎯 Quando o Reset Acontece?

### ✅ Reset Automático
```
Usuário faz login → Frontend busca créditos → get_user_credits()
                                                    ↓
                                    Detecta mês atual: "2026-02"
                                                    ↓
                                    Busca registro → Não encontra
                                                    ↓
                                    CRIA automaticamente com 2500 créditos ✅
```

### ⏰ Reset via Cron (Opcional)
```
Dia 1, 00:00 → Cron executa script → reset_monthly_credits()
                                            ↓
                            Cria registros para TODOS os usuários
                            que ainda não têm registro do mês atual
```

---

## 📋 Checklist de Funcionamento

- [x] Sistema detecta mês atual automaticamente
- [x] Cria registro automaticamente quando mês muda
- [x] Não precisa de ação manual
- [x] Histórico de meses anteriores é preservado
- [x] Cada mês tem seu próprio registro

---

## 🔧 Configuração de Cron Job (Opcional)

Se quiser pré-criar registros no dia 1:

```bash
# No servidor (VPS)
crontab -e

# Adicionar (executa no dia 1 de cada mês às 00:00)
0 0 1 * * cd /root/supabase-project/backend && node scripts/reset-monthly-credits.js
```

**Mas não é necessário!** O reset já funciona automaticamente. 🎉

---

## ❓ Perguntas Frequentes

### Q: Preciso fazer algo quando o mês muda?
**R:** Não! O reset é automático. Quando o usuário busca créditos no novo mês, o sistema cria automaticamente um novo registro.

### Q: O que acontece com os créditos do mês anterior?
**R:** Permanecem no banco como histórico. Cada mês tem seu próprio registro.

### Q: E se o usuário não usar o sistema no dia 1?
**R:** Não tem problema! O registro será criado automaticamente na primeira vez que buscar créditos no novo mês.

### Q: O script de reset é obrigatório?
**R:** Não! É apenas uma otimização para pré-criar registros. O reset automático já funciona sem ele.

---

## 🎉 Conclusão

**O reset de créditos é 100% AUTOMÁTICO!**

- ✅ Detecta mudança de mês automaticamente
- ✅ Cria novo registro com 2500 créditos
- ✅ Não precisa de ação manual
- ✅ Funciona para todos os usuários

**Basta usar o sistema normalmente - o reset acontece sozinho!** 🚀
