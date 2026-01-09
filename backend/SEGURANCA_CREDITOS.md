# 🔒 Segurança do Sistema de Créditos

## ✅ Vulnerabilidades Corrigidas

### 1. **Bypass quando verificação de créditos falha** ❌ → ✅ CORRIGIDO
**Antes:**
```javascript
catch (creditsError) {
    // Se o serviço de créditos falhar, pode continuar com quota global como fallback
    const stats = await usageService.getStats();
    if (stats.remaining <= 0) {
        return res.status(403).json({ success: false, error: 'Cota mensal esgotada' });
    }
}
```
**Problema:** Se o serviço de créditos falhasse, o sistema permitia continuar usando quota global, permitindo bypass.

**Depois:**
```javascript
catch (creditsError) {
    // SEGURANÇA: Se não conseguir verificar créditos, BLOQUEIA a requisição
    return res.status(503).json({ 
        success: false, 
        error: 'Sistema de créditos temporariamente indisponível. Tente novamente mais tarde.' 
    });
}
```
**Solução:** Bloqueia a requisição se não conseguir verificar créditos. Não permite fallback.

---

### 2. **Bypass quando débito falha mas análise continua** ❌ → ✅ CORRIGIDO
**Antes:**
```javascript
try {
    const debitResult = await creditsService.debitCredit(userId, 1);
} catch (creditsError) {
    // Se falhar ao debitar, incrementa quota global como fallback
    await usageService.increment();
}
```
**Problema:** Se o débito falhasse, a análise já estava feita mas não era debitada, permitindo uso ilimitado.

**Depois:**
```javascript
if (analysisPerformed) {
    try {
        const debitResult = await creditsService.debitCredit(userId, 1);
        
        // SEGURANÇA: Verificar se o débito foi bem-sucedido
        if (!debitResult || !debitResult.success) {
            return res.status(500).json({ 
                success: false, 
                error: 'Erro ao processar créditos. Análise não pode ser concluída.' 
            });
        }
    } catch (creditsError) {
        // SEGURANÇA: Se falhar ao debitar, NÃO permite continuar
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao processar créditos. Análise não pode ser concluída.' 
        });
    }
}
```
**Solução:** Se o débito falhar, retorna erro e não permite que a análise seja concluída.

---

### 3. **Bypass via cache** ❌ → ✅ CORRIGIDO
**Antes:**
```javascript
let analysis = analysisStore.getAnalysis(...);
if (!analysis) {
    // Faz análise e debita crédito
}
// Sempre debita crédito, mesmo se veio do cache
```
**Problema:** Se a análise viesse do cache, ainda debitaria crédito novamente, ou se não debitava, permitia uso ilimitado via cache.

**Depois:**
```javascript
let analysis = analysisStore.getAnalysis(...);
let isFromCache = !!analysis;
let analysisPerformed = false;

if (!analysis) {
    // Faz análise
    analysisPerformed = true;
}

// SEGURANÇA: Se análise foi do cache, não debita novamente
// Se análise foi nova, DEVE debitar obrigatoriamente
if (analysisPerformed) {
    // Debitar crédito
}
```
**Solução:** Análises do cache não debitam créditos novamente (já foram debitados na primeira análise). Análises novas sempre debitam.

---

### 4. **Validação dupla (Race Condition)** ❌ → ✅ CORRIGIDO
**Antes:**
```javascript
// Verifica créditos uma vez no início
const hasCredits = await creditsService.hasEnoughCredits(userId, 1);
// ... faz análise ...
// Debitar crédito
```
**Problema:** Entre a verificação e o débito, o usuário poderia ter esgotado os créditos (race condition).

**Depois:**
```javascript
// Verifica créditos no início
const creditsCheck = await creditsService.getUserCredits(userId);
if (creditsCheck.credits_remaining < 1) {
    return res.status(403).json({ ... });
}

// ... antes de fazer análise ...
// Verifica créditos novamente (race condition protection)
const recheckCredits = await creditsService.getUserCredits(userId);
if (recheckCredits.credits_remaining < 1) {
    return res.status(403).json({ ... });
}

// ... faz análise ...
// Debitar crédito (validação atômica no PostgreSQL)
```
**Solução:** Validação dupla + validação atômica na função PostgreSQL.

---

## 🔐 Camadas de Segurança Implementadas

### Camada 1: Autenticação (Middleware)
- ✅ Token JWT obrigatório
- ✅ Validação via Supabase
- ✅ `req.user.id` extraído do token

