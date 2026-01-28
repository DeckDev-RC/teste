import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { COMPANIES } from './src/config/prompts.js';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontrados no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log('🚀 Iniciando migração de empresas...');

    const companiesToInsert = Object.entries(COMPANIES).map(([id, config]) => ({
        id: id,
        name: config.name,
        icon: config.icon || 'Building2',
        financial_receipt_prompt: config.FINANCIAL?.RECEIPT || '',
        financial_payment_prompt: config.FINANCIAL?.PAYMENT || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));

    console.log(`📦 Preparadas ${companiesToInsert.length} empresas para migração.`);

    for (const company of companiesToInsert) {
        process.stdout.write(`  - Migrando: ${company.name}... `);

        const { error } = await supabase
            .from('companies')
            .upsert(company, { onConflict: 'id' });

        if (error) {
            console.log('❌ FALHOU');
            console.error(error);
        } else {
            console.log('✅ OK');
        }
    }

    console.log('\n✨ Migração concluída com sucesso!');
}

migrate();
