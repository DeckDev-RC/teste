# Setup do Dashboard Master

## Passo 1: Executar Migration SQL

**IMPORTANTE**: Antes de usar o dashboard, você precisa criar a tabela `analysis_logs` no Supabase.

### Como Executar

1. Acesse o Supabase Dashboard ou use o SQL Editor
2. Copie o conteúdo do arquivo `backend/migrations/create_analysis_logs.sql`
3. Execute o SQL no Supabase

Ou via CLI:
```bash
# Se você tiver o Supabase CLI configurado
supabase db execute -f backend/migrations/create_analysis_logs.sql
```

### Verificar se a Tabela Foi Criada

Execute no Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'analysis_logs';
```

Se retornar `analysis_logs`, a tabela foi criada com sucesso!

## Passo 2: Verificar Variáveis de Ambiente

Certifique-se de que o `.env` do backend tem:

```env
SUPABASE_URL=http://31.97.164.208:8000
SUPABASE_SERVICE_KEY=sua_service_key_aqui
```

## Passo 3: Testar o Dashboard

1. Faça login como usuário master/admin
2. Acesse `/dashboard`
3. O dashboard deve carregar as estatísticas

## Estrutura de Dados Esperada

### Tabelas Necessárias

1. **profiles** - Já existe
   - Campos: `id`, `email`, `full_name`, `role`, `created_at`

2. **user_credits** - Já existe
   - Campos: `id`, `user_id`, `credits_used`, `credits_limit`, `month_year`, `last_reset_at`

3. **analysis_logs** - Precisa ser criada
   - Criada pela migration `create_analysis_logs.sql`
   - Será populada automaticamente quando análises forem realizadas

## Notas Importantes

- A tabela `analysis_logs` será populada automaticamente após a criação
- Dados históricos só estarão disponíveis após análises serem realizadas
- As comparações percentuais (variações) serão calculadas baseadas nos dados existentes
- Se não houver dados históricos suficientes, as variações mostrarão 0% ou valores padrão
