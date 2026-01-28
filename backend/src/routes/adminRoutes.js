/**
 * Rotas administrativas (master/admin only)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMaster } from '../middleware/admin.js';
import {
    getAllUsersCredits,
    resetUserCredits,
    addUserCredits,
    setUserRole,
    setUserCompanies,
    getAllUsers
} from '../controllers/adminController.js';

const router = express.Router();

// Todas as rotas requerem autenticação E permissão de master/admin
router.use(authenticate);
router.use(requireMaster);

// Rotas administrativas
router.get('/users', getAllUsers); // Listar todos os usuários
router.get('/users/credits', getAllUsersCredits); // Listar créditos de todos os usuários
router.post('/users/:userId/credits/reset', express.json(), resetUserCredits); // Resetar créditos de um usuário
router.post('/users/:userId/credits/add', express.json(), addUserCredits); // Adicionar créditos a um usuário
router.put('/users/:userId/role', express.json(), setUserRole); // Definir role de um usuário
router.put('/users/:userId/companies', express.json(), setUserCompanies); // Definir empresas permitidas

export default router;
