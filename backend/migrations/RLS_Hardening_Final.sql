-- ============================================
-- MIGRATION: RLS HARDENING FINAL
-- OBJETIVO: Blindar o banco de dados contra acesso não autorizado
-- ============================================

-- 1. WHATSAPP_SESSIONS (PROTEÇÃO TOTAL)
-- Chaves de criptografia devem ser acessíveis APENAS pelo backend (Service Role)
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access blocked" ON public.whatsapp_sessions;
-- Nenhuma política pública = Restrito ao Service Role.

-- 2. ANALYSIS_RESULTS
-- Usuários só podem ver e inserir seus próprios resultados
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own results" ON public.analysis_results;
CREATE POLICY "Users can view own results" ON public.analysis_results 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own results" ON public.analysis_results;
DROP POLICY IF EXISTS "Service can insert results" ON public.analysis_results;
CREATE POLICY "Users can insert own results" ON public.analysis_results 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own results" ON public.analysis_results;
CREATE POLICY "Users can update own results" ON public.analysis_results 
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. ANALYSIS_LOGS
-- Usuários só podem ver e inserir seus próprios logs
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own analysis logs" ON public.analysis_logs;
CREATE POLICY "Users can view their own analysis logs" ON public.analysis_logs 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own logs" ON public.analysis_logs;
DROP POLICY IF EXISTS "Service role can insert analysis logs" ON public.analysis_logs;
CREATE POLICY "Users can insert own logs" ON public.analysis_logs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Remover política que permitia ver tudo se for usuário comum
DROP POLICY IF EXISTS "Service role can view all analysis logs" ON public.analysis_logs;

-- 4. WHATSAPP_INSTANCES
-- Garantir controle total do dono sobre a instância
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can view own instances" ON public.whatsapp_instances 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can insert own instances" ON public.whatsapp_instances 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can update own instances" ON public.whatsapp_instances 
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can delete own instances" ON public.whatsapp_instances 
    FOR DELETE USING (auth.uid() = user_id);

-- 5. MONITORED_GROUPS
-- Garantir integridade do vínculo Instance -> User
ALTER TABLE public.monitored_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own groups" ON public.monitored_groups;
CREATE POLICY "Users can view own groups" ON public.monitored_groups 
    FOR SELECT USING (
        instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage own groups" ON public.monitored_groups;
CREATE POLICY "Users can manage own groups" ON public.monitored_groups 
    FOR ALL USING (
        instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    );

-- 6. PROCESSED_MESSAGES
-- Visualização restrita aos grupos das instâncias do usuário
ALTER TABLE public.processed_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own messages" ON public.processed_messages;
CREATE POLICY "Users can view own messages" ON public.processed_messages 
    FOR SELECT USING (
        group_id IN (
            SELECT mg.id FROM public.monitored_groups mg
            JOIN public.whatsapp_instances wi ON mg.instance_id = wi.id
            WHERE wi.user_id = auth.uid()
        )
    );

-- Verificação
SELECT 'Hardening de RLS concluído com sucesso!' as status;
