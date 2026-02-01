-- =============================================
-- Migration: Create naming_patterns table and link to companies
-- =============================================

-- 1. Create naming_patterns table
CREATE TABLE IF NOT EXISTS public.naming_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pattern TEXT NOT NULL, -- Ex: "{{DATA}} - {{VALOR}} - {{NOME}}"
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add reference to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS naming_pattern_id UUID REFERENCES public.naming_patterns(id);

-- 3. Enable RLS for naming_patterns
ALTER TABLE public.naming_patterns ENABLE ROW LEVEL SECURITY;

-- 4. Policies for naming_patterns
DROP POLICY IF EXISTS "Allow authenticated read access for naming_patterns" ON public.naming_patterns;
CREATE POLICY "Allow authenticated read access for naming_patterns" 
ON public.naming_patterns FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow masters to manage naming_patterns" ON public.naming_patterns;
CREATE POLICY "Allow masters to manage naming_patterns" 
ON public.naming_patterns FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'master' OR role = 'admin')
    )
);

-- 5. Trigger for updated_at
CREATE TRIGGER update_naming_patterns_updated_at
    BEFORE UPDATE ON public.naming_patterns
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 6. Insert first default pattern
INSERT INTO public.naming_patterns (name, pattern, description)
VALUES ('Padrão Data e Valor', '{{DATA}} {{VENDA}} {{NOME}} {{VALOR}}', 'Padrão original com data no início')
ON CONFLICT (id) DO NOTHING;
