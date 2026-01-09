# Fluxo de Dados do Dashboard Master

## Visão Geral

O dashboard master funciona como uma camada de visualização que consome dados agregados do backend, que por sua vez busca e processa dados do banco de dados Supabase.

## Arquitetura de Dados

```
┌─────────────┐
│  Frontend   │
│  Dashboard  │
└──────┬──────┘
       │ HTTP Request (GET /api/dashboard/*)
       │ com JWT Token (autenticação)
       ▼
┌─────────────┐
│   Backend   │
│  Express.js │
└──────┬──────┘
       │
       ├─► Middleware: authenticate (valida JWT)
       ├─► Middleware: requireMaster (verifica role)
       │
       ▼
┌─────────────────────┐
│  Dashboard Controller│
│  dashboardController │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────┐
│ DashboardStatsService │
│ dashboardStatsService │
└──────┬───────────────┘
       │
       ├─► analysisLogService (busca análises)
       ├─► supabaseAdmin (query direto no DB)
       │
       ▼
┌──────────────────────┐
│    Supabase DB       │
│                      │
│  - profiles          │
│  - user_credits      │
│  - analysis_logs     │
│  - auth.users        │
└──────────────────────┘
```

## Fluxo Detalhado

### 1. **Frontend → Backend**

```javascript
// frontend/src/utils/dashboardApi.js
const response = await authenticatedFetch('/api/dashboard/stats?startDate=...&endDate=...')
const data = await response.json()
```

- Frontend faz requisição HTTP GET para `/api/dashboard/stats`
- Inclui automaticamente o JWT token via `authenticatedFetch`
- Pode incluir filtros: `startDate`, `endDate`, `groupBy`

### 2. **Backend: Autenticação e Autorização**

```javascript
// backend/src/routes/dashboardRoutes.js
router.use(authenticate);      // Valida JWT token
router.use(requireMaster);     // Verifica se é master/admin
router.get('/stats', getDashboardStats);
```

- Middleware `authenticate`: Valida o token JWT e extrai `user_id`
- Middleware `requireMaster`: Verifica se `user.role === 'master'` ou `'admin'`
- Se não for master/admin, retorna 403 Forbidden

### 3. **Backend: Controller**

```javascript
// backend/src/controllers/dashboardController.js
export const getDashboardStats = async (req, res) => {
    const filters = { startDate, endDate, groupBy };
    
    // Busca TODAS as estatísticas em paralelo
    const [usersStats, creditsStats, usageStats, performanceStats, financialStats] = 
        await Promise.all([
            dashboardStatsService.getUserStats(filters),
            dashboardStatsService.getCreditsStats(filters),
            dashboardStatsService.getUsageStats(filters),
            dashboardStatsService.getPerformanceStats(filters),
            dashboardStatsService.getFinancialStats(filters)
        ]);
    
    res.json({ success: true, data: { users, credits, usage, performance, financial } });
}
```

### 4. **Backend: Services (Agregação de Dados)**

#### 4.1. **DashboardStatsService.getUserStats()**

```javascript
// Busca de profiles (todos os usuários)
const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, created_at')

// Busca análises ativas (para contar usuários ativos)
const activeUsers = await analysisLogService.getSystemAnalyses(filters)
const uniqueActiveUsers = new Set(activeUsers.map(a => a.user_id))

// Agregação:
// - Total de usuários
// - Novos usuários no período
// - Usuários ativos
// - Distribuição por role
// - Crescimento mensal
```

#### 4.2. **DashboardStatsService.getCreditsStats()**

```javascript
// Busca créditos do mês atual
const { data: credits } = await supabaseAdmin
    .from('user_credits')
    .select('*')
    .eq('month_year', currentMonth)

// Busca perfis separadamente (para fazer merge)
const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role')
    .in('id', userIds)

// Agregação:
// - Total de créditos usados
// - Total disponível
// - Média por usuário
// - Top 10 usuários
// - Distribuição por faixas
// - Histórico mensal
```

#### 4.3. **DashboardStatsService.getUsageStats()**

```javascript
// Busca análises via AnalysisLogService
const analysisStats = await analysisLogService.getAnalysisStats(filters)
const analyses = await analysisLogService.getSystemAnalyses(filters)

// Agregação:
// - Total de análises
// - Por tipo (receipt/payment)
// - Por provedor (gemini/openai)
// - Por empresa
// - Taxa de sucesso
// - Taxa de cache hit
// - Série temporal (dia/semana/mês)
```

