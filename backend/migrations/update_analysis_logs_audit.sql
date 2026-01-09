-- ============================================
-- ADICIONAR COLUNAS DE AUDITORIA E RESPOSTA DA IA
-- ============================================

-- Adiciona coluna para armazenar a resposta estruturada bruta da IA
ALTER TABLE public.analysis_logs 
ADD COLUMN IF NOT EXISTS raw_response JSONB;

-- Adiciona coluna para armazenar alertas detectados (e.g., ["Campo Valor não encontrado", "Data inconsistente"])
ALTER TABLE public.analysis_logs 
ADD COLUMN IF NOT EXISTS ai_alerts JSONB DEFAULT '[]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN public.analysis_logs.raw_response IS 'Resposta JSON bruta retornada pela IA após processamento';
COMMENT ON COLUMN public.analysis_logs.ai_alerts IS 'Lista de alertas detectados na resposta da IA (inconsistências, campos ND, etc)';
