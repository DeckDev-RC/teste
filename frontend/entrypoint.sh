#!/bin/sh

# Entrypoint para configurar nginx.conf com variáveis de ambiente
# Permite configurar o nome do serviço backend dinamicamente

# Default values
BACKEND_SERVICE_NAME=${BACKEND_SERVICE_NAME:-api}
BACKEND_PORT=${BACKEND_PORT:-3001}
SUPABASE_UPSTREAM=${SUPABASE_UPSTREAM:-http://31.97.164.208:8000}

echo "🔧 Configurando Nginx..."
echo "   Backend Service: ${BACKEND_SERVICE_NAME}:${BACKEND_PORT}"
echo "   Supabase: ${SUPABASE_UPSTREAM}"

# Substituir variáveis no nginx.conf usando envsubst
# Se envsubst não estiver disponível, usar sed como fallback
if command -v envsubst > /dev/null 2>&1; then
    envsubst '${BACKEND_SERVICE_NAME} ${BACKEND_PORT} ${SUPABASE_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
else
    # Fallback usando sed
    sed -i "s|BACKEND_SERVICE_NAME|${BACKEND_SERVICE_NAME}|g" /etc/nginx/conf.d/default.conf
    sed -i "s|BACKEND_PORT|${BACKEND_PORT}|g" /etc/nginx/conf.d/default.conf
    sed -i "s|SUPABASE_UPSTREAM|${SUPABASE_UPSTREAM}|g" /etc/nginx/conf.d/default.conf
fi

echo "✅ Nginx configurado!"

# Testar configuração do nginx
nginx -t

# Iniciar nginx
exec nginx -g "daemon off;"
