-- ============================================
-- CRIAR SISTEMA DE USUÁRIO MASTER/ADMIN
-- ============================================
-- Execute este SQL no Supabase SQL Editor

-- ============================================
-- 1. ADICIONAR COLUNA ROLE
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'master'));

-- ============================================
-- 2. CRIAR ÍNDICE PARA BUSCA RÁPIDA
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================
-- 3. DEFINIR USUÁRIO COMO MASTER
-- ============================================
-- Substitua 'seu-email@exemplo.com' pelo email do usuário que será master
UPDATE public.profiles 
SET role = 'master' 
WHERE email = 'renatoagregar@gmail.com';

-- Ou para definir um usuário específico por ID:
-- UPDATE public.profiles 
-- SET role = 'master' 
-- WHERE id = '53941d60-535e-47a4-83a0-b1b450e543fa'::uuid;

-- ============================================
-- 4. CRIAR FUNÇÃO PARA VERIFICAR SE É MASTER
-- ============================================
CREATE OR REPLACE FUNCTION public.is_master_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_role VARCHAR(20);
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Retorna true se for master ou admin
    RETURN COALESCE(v_role, 'user') IN ('master', 'admin');
END;
$$;

-- ============================================
-- 5. VERIFICAR RESULTADO
-- ============================================
SELECT 
    id,
    email,
    role,
    created_at
FROM public.profiles
ORDER BY 
    CASE role 
        WHEN 'master' THEN 1 
        WHEN 'admin' THEN 2 
        ELSE 3 
    END,
    created_at DESC;

-- ============================================
-- ROLES DISPONÍVEIS
-- ============================================
-- 'user'   - Usuário comum (padrão)
-- 'admin'  - Administrador (pode gerenciar usuários)
-- 'master' - Master (acesso total ao sistema)
