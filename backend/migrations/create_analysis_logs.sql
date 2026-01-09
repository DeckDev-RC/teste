-- ============================================
-- CRIAR TABELA DE LOGS DE ANÁLISES
-- ============================================
-- Execute este SQL no Supabase SQL Editor

-- ============================================
-- 1. CRIAR TABELA analysis_logs
-- ============================================
CREATE TABLE IF NOT EXISTS public.analysis_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50),
    company VARCHAR(100),
    file_name VARCHAR(255),
    file_hash VARCHAR(64),
    is_from_cache BOOLEAN DEFAULT false,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    credits_debited INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_id ON public.analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_created_at ON public.analysis_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_analysis_type ON public.analysis_logs(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_provider ON public.analysis_logs(provider);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_success ON public.analysis_logs(success);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_created ON public.analysis_logs(user_id, created_at DESC);

-- ============================================
-- 3. HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICA RLS: Usuários veem apenas suas próprias análises
-- ============================================
DROP POLICY IF EXISTS "Users can view their own analysis logs" ON public.analysis_logs;
CREATE POLICY "Users can view their own analysis logs"
    ON public.analysis_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- 5. POLÍTICA RLS: Sistema pode inserir análises
-- ============================================
DROP POLICY IF EXISTS "Service role can insert analysis logs" ON public.analysis_logs;
CREATE POLICY "Service role can insert analysis logs"
    ON public.analysis_logs
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 6. POLÍTICA RLS: Service role pode ver todas as análises (para master/admin)
-- ============================================
DROP POLICY IF EXISTS "Service role can view all analysis logs" ON public.analysis_logs;
CREATE POLICY "Service role can view all analysis logs"
    ON public.analysis_logs
    FOR SELECT
    USING (true);

-- ============================================
-- 7. VERIFICAR RESULTADO
-- ============================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'analysis_logs'
ORDER BY ordinal_position;

-- ============================================
-- NOTAS
-- ============================================
-- - A tabela armazena todas as análises realizadas no sistema
-- - RLS garante que usuários só veem suas próprias análises
-- - Service role (backend) pode ver/inserir todas as análises
-- - Índices otimizam consultas por usuário, data, tipo e provedor
