#!/bin/bash

# Script para corrigir configuração do Supabase Auth
# Execute na VPS: bash fix-supabase-auth.sh

echo "🔧 Corrigindo configuração do Supabase Auth..."

cd /root/supabase-project

# Fazer backup do docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Verificar se a seção supabase-auth existe
if grep -q "supabase-auth:" docker-compose.yml; then
    echo "✅ Seção supabase-auth encontrada"
    
    # Verificar se GOTRUE_MAILER_AUTOCONFIRM já existe
    if grep -q "GOTRUE_MAILER_AUTOCONFIRM" docker-compose.yml; then
        echo "⚠️  GOTRUE_MAILER_AUTOCONFIRM já existe, atualizando..."
        sed -i 's/GOTRUE_MAILER_AUTOCONFIRM:.*/GOTRUE_MAILER_AUTOCONFIRM: '\''true'\''/' docker-compose.yml
    else
        echo "➕ Adicionando GOTRUE_MAILER_AUTOCONFIRM..."
        # Adicionar após a linha que contém "supabase-auth:"
        sed -i '/supabase-auth:/a\    environment:\n      GOTRUE_MAILER_AUTOCONFIRM: '\''true'\''\n      GOTRUE_SITE_URL: '\''http://31.97.164.208:8000'\''' docker-compose.yml
    fi
    
    echo "✅ Configuração atualizada"
    echo "🔄 Reiniciando container supabase-auth..."
    docker compose restart supabase-auth
    
    echo "✅ Pronto! Aguarde alguns segundos e teste novamente."
    echo ""
    echo "📋 Para ver os logs:"
    echo "   docker logs supabase-auth --tail 50"
else
    echo "❌ Seção supabase-auth não encontrada no docker-compose.yml"
    echo "   Verifique manualmente o arquivo"
fi
