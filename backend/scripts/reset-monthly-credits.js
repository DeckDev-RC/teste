/**
 * Script para resetar créditos mensalmente
 * Execute este script via cron job no primeiro dia de cada mês
 * 
 * Uso: node scripts/reset-monthly-credits.js
 */

import '../src/config/env.js';
import creditsService from '../src/services/creditsService.js';

async function resetCredits() {
    try {
        console.log('🔄 Iniciando reset de créditos mensais...');
        const count = await creditsService.resetMonthlyCredits();
        console.log(`✅ Reset concluído! ${count} registros processados.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao resetar créditos:', error);
        process.exit(1);
    }
}

resetCredits();
