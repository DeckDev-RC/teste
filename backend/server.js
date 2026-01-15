import './src/config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar Rotas
import analysisRoutes from './src/routes/analysisRoutes.js';
import systemRoutes from './src/routes/systemRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import whatsappRoutes from './src/routes/whatsappRoutes.js';

// Middlewares de Segurança
import { securityHeaders, apiRateLimiter } from './src/middleware/security.js';

// Configurações e Utilitários
import AIServiceFactory from './src/services/AIServiceFactory.js';
import messageProcessor from './src/services/messageProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializa o processador de mensagens
messageProcessor.start();

// Configurar trust proxy para express-rate-limit (necessário por estar atrás do Traefik/Easypanel)
app.set('trust proxy', 1);

// CORS Configuration - Permite requisições do frontend
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middlewares de Segurança (aplicar primeiro)
app.use(securityHeaders);
app.use(apiRateLimiter);

// Middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Limite aumentado para webhooks com mídia base64
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Rotas da API
app.use('/api', systemRoutes);
app.use('/api', analysisRoutes);
app.use('/api/admin', adminRoutes); // Rotas administrativas (master/admin only)
app.use('/api/dashboard', dashboardRoutes); // Rotas do dashboard (master/admin only)
app.use('/api/user', userRoutes); // Rotas do dashboard do usuário
app.use('/api/whatsapp', whatsappRoutes); // Rotas WhatsApp/Evolution

// Health check para Easypanel
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Em produção, o frontend é servido pelo container separado
// Em desenvolvimento, usa-se o proxy do Vite
if (process.env.NODE_ENV !== 'production') {
  const frontendDistPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Inicialização
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
  console.log(`🌍 CORS habilitado para: ${corsOptions.origin}`);
  console.log(`📦 Modo: ${process.env.NODE_ENV || 'development'}`);
});