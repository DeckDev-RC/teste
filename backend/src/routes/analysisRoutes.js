import express from 'express';
import multer from 'multer';
import { analyzeFile, downloadRenamed, getPendingExport, markAsExported } from '../controllers/analysisController.js';
import { validateRequest, analysisSchema } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'public/uploads/' });

// Rota de análise requer autenticação
router.post('/analyze', authenticate, upload.single('image'), validateRequest(analysisSchema), analyzeFile);
router.post('/download-renamed', upload.single('file'), downloadRenamed);

// Rotas de Exportação ZIP
router.get('/pending-export', authenticate, getPendingExport);
router.post('/mark-exported', authenticate, markAsExported);

export default router;