### Camada 2: Verificação Inicial de Créditos
- ✅ Verifica créditos antes de processar
- ✅ Bloqueia se `credits_remaining < 1`
- ✅ **SEM FALLBACK** - bloqueia se serviço falhar

### Camada 3: Verificação Antes da Análise (Race Condition)
- ✅ Re-verifica créditos antes de fazer análise
- ✅ Protege contra race conditions
- ✅ Bloqueia se créditos esgotaram entre verificações

### Camada 4: Validação Atômica no PostgreSQL
- ✅ Função `debit_user_credit` valida créditos atomicamente
- ✅ Verifica `credits_remaining >= amount` antes de debitar
- ✅ UPDATE atômico em transação única
- ✅ Retorna erro se créditos insuficientes

### Camada 5: Validação do Resultado do Débito
- ✅ Verifica se `debitResult.success === true`
- ✅ Bloqueia se débito falhar
- ✅ Não permite análise sem débito confirmado

---

## 🛡️ Proteções Implementadas

### ✅ Sem Bypass via Fallback
- Removido fallback para `usageService` quando créditos falham
- Sistema bloqueia se não conseguir verificar/debitar créditos

### ✅ Sem Bypass via Cache
- Análises do cache não debitam créditos novamente
- Análises novas sempre debitam créditos

### ✅ Sem Bypass via Race Condition
- Validação dupla (antes e depois)
- Validação atômica no PostgreSQL

### ✅ Sem Bypass via Erro
- Se débito falhar, análise não é concluída
- Retorna erro 500 em vez de permitir continuar

### ✅ Sem Bypass via Frontend
- Frontend pode ser ignorado
- Toda validação é feita no backend
- Token JWT obrigatório

---

## 🔍 Como Testar a Segurança

### Teste 1: Tentar usar sem créditos
```bash
# 1. Usuário com 0 créditos
# 2. Tentar analisar documento
# Resultado esperado: 403 Forbidden - "Créditos insuficientes"
```

### Teste 2: Tentar bypass via erro de serviço
```bash
# 1. Desabilitar serviço de créditos temporariamente
# 2. Tentar analisar documento
# Resultado esperado: 503 Service Unavailable - "Sistema de créditos temporariamente indisponível"
```

### Teste 3: Tentar bypass via race condition
```bash
# 1. Usuário com 1 crédito
# 2. Fazer 2 requisições simultâneas
# Resultado esperado: Apenas 1 deve ser bem-sucedida, a outra deve retornar 403
```

### Teste 4: Tentar bypass via cache
```bash
# 1. Analisar documento (deve debitar crédito)
# 2. Analisar mesmo documento novamente (cache)
# Resultado esperado: Não debita crédito novamente (correto)
```

---

## 📊 Fluxo de Segurança Completo

```
1. Requisição → Middleware de Autenticação
   ✅ Token JWT válido? → Continua
   ❌ Token inválido? → 401 Unauthorized

2. Controller → Verificação Inicial de Créditos
   ✅ Tem créditos? → Continua
   ❌ Sem créditos? → 403 Forbidden
   ❌ Erro ao verificar? → 503 Service Unavailable (SEM FALLBACK)

3. Antes da Análise → Re-verificação de Créditos (Race Condition)
   ✅ Ainda tem créditos? → Continua
   ❌ Créditos esgotaram? → 403 Forbidden

4. Análise → Processa documento
   ✅ Análise bem-sucedida? → Continua
   ❌ Análise falhou? → 500 Internal Server Error

5. Débito → Chama função PostgreSQL
   ✅ Débito bem-sucedido? → Retorna resultado
   ❌ Débito falhou? → 500 Internal Server Error (NÃO retorna análise)

6. PostgreSQL → Validação Atômica
   ✅ Tem créditos suficientes? → Debita e retorna sucesso
   ❌ Sem créditos? → Retorna erro (não debita)
```

---

## 🎯 Conclusão

O sistema de créditos agora possui **5 camadas de segurança** que impedem bypass:

1. ✅ Autenticação obrigatória (JWT)
2. ✅ Verificação inicial de créditos (sem fallback)
3. ✅ Re-verificação antes da análise (race condition)
4. ✅ Validação atômica no PostgreSQL
5. ✅ Validação do resultado do débito

**Nenhum bypass é possível** - se qualquer camada falhar, a requisição é bloqueada.
