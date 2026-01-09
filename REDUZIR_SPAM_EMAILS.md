# Como Reduzir Emails Indo para Spam

## ✅ Melhorias Aplicadas

1. **Nome do remetente corrigido:**
   - Antes: `Leitor_de_Docs` (underscore pode ser problemático)
   - Agora: `Leitor de Docs` (espaços são melhores)

2. **Configurações adicionais:**
   - `GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=true` adicionado

## 🔧 Soluções Adicionais

### 1. Recriar Container Auth (para aplicar mudanças)

Execute na VPS:

```bash
cd /root/supabase-project
docker compose up -d --force-recreate auth
```

### 2. Configurar SPF no DNS (Recomendado)

Adicione um registro SPF no DNS do domínio `agregarnegocios.com.br`:

**Tipo:** TXT  
**Nome:** @ (ou agregarnegocios.com.br)  
**Valor:** `v=spf1 include:_spf.google.com ~all`

Isso autoriza o Gmail a enviar emails em nome do seu domínio.

### 3. Configurar DKIM no DNS (Opcional, mais complexo)

O Gmail já tem DKIM configurado, mas você pode adicionar um registro adicional.

### 4. Verificar Senha de App do Gmail

Certifique-se de que a senha de app está correta:
- Acesse: https://myaccount.google.com/apppasswords
- Gere uma nova senha de app se necessário
- Use essa senha no `SMTP_PASS`

### 5. Melhorar Reputação do Email

**Ações imediatas:**
- Marque os emails como "Não é spam" no Gmail
- Responda aos emails (se aplicável)
- Envie emails regularmente (não apenas uma vez)

**Ações a longo prazo:**
- Configure SPF/DKIM (item 2)
- Use um domínio verificado
- Considere usar um serviço profissional (SendGrid, Mailgun, AWS SES)

### 6. Usar Serviço de Email Profissional (Recomendado para Produção)

Para produção, considere usar:
- **SendGrid** (gratuito até 100 emails/dia)
- **Mailgun** (gratuito até 5.000 emails/mês)
- **AWS SES** (muito barato, $0.10 por 1.000 emails)

Vantagens:
- Melhor deliverability
- Analytics de abertura/cliques
- Templates profissionais
- Menos chance de ir para spam

## 📋 Configuração Atual

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=consultores@agregarnegocios.com.br
SMTP_PASS=wnisrbchkeajmhsv
SMTP_SENDER_NAME=Leitor de Docs
SMTP_ADMIN_EMAIL=consultores@agregarnegocios.com.br
```

## ⚠️ Importante

1. **Primeiros emails sempre vão para spam** - isso é normal
2. **Marque como "Não é spam"** - ajuda a melhorar a reputação
3. **SPF é essencial** - configure no DNS se possível
4. **Para produção**, considere um serviço profissional

## 🧪 Teste

Após aplicar as mudanças:
1. Recrie o container auth
2. Solicite um novo email de recuperação
3. Verifique se ainda vai para spam
4. Se sim, marque como "Não é spam" e configure SPF
