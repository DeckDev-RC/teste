# 🔒 Correção Manual de Políticas RLS

## ⚠️ Avisos do Supabase Studio

O Supabase Studio está mostrando avisos sobre:
1. **Auth RLS Initialization Plan (public.profiles)** - 3 avisos
2. **Auth RLS Initialization Plan (public.user_credits)** - 1 aviso  
3. **Unused Index (public.user_credits)** - 1 aviso

## 🔍 Diagnóstico

### Status Atual das Políticas

**profiles:**
- ✅ RLS habilitado
- ✅ 3 políticas existentes (SELECT, INSERT, UPDATE)
- ⚠️ Usando `uid()` em vez de `auth.uid()`

**user_credits:**
- ✅ RLS habilitado
- ✅ 1 política existente (SELECT)
- ⚠️ Usando `uid()` em vez de `auth.uid()`

### Problema

As políticas estão usando `uid()` que pode funcionar, mas o Supabase recomenda usar `auth.uid()` explicitamente para evitar ambiguidade e garantir compatibilidade.

## ✅ Solução: Executar no Supabase SQL Editor

### Passo 1: Recriar Políticas com auth.uid()

Execute este SQL no **Supabase SQL Editor**:

```sql
-- ============================================
-- CORRIGIR POLÍTICAS RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;

-- Criar políticas corretas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Criar política correta para user_credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT
    USING (auth.uid() = user_id);

-- NOTA: Não criamos políticas INSERT/UPDATE para user_credits
-- porque essas operações são feitas apenas pelo backend usando SERVICE_KEY
-- O SERVICE_KEY bypassa RLS automaticamente
```

### Passo 2: Remover Índices Não Utilizados (Opcional)

```sql
-- Remover índices redundantes
-- idx_user_credits_user_id é redundante (já temos índice composto)
DROP INDEX IF EXISTS public.idx_user_credits_user_id;

-- idx_user_credits_month_year provavelmente não é usado
DROP INDEX IF EXISTS public.idx_user_credits_month_year;
```

### Passo 3: Verificar Resultado

```sql
-- Verificar políticas atualizadas
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'user_credits')
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'user_credits')
AND schemaname = 'public';
```

## 🛡️ Segurança Garantida

### ✅ Após Correção

1. **Isolamento de Dados:**
   - Usuários só podem ver seus próprios perfis
   - Usuários só podem ver seus próprios créditos
   - Sem vazamento de dados entre usuários

2. **Proteção de Créditos:**
   - Usuários **NÃO** podem modificar seus próprios créditos
   - Apenas o backend (com SERVICE_KEY) pode debitar créditos
   - Validação atômica no PostgreSQL previne race conditions

3. **Políticas Corretas:**
   - Usando `auth.uid()` explicitamente
   - Compatível com Supabase Auth
   - Avisos do Supabase Studio devem desaparecer

## 📋 Checklist

- [ ] Executar SQL de correção no Supabase SQL Editor
- [ ] Verificar que políticas foram atualizadas
- [ ] Confirmar que avisos desapareceram no Supabase Studio
- [ ] Testar que usuários só veem seus próprios dados
- [ ] Verificar que backend ainda consegue debitar créditos

## 🔗 Como Acessar Supabase SQL Editor

1. Acesse: `http://31.97.164.208:8000` (ou seu IP)
2. Vá em **SQL Editor**
3. Cole o SQL de correção
4. Execute (Ctrl+Enter ou botão Run)

## ⚠️ Nota Importante

- **NÃO** crie políticas INSERT/UPDATE para `user_credits`
- Essas operações são feitas apenas pelo backend usando SERVICE_KEY
- O SERVICE_KEY bypassa RLS automaticamente
- Isso é intencional e seguro

## 📝 Arquivo SQL Completo

O arquivo `backend/RLS_POLICIES_FIX.sql` contém o script completo para execução.