#### 4.4. **AnalysisLogService.getSystemAnalyses()**

```javascript
// Busca análises da tabela analysis_logs
const { data: analyses } = await this.supabase
    .from('analysis_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

// Busca perfis separadamente (problema de foreign key resolvido)
const { data: profiles } = await this.supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .in('id', userIds)

// Faz merge manual dos dados
return analyses.map(analysis => ({
    ...analysis,
    profiles: profilesMap.get(analysis.user_id)
}))
```

### 5. **Backend → Frontend (Resposta)**

```json
{
  "success": true,
  "data": {
    "period": { "start": "2024-01-01", "end": "2024-12-31" },
    "users": {
      "total": 150,
      "active": 120,
      "new": 25,
      "byRole": { "user": 145, "admin": 4, "master": 1 }
    },
    "credits": {
      "totalUsed": 45000,
      "totalAvailable": 375000,
      "averagePerUser": 300,
      "topUsers": [...]
    },
    "usage": {
      "totalAnalyses": 45000,
      "byType": { "financial-receipt": 30000, "financial-payment": 15000 },
      "byProvider": { "gemini": 35000, "openai": 10000 },
      "successRate": 98.5
    },
    "performance": {
      "avgProcessingTime": 2500,
      "errorRate": 1.5
    }
  }
}
```

### 6. **Frontend: Renderização**

```javascript
// frontend/src/pages/DashboardPage.jsx
const [stats, setStats] = useState(null)

useEffect(() => {
    loadDashboardData()  // Chama API
}, [filters])

// Renderiza:
// - Cards de KPI (StatsCard)
// - Gráficos (TimeSeriesChart, PieChart, BarChart)
// - Tabelas (UsersTable)
```

## Tabelas do Banco de Dados

### **profiles**
- Armazena informações dos usuários
- Campos: `id` (FK para auth.users), `email`, `full_name`, `role`, `created_at`
- RLS habilitado (usuários veem apenas seus próprios dados)

### **user_credits**
- Armazena créditos mensais dos usuários
- Campos: `id`, `user_id` (FK para auth.users), `credits_used`, `credits_limit`, `month_year`, `last_reset_at`
- Um registro por usuário por mês

### **analysis_logs**
- Armazena histórico de todas as análises realizadas
- Campos: `id`, `user_id` (FK para auth.users), `analysis_type`, `provider`, `company`, `file_name`, `file_hash`, `is_from_cache`, `processing_time_ms`, `success`, `error_message`, `credits_debited`, `created_at`
- Criada pela migration `create_analysis_logs.sql`

### **auth.users**
- Tabela do Supabase Auth (gerenciada pelo Supabase)
- Contém dados de autenticação dos usuários

## Problema Resolvido: Foreign Keys

### Problema Original
O Supabase PostgREST não consegue fazer join automático quando:
- A foreign key referencia `auth.users` (schema diferente)
- Não há foreign key direta entre `analysis_logs.user_id` e `profiles.id`

### Solução Implementada
```javascript
// ❌ ANTES (não funcionava)
.select(`
    *,
    profiles:user_id (...)  // Erro: foreign key não encontrada
`)

// ✅ DEPOIS (funciona)
// 1. Busca dados principais
const { data: analyses } = await supabase
    .from('analysis_logs')
    .select('*')

// 2. Busca perfis separadamente
const userIds = [...new Set(analyses.map(a => a.user_id))]
const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

// 3. Faz merge manual
const profilesMap = new Map(profiles.map(p => [p.id, p]))
return analyses.map(a => ({
    ...a,
    profiles: profilesMap.get(a.user_id)
}))
```

## Segurança

1. **Autenticação**: JWT token obrigatório em todas as rotas
2. **Autorização**: Apenas usuários com `role = 'master'` ou `'admin'` podem acessar
3. **Service Key**: Backend usa `SUPABASE_SERVICE_KEY` para bypass de RLS (necessário para ver dados de todos os usuários)
4. **RLS**: Usuários normais só veem seus próprios dados via RLS do Supabase

## Performance

1. **Queries em Paralelo**: `Promise.all()` para buscar múltiplas estatísticas simultaneamente
2. **Índices**: Tabelas têm índices em `user_id`, `created_at`, `analysis_type`, `provider`
3. **Agregação no Backend**: Dados são agregados no servidor, não no frontend
4. **Cache Futuro**: Pode implementar cache Redis para estatísticas (não implementado ainda)
