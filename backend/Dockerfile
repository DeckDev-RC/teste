# Backend - Leitor de Documentos BPO
FROM node:20-slim

WORKDIR /app

# Instalar dependências do sistema para canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json
COPY package.json ./

# Instalar dependências
RUN npm install --omit=dev

# Copiar código fonte
COPY src/ ./src/
COPY server.js ./

# Criar diretório de dados
RUN mkdir -p data

# Expor porta
EXPOSE 3001

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3001

# Comando de inicialização
CMD ["node", "server.js"]
