#!/bin/bash

# Script para corrigir erro 500 no signup do Supabase
# Execute na VPS: bash fix-auth-500.sh

echo "🔍 Verificando configuração do Supabase Auth..."

cd /root/supabase-project

# 1. Verificar nome do serviço de auth
echo ""
echo "📋 Serviços disponíveis:"
docker compose ps | grep -i auth

# 2. Verificar se .env existe
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  Arquivo .env não encontrado. Criando..."
    touch .env
fi

# 3. Verificar/Adicionar ENABLE_EMAIL_AUTOCONFIRM
if grep -q "ENABLE_EMAIL_AUTOCONFIRM" .env; then
    echo ""
    echo "✅ ENABLE_EMAIL_AUTOCONFIRM já existe, atualizando para true..."
    sed -i 's/ENABLE_EMAIL_AUTOCONFIRM=.*/ENABLE_EMAIL_AUTOCONFIRM=true/' .env
else
    echo ""
    echo "➕ Adicionando ENABLE_EMAIL_AUTOCONFIRM=true ao .env..."
    echo "ENABLE_EMAIL_AUTOCONFIRM=true" >> .env
fi

# 4. Verificar/Adicionar ENABLE_EMAIL_SIGNUP
if grep -q "ENABLE_EMAIL_SIGNUP" .env; then
    echo "✅ ENABLE_EMAIL_SIGNUP já existe, atualizando para true..."
    sed -i 's/ENABLE_EMAIL_SIGNUP=.*/ENABLE_EMAIL_SIGNUP=true/' .env
else
    echo "➕ Adicionando ENABLE_EMAIL_SIGNUP=true ao .env..."
    echo "ENABLE_EMAIL_SIGNUP=true" >> .env
fi

# 5. Verificar/Adicionar GOTRUE_SITE_URL
if grep -q "GOTRUE_SITE_URL" .env; then
    echo "✅ GOTRUE_SITE_URL já existe"
else
    echo "➕ Adicionando GOTRUE_SITE_URL ao .env..."
    echo "GOTRUE_SITE_URL=http://31.97.164.208:8000" >> .env
fi

echo ""
echo "📄 Conteúdo do .env relacionado ao Auth:"
grep -E "ENABLE_EMAIL|GOTRUE_SITE" .env || echo "Nenhuma configuração encontrada"

echo ""
echo "🔄 Reiniciando serviços..."

# Tentar diferentes nomes de serviço
if docker compose ps | grep -q "auth"; then
    SERVICE_NAME=$(docker compose ps | grep -i auth | awk '{print $1}' | head -1)
    echo "   Reiniciando serviço: $SERVICE_NAME"
    docker compose restart $SERVICE_NAME 2>/dev/null || docker restart $SERVICE_NAME
elif docker compose ps | grep -q "gotrue"; then
    SERVICE_NAME=$(docker compose ps | grep -i gotrue | awk '{print $1}' | head -1)
    echo "   Reiniciando serviço: $SERVICE_NAME"
    docker compose restart $SERVICE_NAME 2>/dev/null || docker restart $SERVICE_NAME
else
    echo "   Reiniciando todos os serviços..."
    docker compose restart
fi

echo ""
echo "⏳ Aguardando 5 segundos..."
sleep 5

echo ""
echo "📋 Últimos logs do Auth (últimas 20 linhas):"
docker compose logs --tail 20 auth 2>/dev/null || \
docker compose logs --tail 20 gotrue 2>/dev/null || \
docker logs supabase-auth --tail 20 2>/dev/null || \
echo "   Não foi possível obter logs. Verifique manualmente com: docker logs <nome-do-container-auth>"

echo ""
echo "✅ Concluído!"
echo ""
echo "🧪 Teste o cadastro novamente no frontend."
echo "📋 Se ainda houver erro, veja os logs completos com:"
echo "   docker logs <nome-do-container-auth> --tail 50"
