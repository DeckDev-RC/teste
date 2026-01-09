# 👑 Sistema de Usuário Master - Resumo

## ✅ O que foi implementado

### 1. **Coluna `role` na tabela `profiles`**
- ✅ Adicionada coluna `role` com valores: `'user'`, `'admin'`, `'master'`
- ✅ Valor padrão: `'user'`
- ✅ Constraint CHECK para validar valores

### 2. **Usuário Master Configurado**
- ✅ Usuário `renatoagregar@gmail.com` definido como `master`
- ✅ Pode acessar todas as rotas administrativas

### 3. **Função PostgreSQL**
- ✅ `is_master_user(user_id)` - Verifica se usuário é master/admin

### 4. **Middleware de Segurança**
- ✅ `requireMaster` - Bloqueia acesso se não for master/admin
- ✅ `optionalMaster` - Verifica mas não bloqueia

### 5. **Rotas Administrativas**
- ✅ `/api/admin/users` - Listar todos os usuários
- ✅ `/api/admin/users/credits` - Listar créditos de todos
- ✅ `/api/admin/users/:userId/credits/reset` - Resetar créditos
- ✅ `/api/admin/users/:userId/credits/add` - Adicionar créditos
- ✅ `/api/admin/users/:userId/role` - Definir role

---

## 🔑 Como Usar

### Tornar um Usuário Master

**Via SQL:**
```sql
UPDATE public.profiles 
SET role = 'master' 
WHERE email = 'seu-email@exemplo.com';
```

**Via API (se já for master/admin):**
```bash
PUT /api/admin/users/:userId/role
{
  "role": "master"
}
```

### Acessar Rotas Admin

```bash
# Exemplo: Listar todos os usuários
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <JWT_TOKEN_DO_MASTER>"
```

---

## 📋 Roles Disponíveis

- **`user`** - Usuário comum (padrão)
  - Acesso normal ao sistema
  - Pode analisar documentos (se tiver créditos)

- **`admin`** - Administrador
  - Pode gerenciar usuários
  - Pode resetar/adicionar créditos
  - Acesso a rotas `/api/admin/*`

- **`master`** - Master
  - Acesso total ao sistema
  - Todas as permissões de admin
  - Pode definir roles de outros usuários

---

## 🛡️ Segurança

- ✅ Todas as rotas admin requerem autenticação
- ✅ Verificação de role no middleware
- ✅ SERVICE_KEY usada apenas internamente
- ✅ Logs não expõem dados sensíveis

---

## 📝 Arquivos Criados

- `backend/src/middleware/admin.js` - Middleware de verificação
- `backend/src/controllers/adminController.js` - Controllers admin
- `backend/src/routes/adminRoutes.js` - Rotas admin
- `backend/CRIAR_USUARIO_MASTER.sql` - Script SQL
- `backend/API_ADMIN.md` - Documentação da API

---

## ✅ Status Atual

- ✅ Coluna `role` criada
- ✅ Usuário `renatoagregar@gmail.com` é **master**
- ✅ Rotas admin funcionando
- ✅ Middleware de segurança implementado

**Pronto para usar!** 🎉
