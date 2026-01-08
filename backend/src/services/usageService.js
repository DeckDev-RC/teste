import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE_FILE = path.join(__dirname, '../../data/usage.json');
const MONTHLY_LIMIT = 2500;

class UsageService {
    constructor() {
        this.usage = {
            count: 0,
            lastReset: new Date().toISOString()
        };
        this.init();
    }

    async init() {
        try {
            const dataDir = path.dirname(USAGE_FILE);
            try { await fs.access(dataDir); } catch { await fs.mkdir(dataDir, { recursive: true }); }

            try {
                const data = await fs.readFile(USAGE_FILE, 'utf8');
                this.usage = JSON.parse(data);
                this.checkReset();
            } catch (err) {
                await this.save();
            }
        } catch (error) {
            console.error('Erro ao inicializar UsageService:', error);
        }
    }

    checkReset() {
        const now = new Date();
        const lastReset = new Date(this.usage.lastReset);

        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            this.usage.count = 0;
            this.usage.lastReset = now.toISOString();
            this.save();
            return true;
        }
        return false;
    }

    async increment() {
        this.checkReset();
        if (this.usage.count >= MONTHLY_LIMIT) {
            throw new Error(`Limite mensal de ${MONTHLY_LIMIT} documentos atingido.`);
        }
        this.usage.count++;
        await this.save();
        return this.usage.count;
    }

    async getStats() {
        this.checkReset();
        return {
            count: this.usage.count,
            limit: MONTHLY_LIMIT,
            remaining: Math.max(0, MONTHLY_LIMIT - this.usage.count),
            percent: (this.usage.count / MONTHLY_LIMIT) * 100
        };
    }

    async reset() {
        this.usage.count = 0;
        this.usage.lastReset = new Date().toISOString();
        await this.save();
        return this.getStats();
    }

    async save() {
        try {
            await fs.writeFile(USAGE_FILE, JSON.stringify(this.usage, null, 2));
        } catch (error) {
            console.error('Erro ao salvar uso:', error);
        }
    }
}

export default new UsageService();
