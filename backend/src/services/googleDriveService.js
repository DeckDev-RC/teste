import { google } from 'googleapis';
import stream from 'stream';
import './env.js';

class GoogleDriveService {
    constructor() {
        this.clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
        this.privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        this.auth = null;
        this.drive = null;

        if (this.clientEmail && this.privateKey) {
            this.init();
        } else {
            console.warn('⚠️ Google Drive Service: Credenciais incompletas no .env');
        }
    }

    init() {
        try {
            this.auth = new google.auth.JWT(
                this.clientEmail,
                null,
                this.privateKey,
                ['https://www.googleapis.com/auth/drive.file']
            );
            this.drive = google.drive({ version: 'v3', auth: this.auth });
            console.log('🚀 Google Drive Service inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar Google Drive:', error.message);
        }
    }

    /**
     * Faz upload de um arquivo para o Google Drive
     * @param {string} base64Conteudo - Conteúdo do arquivo em base64
     * @param {string} nomeArquivo - Nome do arquivo no Drive
     * @param {string} mimetype - Tipo MIME do arquivo
     * @returns {Promise<{success: boolean, fileId: string, webViewLink: string}>}
     */
    async uploadFile(base64Conteudo, nomeArquivo, mimetype) {
        if (!this.drive) {
            return { success: false, error: 'Serviço não inicializado' };
        }

        try {
            // Converte base64 para stream
            const buffer = Buffer.from(base64Conteudo, 'base64');
            const bufferStream = new stream.PassThrough();
            bufferStream.end(buffer);

            const fileMetadata = {
                name: nomeArquivo,
                parents: [this.folderId]
            };

            const media = {
                mimeType: mimetype,
                body: bufferStream
            };

            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink'
            });

            // Torna o arquivo público para visualização (opcional, dependendo do requisito)
            // await this.drive.permissions.create({
            //     fileId: response.data.id,
            //     resource: {
            //         role: 'reader',
            //         type: 'anyone'
            //     }
            // });

            return {
                success: true,
                fileId: response.data.id,
                webViewLink: response.data.webViewLink
            };
        } catch (error) {
            console.error(`❌ Erro no upload para Drive (${nomeArquivo}):`, error.message);
            return { success: false, error: error.message };
        }
    }
}

export default new GoogleDriveService();
