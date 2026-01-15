# 📊 Tabela `security_audit_logs`

## 🎯 Propósito

A tabela `security_audit_logs` é um **sistema de auditoria de segurança** que registra eventos críticos relacionados à autenticação e segurança da aplicação. Ela serve para:

### 1. **Monitoramento de Segurança**
- Registrar tentativas de autenticação falhadas
- Rastrear tokens inválidos ou expirados
- Identificar padrões de atividade suspeita

### 2. **Compliance e Auditoria**
- Manter histórico de eventos de segurança
- Facilitar investigações de incidentes
- Atender requisitos de auditoria e compliance

### 3. **Análise e Detecção de Ameaças**
- Identificar IPs com muitas tentativas falhadas (possíveis ataques)
- Detectar padrões anômalos de acesso
- Apoiar análises de segurança proativa

### 4. **Debugging e Troubleshooting**
- Entender problemas de autenticação
- Rastrear erros relacionados a tokens
- Diagnosticar problemas de acesso

## 📋 Estrutura da Tabela

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | BIGSERIAL | Identificador único (chave primária) |
| `event_type` | VARCHAR(100) | Tipo do evento (ex: `token_invalid`, `auth_failed`) |
| `ip_address` | VARCHAR(45) | IP do cliente (mascarado para privacidade) |
| `user_agent` | TEXT | User-Agent do navegador/cliente |
| `user_id` | UUID | ID do usuário (se disponível, NULL para eventos sem autenticação) |
| `metadata` | JSONB | Metadados adicionais (path, errorType, etc) |
| `created_at` | TIMESTAMPTZ | Data/hora do evento |

## 🔐 Eventos Registrados

A tabela registra os seguintes tipos de eventos (definidos em `auditLogService.js`):

- **`token_invalid`**: Token JWT inválido ou malformado
- **`token_expired`**: Token JWT expirado
- **`token_missing`**: Requisição sem token de autenticação
- **`auth_failed`**: Falha geral na autenticação
- **`rate_limited`**: Requisições bloqueadas por rate limiting
- **`csrf_failed`**: Falha na validação CSRF
- **`admin_access_denied`**: Acesso negado a recursos administrativos
- **`suspicious_activity`**: Atividade suspeita detectada

## 🔒 Segurança e Privacidade

### Mascaramento de IP
Os IPs são mascarados automaticamente antes de serem salvos:
- `192.168.1.100` → `192.168.1.xxx`
- Mantém privacidade mas permite identificação de padrões

### Row Level Security (RLS)
- **RLS Habilitado**: A tabela tem RLS ativo
- **Políticas Restritivas**: Apenas o backend (usando `service_key`) pode inserir dados
- **Sem Leitura Pública**: Usuários normais não podem ler os logs (apenas via service key)

### Acesso
- **Escrita**: Apenas pelo backend usando `SUPABASE_SERVICE_KEY`
- **Leitura**: Apenas para administradores/master (via service key)
- **Frontend**: Não tem acesso a esses dados

## 🔍 Onde é Usado

### Middleware de Autenticação (`auth.js`)
Registra eventos quando:
- Token está ausente
- Token é inválido ou expirado
- Erro na validação do token

### Exemplo de Uso
```javascript
// Em auth.js
auditLogService.log({
    event: auditLogService.events.TOKEN_INVALID,
    ...auditLogService.extractRequestInfo(req),
    metadata: {
        path: req.path,
        errorType: error?.message || 'unknown'
    }
});
```

## 📊 Consultas Úteis

### Eventos Mais Frequentes
```sql
SELECT event_type, COUNT(*) as total
FROM security_audit_logs
GROUP BY event_type
ORDER BY total DESC;
```

### Eventos da Última Hora
```sql
SELECT event_type, COUNT(*) as count
FROM security_audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type;
```

### IPs com Mais Tentativas Falhadas
```sql
SELECT ip_address, COUNT(*) as attempts
FROM security_audit_logs
WHERE event_type IN ('token_invalid', 'auth_failed', 'token_missing')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY attempts DESC
LIMIT 10;
```

## 🛠️ Manutenção

### Limpeza Periódica (Opcional)
Logs podem acumular ao longo do tempo. Considere criar um job para limpar logs antigos:

```sql
-- Exemplo: Deletar logs com mais de 90 dias
DELETE FROM security_audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Índices
A tabela já possui índices otimizados para:
- `event_type`: Consultas por tipo de evento
- `created_at`: Consultas temporais
- `user_id`: Consultas por usuário (apenas quando não NULL)

## ⚠️ Observações Importantes

1. **Falha Silenciosa**: Se houver erro ao salvar logs, o sistema não quebra (apenas loga um warning)
2. **Performance**: O logging é assíncrono e não bloqueia requisições
3. **Privacidade**: IPs são mascarados automaticamente
4. **Compliance**: Mantenha os logs conforme políticas de retenção de dados

## 📝 Arquivos Relacionados

- `backend/src/services/auditLogService.js`: Serviço de logging
- `backend/src/middleware/auth.js`: Middleware que usa o serviço
- `backend/migrations/`: Migrations SQL (criada diretamente no Supabase)
