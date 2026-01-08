import './src/config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar Rotas
import analysisRoutes from './src/routes/analysisRoutes.js';
import systemRoutes from './src/routes/systemRoutes.js';

// Configurações e Utilitários
import AIServiceFactory from './src/services/AIServiceFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Servir Frontend (Vite Build)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Rotas da API
app.use('/api', systemRoutes);
app.use('/api', analysisRoutes);

// Fallback para SPA (Frontend React)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Inicialização
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📂 Servindo frontend de: ${frontendDistPath}`);
});