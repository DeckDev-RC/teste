import express from 'express';
import { getProviders, getStats, getCompanies, setDefaultProvider, resetUsage } from '../controllers/systemController.js';

const router = express.Router();

router.get('/providers', getProviders);
router.get('/stats', getStats);
router.get('/companies', getCompanies);
router.post('/providers/default', express.json(), setDefaultProvider);
router.post('/usage/reset', resetUsage); // DEV ONLY

export default router;
