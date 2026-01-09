-- ============================================
-- CORREÇÃO DE POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Este script corrige as políticas RLS para usar auth.uid() corretamente
-- Execute no Supabase SQL Editor

-- ============================================
-- 1. CORRIGIR POLÍTICAS DE profiles
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Criar políticas corretas usando auth.uid()
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

-- ============================================
-- 2. CORRIGIR POLÍTICAS DE user_credits
-- ============================================

-- Remover política antiga
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;

-- Criar política correta usando auth.uid()
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT
    USING (auth.uid() = user_id);

-- NOTA: Não criamos políticas INSERT/UPDATE para user_credits
-- porque essas operações são feitas apenas pelo backend usando SERVICE_KEY
-- O SERVICE_KEY bypassa RLS automaticamente

-- ============================================
-- 3. REMOVER ÍNDICES NÃO UTILIZADOS (OPCIONAL)
-- ============================================

-- Remover índice redundante (já temos índice composto)
DROP INDEX IF EXISTS public.idx_user_credits_user_id;

-- Remover índice não utilizado (queries sempre filtram por user_id também)
DROP INDEX IF EXISTS public.idx_user_credits_month_year;

-- ============================================
-- 4. VERIFICAR RESULTADO
-- ============================================

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

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Após executar este script:
-- ✅ Políticas usando auth.uid() corretamente
-- ✅ Avisos do Supabase Studio devem desaparecer
-- ✅ Dados isolados por usuário
-- ✅ Sem vazamento de informações
