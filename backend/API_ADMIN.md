# 🔐 API Administrativa - Usuário Master

## 📋 Endpoints Disponíveis

Todas as rotas requerem:
- ✅ Autenticação (token JWT)
- ✅ Permissão de master ou admin

**Base URL:** `/api/admin`

---

## 🔑 Autenticação

Todas as requisições devem incluir o header:
```
Authorization: Bearer <JWT_TOKEN>
```

O token deve ser de um usuário com `role = 'master'` ou `role = 'admin'` na tabela `profiles`.

---

## 📊 Endpoints

### 1. **Listar Todos os Usuários**
```http
GET /api/admin/users
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "usuario@exemplo.com",
        "full_name": "Nome Completo",
        "role": "user",
        "created_at": "2026-01-09T...",
        "updated_at": "2026-01-09T..."
      }
    ]
  }
}
```

---

### 2. **Listar Créditos de Todos os Usuários**
```http
GET /api/admin/users/credits
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "month": "2026-01",
    "users": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "credits_used": 100,
        "credits_limit": 2500,
        "month_year": "2026-01",
        "profiles": {
          "id": "uuid",
          "email": "usuario@exemplo.com",
          "full_name": "Nome",
          "role": "user"
        }
      }
    ]
  }
}
```

---

### 3. **Resetar Créditos de um Usuário**
```http
POST /api/admin/users/:userId/credits/reset
Content-Type: application/json

{
  "month": "2026-01"  // Opcional: mês específico (padrão: mês atual)
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Créditos resetados para o usuário no mês 2026-01",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "credits_used": 0,
    "credits_limit": 2500,
    "month_year": "2026-01"
  }
}
```

---

### 4. **Adicionar Créditos a um Usuário**
```http
POST /api/admin/users/:userId/credits/add
Content-Type: application/json

{
  "amount": 500  // Quantidade de créditos a adicionar
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "500 créditos adicionados ao usuário",
  "data": {
    "id": "uuid",
    "credits_limit": 3000,  // 2500 + 500
    "credits_used": 100,
    "credits_remaining": 2900
  }
}
```

---

### 5. **Definir Role de um Usuário**
```http
PUT /api/admin/users/:userId/role
Content-Type: application/json

{
  "role": "admin"  // "user", "admin" ou "master"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Role do usuário atualizado para: admin",
  "data": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "role": "admin"
  }
}
```

---

## 🛡️ Segurança

### Verificação de Permissões

O middleware `requireMaster` verifica:
1. ✅ Usuário está autenticado
2. ✅ Usuário existe na tabela `profiles`
3. ✅ Role do usuário é `'master'` ou `'admin'`

### Roles Disponíveis

- **`user`** - Usuário comum (padrão)
- **`admin`** - Administrador (pode gerenciar usuários e créditos)
- **`master`** - Master (acesso total ao sistema)

---

## 📝 Exemplos de Uso

### Exemplo 1: Listar Todos os Usuários
```bash
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Exemplo 2: Resetar Créditos de um Usuário
```bash
curl -X POST http://localhost:3001/api/admin/users/abc-123/credits/reset \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"month": "2026-01"}'
```

### Exemplo 3: Adicionar 1000 Créditos
```bash
curl -X POST http://localhost:3001/api/admin/users/abc-123/credits/add \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

### Exemplo 4: Tornar Usuário Admin
```bash
curl -X PUT http://localhost:3001/api/admin/users/abc-123/role \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

---

## ⚠️ Importante

1. **Apenas master/admin** podem acessar essas rotas
2. **SERVICE_KEY** é usada internamente para bypass RLS
3. **Logs não expõem** informações sensíveis
4. **Validação** de dados em todas as rotas

---

## 🔧 Configuração Inicial

Execute o SQL em `backend/CRIAR_USUARIO_MASTER.sql` para:
1. Adicionar coluna `role` na tabela `profiles`
2. Criar função `is_master_user()`
3. Definir usuário como master
