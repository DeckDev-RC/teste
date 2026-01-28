-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Building2',
    financial_receipt_prompt TEXT,
    financial_payment_prompt TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone authenticated can read
CREATE POLICY "Allow authenticated read access" 
ON public.companies FOR SELECT 
TO authenticated 
USING (true);

-- Only masters/admins can modify (controlled by role in profiles)
-- Note: This assumes the profiles table has a role column we can check via a helper or direct check
CREATE POLICY "Allow masters to manage companies" 
ON public.companies FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'master' OR role = 'admin')
    )
);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
