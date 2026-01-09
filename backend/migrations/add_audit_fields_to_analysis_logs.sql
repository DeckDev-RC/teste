-- ============================================
-- ADICIONAR CAMPOS DE AUDITORIA À TABELA analysis_logs
-- ============================================
-- Esta migration adiciona campos para rastreamento de qualidade das respostas da IA

-- ============================================
-- 1. ADICIONAR CAMPO raw_response (resposta bruta da IA)
-- ============================================
ALTER TABLE public.analysis_logs
ADD COLUMN IF NOT EXISTS raw_response JSONB;

COMMENT ON COLUMN public.analysis_logs.raw_response IS 'Resposta completa e bruta da IA para auditoria e debugging';

-- ============================================
-- 2. ADICIONAR CAMPO ai_alerts (alertas detectados)
-- ============================================
ALTER TABLE public.analysis_logs
ADD COLUMN IF NOT EXISTS ai_alerts TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.analysis_logs.ai_alerts IS 'Array de alertas detectados pela auditoria (ex: campos ND, valores zerados, incerteza da IA)';

-- ============================================
-- 3. CRIAR ÍNDICE PARA BUSCA POR ALERTAS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_analysis_logs_has_alerts 
ON public.analysis_logs(id) 
WHERE array_length(ai_alerts, 1) > 0;

-- ============================================
-- 4. CRIAR ÍNDICE GIN PARA BUSCA EM raw_response (JSONB)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_analysis_logs_raw_response_gin 
ON public.analysis_logs USING GIN (raw_response);

-- ============================================
-- 5. VERIFICAR RESULTADO
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'analysis_logs'
    AND column_name IN ('raw_response', 'ai_alerts')
ORDER BY column_name;

-- ============================================
-- NOTAS
-- ============================================
-- - raw_response: Armazena a resposta completa da IA em formato JSONB para auditoria
-- - ai_alerts: Array de strings com alertas detectados pelo auditHelper
-- - Índices otimizam consultas por análises com alertas e buscas dentro do JSONB
-- - Campos são opcionais (nullable) para não quebrar registros existentes
