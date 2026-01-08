# Backend - Leitor de Documentos BPO
FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema para canvas/sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

# Copiar apenas arquivos de dependências primeiro (para cache)
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código do backend
COPY backend/ ./backend/

# Criar diretório de dados
RUN mkdir -p backend/data

# Expor porta
EXPOSE 3001

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3001

# Comando de inicialização
CMD ["node", "backend/server.js"]
