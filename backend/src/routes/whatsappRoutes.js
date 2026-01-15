/**
 * Rotas WhatsApp/Evolution API
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    createInstance,
    getInstance,
    getQrCode,
    getStatus,
    getGroups,
    toggleGroupMonitor,
    getMonitoredGroups,
    deleteInstance
} from '../controllers/whatsappController.js';

const router = Router();

// Rotas autenticadas
router.use(authenticate);

router.post('/instance', createInstance);
router.get('/instance', getInstance);
router.get('/qrcode/:instanceId', getQrCode);
router.get('/status/:instanceId', getStatus);
router.get('/groups/:instanceId', getGroups);
router.post('/groups/monitor', toggleGroupMonitor);
router.get('/monitored-groups', getMonitoredGroups);
router.delete('/instance/:instanceId', deleteInstance);

export default router;
