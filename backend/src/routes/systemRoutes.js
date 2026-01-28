import express from 'express';
import { getProviders, getStats, getCompanies, setDefaultProvider, resetUsage, getUserCredits } from '../controllers/systemController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/providers', getProviders);
router.get('/stats', getStats);
router.get('/companies', authenticate, getCompanies);

router.get('/credits', authenticate, getUserCredits); // Requer autenticação
router.post('/providers/default', express.json(), setDefaultProvider);
router.post('/usage/reset', resetUsage); // DEV ONLY

export default router;
