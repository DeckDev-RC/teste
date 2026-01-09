# Sistema de Créditos - Guia Rápido

## ⚡ Configuração Rápida

### 1. Variáveis de Ambiente (Backend)

Adicione ao `.env` do backend:

```env
SUPABASE_URL=http://31.97.164.208:8000
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njc5MDYwNTcsImV4cCI6MTkyNTU4NjA1N30.-0wUDTLDADh9wfOerbCSHHariIr5Rp1cw73WTaOK8iI
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY3OTA2MDU3LCJleHAiOjE5MjU1ODYwNTd9.XfRF2jrytkfNyRiX0Rj_F7vjlsRPa_jxYKZ73bAbL64
```

### 2. Obter Service Key na VPS

```bash
docker exec supabase-kong env | grep SERVICE_ROLE_KEY
```

## 🔄 Reset Mensal

### Opção 1: Cron Job (Recomendado)

```bash
# Editar crontab
crontab -e

# Adicionar linha (executa dia 1 de cada mês às 00:00)
0 0 1 * * cd /caminho/do/projeto && node backend/scripts/reset-monthly-credits.js >> /var/log/reset-credits.log 2>&1
```

### Opção 2: Manual

```bash
node backend/scripts/reset-monthly-credits.js
```

## 📡 Endpoints da API

### GET /api/credits
Obtém créditos do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token_jwt>
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "credits_used": 5,
    "credits_limit": 2500,
    "credits_remaining": 2495,
    "month_year": "2026-01"
  }
}
```

### POST /api/analyze
Analisa documento (requer autenticação e créditos).

**Headers:**
```
Authorization: Bearer <token_jwt>
```

**Body (FormData):**
- `image`: Arquivo
- `analysisType`: Tipo de análise
- `company`: Empresa (opcional)

**Respostas:**
- `200`: Análise bem-sucedida, crédito debitado
- `401`: Não autenticado
- `403`: Créditos insuficientes

## 🔒 Segurança

✅ Verificação no PostgreSQL (não pode ser burlada)  
✅ Débito atômico (transação)  
✅ RLS habilitado  
✅ Token JWT obrigatório  
✅ Service key apenas no backend  

## 📊 Estrutura do Banco

```sql
user_credits
├── user_id (UUID) → auth.users
├── credits_used (INTEGER)
├── credits_limit (INTEGER) = 2500
├── month_year (VARCHAR) = 'YYYY-MM'
└── RLS: Usuários só veem próprios créditos
```

## 🧪 Teste Rápido

```bash
# 1. Obter token (no frontend após login)
const token = (await supabase.auth.getSession()).data.session.access_token;

# 2. Consultar créditos
curl -H "Authorization: Bearer $token" http://localhost:3001/api/credits

# 3. Analisar documento
curl -X POST \
  -H "Authorization: Bearer $token" \
  -F "image=@test.jpg" \
  -F "analysisType=financial-receipt" \
  http://localhost:3001/api/analyze
```
