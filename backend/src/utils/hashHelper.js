import crypto from 'crypto';

/**
 * Utilitário para geração de hashes de forma assíncrona
 */
class HashHelper {
    /**
     * Gera um hash SHA-256 de um buffer ou string de forma assíncrona
     * @param {Buffer|string} data - Dados para gerar o hash
     * @returns {Promise<string>} - Hash gerado
     */
    async generateHash(data) {
        return new Promise((resolve, reject) => {
            try {
                // Para dados pequenos, o processamento síncrono é muito rápido
                // Para dados maiores, poderíamos usar streams ou worker_threads
                // Aqui usamos setImmediate para permitir que o Event Loop processe outras tarefas
                setImmediate(() => {
                    const hash = crypto.createHash('sha256').update(data).digest('hex');
                    resolve(hash);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Gera um hash a partir de um Stream
     * @param {Stream} stream - Stream de dados
     * @returns {Promise<string>} - Hash gerado
     */
    async generateHashFromStream(stream) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
}

export default new HashHelper();
