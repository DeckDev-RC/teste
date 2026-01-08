import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Busca o .env na raiz do projeto (um nível acima da pasta backend)
const envPath = path.resolve(__dirname, '../../../.env');

const result = dotenv.config({ path: envPath });

if (result.error) {
    // Fallback para o caminho padrão se o resolve falhar por algum motivo
    dotenv.config();
}

console.log('🌍 Ambiente carregado de:', envPath);
