-- =============================================
-- FIX: Ambiguous Column Reference in Credits Functions
-- =============================================

-- 1. Redefine get_user_credits
-- Precisamos deletar antes porque a assinatura de retorno (RETURNS TABLE) pode ser diferente
DROP FUNCTION IF EXISTS public.get_user_credits(UUID);
CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id UUID)
RETURNS TABLE (
    credits_used INTEGER,
    credits_limit INTEGER,
    credits_remaining INTEGER,
    month_year TEXT
) AS $$
DECLARE
    v_month_year TEXT;
BEGIN
    -- Obter o mês/ano atual no formato YYYY-MM
    v_month_year := to_char(now(), 'YYYY-MM');
    
    RETURN QUERY 
    SELECT 
        uc.credits_used, 
        uc.credits_limit, 
        (uc.credits_limit - uc.credits_used) as credits_remaining,
        uc.month_year::TEXT
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id 
      AND uc.month_year = v_month_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Redefine debit_user_credit
DROP FUNCTION IF EXISTS public.debit_user_credit(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.debit_user_credit(p_user_id UUID, p_amount INTEGER DEFAULT 1)
RETURNS JSON AS $$
DECLARE
    v_month_year TEXT;
    v_credits_used INTEGER;
    v_credits_limit INTEGER;
    v_result JSON;
BEGIN
    v_month_year := to_char(now(), 'YYYY-MM');
    
    -- Obter créditos atuais com LOCK para evitar race conditions
    SELECT uc.credits_used, uc.credits_limit 
    INTO v_credits_used, v_credits_limit
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id AND uc.month_year = v_month_year
    FOR UPDATE;

    -- Se não existe registro para o mês, criar um
    IF NOT FOUND THEN
        INSERT INTO public.user_credits (user_id, month_year, credits_used, credits_limit)
        VALUES (p_user_id, v_month_year, p_amount, 2500)
        RETURNING credits_used, credits_limit INTO v_credits_used, v_credits_limit;
    ELSIF v_credits_used + p_amount > v_credits_limit THEN
        RETURN json_build_object('success', false, 'error', 'Créditos insuficientes');
    ELSE
        UPDATE public.user_credits uc
        SET credits_used = uc.credits_used + p_amount,
            updated_at = now()
        WHERE uc.user_id = p_user_id AND uc.month_year = v_month_year
        RETURNING uc.credits_used, uc.credits_limit INTO v_credits_used, v_credits_limit;
    END IF;

    RETURN json_build_object(
        'success', true, 
        'credits_used', v_credits_used, 
        'credits_limit', v_credits_limit, 
        'credits_remaining', v_credits_limit - v_credits_used
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefine reset_monthly_credits (para garantir que não haja ambiguidades aqui também)
DROP FUNCTION IF EXISTS public.reset_monthly_credits();
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS INTEGER AS $$
DECLARE
    v_month_year TEXT;
    v_count INTEGER;
BEGIN
    v_month_year := to_char(now(), 'YYYY-MM');
    
    -- Inserir novos registros para todos os usuários que não tenham registro no mês atual
    -- Baseado nos registros do mês anterior ou default 2500
    INSERT INTO public.user_credits (user_id, month_year, credits_used, credits_limit)
    SELECT 
        DISTINCT p.id, 
        v_month_year, 
        0, 
        2500
    FROM public.profiles p
    LEFT JOIN public.user_credits uc ON p.id = uc.user_id AND uc.month_year = v_month_year
    WHERE uc.user_id IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
