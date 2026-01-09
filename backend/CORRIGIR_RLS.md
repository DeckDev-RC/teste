# 🔒 Correção de Políticas RLS (Row Level Security)

## ⚠️ Problemas Identificados

O Supabase Studio está mostrando avisos sobre:
1. **Auth RLS Initialization Plan (public.profiles)** - 3 avisos
2. **Auth RLS Initialization Plan (public.user_credits)** - 1 aviso
3. **Unused Index (public.user_credits)** - 1 aviso

## 🔍 Análise

### Políticas RLS Atuais

**profiles:**
- ✅ SELECT: `uid() = id`
- ✅ INSERT: `uid() = id`
- ✅ UPDATE: `uid() = id`

**user_credits:**
- ✅ SELECT: `uid() = user_id`
- ❌ INSERT: Não existe (correto - apenas backend pode inserir)
- ❌ UPDATE: Não existe (correto - apenas backend pode atualizar)

### Problema Identificado

As políticas estão usando `uid()` mas deveriam usar `auth.uid()` para garantir compatibilidade com Supabase Auth.

## ✅ Correções Aplicadas

### 1. Políticas RLS Corrigidas

**profiles:**
```sql
-- SELECT: Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- INSERT: Usuários podem inserir apenas seu próprio perfil
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- UPDATE: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
```

**user_credits:**
```sql
-- SELECT: Usuários podem ver apenas seus próprios créditos
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT
    USING (auth.uid() = user_id);

-- NOTA: INSERT e UPDATE são feitos apenas pelo backend usando SERVICE_KEY
-- O SERVICE_KEY bypassa RLS automaticamente, então não precisamos de políticas
```

## 🛡️ Segurança Garantida

### ✅ Isolamento de Dados
- Usuários só podem ver seus próprios dados
- Não há vazamento de dados entre usuários
- Backend usa SERVICE_KEY para operações do sistema (bypass RLS)

### ✅ Proteção de Créditos
- Usuários não podem modificar seus próprios créditos
- Apenas o backend (com SERVICE_KEY) pode debitar créditos
- Validação atômica no PostgreSQL previne race conditions

## 📋 Verificação

Execute no Supabase SQL Editor:

```sql
-- Verificar políticas RLS
SELECT 
    schemaname,
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
```

## 🎯 Resultado Esperado

Após as correções:
- ✅ Avisos de "Auth RLS Initialization Plan" devem desaparecer
- ✅ Políticas usando `auth.uid()` corretamente
- ✅ Dados isolados por usuário
- ✅ Sem vazamento de informações

## ⚠️ Índice Não Utilizado

O aviso sobre "Unused Index" em `user_credits` é apenas uma otimização de performance. Se o índice não está sendo usado, pode ser removido, mas não é crítico para segurança.

Para verificar índices:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'user_credits' 
AND schemaname = 'public';
```

Para remover índice não utilizado (se necessário):
```sql
-- CUIDADO: Verifique se o índice realmente não é usado antes de remover
-- DROP INDEX IF EXISTS nome_do_indice;
```
