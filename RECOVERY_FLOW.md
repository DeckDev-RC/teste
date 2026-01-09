# Fluxo de Recuperação de Senha - Documentação

## ✅ Correções Aplicadas

### 1. RecoveryPage.jsx Melhorado
- ✅ Detecta token de recuperação no hash (`#access_token=...&type=recovery`)
- ✅ Processa o token automaticamente
- ✅ Valida senha (mínimo 6 caracteres)
- ✅ Verifica sessão antes de atualizar senha
- ✅ Limpa hash da URL após sucesso
- ✅ Redireciona para login após atualizar senha

### 2. App.jsx Ajustado
- ✅ Permite acesso à página `/recovery` mesmo com sessão ativa
- ✅ Necessário para processar tokens de recuperação

## 🔄 Fluxo Completo

### Passo 1: Solicitar Recuperação
1. Usuário acessa `/recovery`
2. Digita o email
3. Clica em "Enviar Link de Recuperação"
4. Email é enviado com link: `http://31.97.164.208:8000/auth/v1/verify?token=...&type=recovery&redirect_to=http://localhost:5173/recovery`

### Passo 2: Clicar no Link do Email
1. Usuário clica no link do email
2. Supabase verifica o token
3. Redireciona para: `http://localhost:5173/recovery#access_token=...&type=recovery`

### Passo 3: Redefinir Senha
1. RecoveryPage detecta o token no hash
2. Mostra formulário "Nova Senha"
3. Usuário digita nova senha (mín. 6 caracteres)
4. Clica em "Definir Nova Senha"
5. Senha é atualizada
6. Hash é limpo da URL
7. Redireciona para `/login` após 1 segundo

## 🧪 Como Testar

1. **Solicitar recuperação:**
   ```
   Acesse: http://localhost:5173/recovery
   Digite seu email
   Clique em "Enviar Link de Recuperação"
   ```

2. **Verificar email:**
   - Abra o email (pode estar em spam)
   - Clique no link de recuperação

3. **Redefinir senha:**
   - Você será redirecionado para `/recovery` com o token
   - A tela deve mostrar "Nova Senha"
   - Digite a nova senha
   - Clique em "Definir Nova Senha"
   - Você será redirecionado para `/login`

## ⚠️ Problemas Comuns

### Link não redireciona corretamente
- Verifique se `SITE_URL` e `API_EXTERNAL_URL` estão corretos no `.env` da VPS
- Verifique se o `redirectTo` no `resetPasswordForEmail` está usando `window.location.origin`

### Token expirado
- Tokens de recuperação expiram após 1 hora (padrão)
- Solicite um novo link se o token expirar

### Não mostra formulário de nova senha
- Verifique o console do navegador para erros
- Verifique se o hash contém `type=recovery`
- Verifique se o token não expirou

## 📋 Configurações Importantes

### No .env da VPS:
```env
SITE_URL=http://31.97.164.208:8000
API_EXTERNAL_URL=http://31.97.164.208:8000
```

### No frontend:
- `redirectTo` usa `window.location.origin` (correto para desenvolvimento)
- Para produção, pode usar variável de ambiente

## ✅ Status

- ✅ Solicitar recuperação - Funcionando
- ✅ Enviar email - Funcionando (pode ir para spam)
- ✅ Processar token - Funcionando
- ✅ Redefinir senha - Funcionando
- ✅ Redirecionar para login - Funcionando
