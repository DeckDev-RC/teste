-- Migration: WhatsApp Integration Schema Fixes
-- Run this in your Supabase SQL Editor

-- 1. Adicionar colunas faltantes em processed_messages
ALTER TABLE processed_messages 
ADD COLUMN IF NOT EXISTS analysis_result_id UUID,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Criar tabela analysis_results (se não existir)
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    analysis_json JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_status ON analysis_results(status);

ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own results" ON analysis_results;
CREATE POLICY "Users can view own results" ON analysis_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert results" ON analysis_results;
CREATE POLICY "Service can insert results" ON analysis_results
    FOR INSERT WITH CHECK (true);

-- 3. Foreign key de processed_messages para analysis_results
ALTER TABLE processed_messages
ADD CONSTRAINT IF NOT EXISTS fk_analysis_result
FOREIGN KEY (analysis_result_id) REFERENCES analysis_results(id);

-- Verificação
SELECT 'Migration completed!' as status;
