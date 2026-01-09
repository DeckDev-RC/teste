import express from 'express';
import multer from 'multer';
import { analyzeFile, downloadRenamed } from '../controllers/analysisController.js';
import { validateRequest, analysisSchema } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'public/uploads/' });

// Rota de análise requer autenticação
router.post('/analyze', authenticate, upload.single('image'), validateRequest(analysisSchema), analyzeFile);
router.post('/download-renamed', upload.single('file'), downloadRenamed);

export default router;
