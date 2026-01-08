/**
 * Utilitário centralizado para parsing e formatação de dados de comprovantes
 * Consolida a lógica de negócio que estava duplicada em múltiplos serviços
 */

class ReceiptParser {
    /**
     * Extrai a data do nome do arquivo no formato DD-MM
     * @param {string} fileName - Nome do arquivo
     * @returns {string|null} Data no formato DD-MM ou null se não encontrada
     */
    extractDateFromFileName(fileName) {
        if (!fileName) return null;

        // Remove a extensão do arquivo
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

        // Padrão específico para o formato "DD-MM VENDA DINHEIRO VALOR.jpg"
        const specificPattern = /^(\d{1,2})[-_\/](\d{1,2})\s+VENDA\s+DINHEIRO/i;
        const specificMatch = fileNameWithoutExt.match(specificPattern);

        if (specificMatch) {
            const day = specificMatch[1].padStart(2, '0');
            const month = specificMatch[2].padStart(2, '0');
            return `${day}-${month}`;
        }

        // Tenta encontrar padrão no início: DD-MM, DD/MM, DD_MM
        const startPattern = /^(\d{1,2})[-_\/](\d{1,2})/;
        const startMatch = fileNameWithoutExt.match(startPattern);

        if (startMatch) {
            const day = parseInt(startMatch[1], 10);
            const month = parseInt(startMatch[2], 10);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`;
            }
        }

        // Procura em qualquer lugar: DD-MM, DD/MM, DD_MM
        const anywherePattern = /(\d{1,2})[-_\/](\d{1,2})/g;
        const matches = [...fileNameWithoutExt.matchAll(anywherePattern)];
        for (const match of matches) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`;
            }
        }

        // Último recurso: dois números próximos
        const numbersPattern = /(\d{1,2})\D{0,3}(\d{1,2})/;
        const numbersMatch = fileNameWithoutExt.match(numbersPattern);
        if (numbersMatch) {
            const num1 = parseInt(numbersMatch[1], 10);
            const num2 = parseInt(numbersMatch[2], 10);
            if (num1 >= 1 && num1 <= 31 && num2 >= 1 && num2 <= 12) {
                return `${num1.toString().padStart(2, '0')}-${num2.toString().padStart(2, '0')}`;
            } else if (num2 >= 1 && num2 <= 31 && num1 >= 1 && num1 <= 12) {
                return `${num2.toString().padStart(2, '0')}-${num1.toString().padStart(2, '0')}`;
            }
        }

        return null;
    }

    /**
     * Extrai a descrição entre parênteses ou sinais de + do nome do arquivo
     */
    extractDescriptionFromFileName(fileName) {
        if (!fileName) return null;
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

        const plusPattern = /\+([^+]+)\+/g;
        const plusMatches = [...fileNameWithoutExt.matchAll(plusPattern)];
        if (plusMatches.length > 0 && plusMatches[0][1]) {
            return plusMatches[0][1].trim();
        }

        const descriptionPattern = /\(([^)]+)\)/;
        const descriptionMatch = fileNameWithoutExt.match(descriptionPattern);
        if (descriptionMatch && descriptionMatch[1]) {
            return descriptionMatch[1].trim();
        }
        return null;
    }

    /**
     * Formata um valor monetário para o padrão brasileiro (XXX,XX)
     */
    formatarValor(valor) {
        if (!valor) return '0,00';
        let v = valor.toString();

        if (v.includes('.') && v.includes(',')) {
            v = v.replace(/\./g, '').replace(',', '.');
        } else if (v.includes(',')) {
            v = v.replace(',', '.');
        }

        const numero = parseFloat(v);
        if (!isNaN(numero)) {
            return numero.toFixed(2).replace('.', ',');
        }

        return valor.includes(',') ? valor : valor + ',00';
    }

    /**
     * Regras estritas de formatação por empresa
     */
    formatReceiptDataStrict(rawData, fileName = null, company = 'enia-marcia-joias') {
        let formatted = rawData.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (formatted.toLowerCase().includes('erro')) return 'ERRO';

        const fileDate = this.extractDateFromFileName(fileName);
        const fileDescription = this.extractDescriptionFromFileName(fileName);

        // RAQUEL LUC - Especialista em Dinheiro
        if (company === 'raquel-luc') {
            const isDinheiro = formatted.toLowerCase().includes('dinheiro') ||
                formatted.toLowerCase().includes('espécie') ||
                (fileName && fileName.toLowerCase().includes('dinheiro'));

            if (isDinheiro && fileDate) {
                let valor = 'ND';
                const detailedPattern = /=\s*R\$\s*([\d]{1,3}(?:[.,]\d{1,2})?)/i;
                const detailedMatch = formatted.match(detailedPattern);

                if (detailedMatch) {
                    valor = this.formatarValor(detailedMatch[1]);
                } else {
                    const valorPattern = /\b([\d]{1,3}(?:[.,]\d{1,2})?)\b/g;
                    const allValues = [...formatted.matchAll(valorPattern)].map(match => match[1]);
                    const monetaryValues = allValues.filter(val => !val.match(/^\d{1,2}[-\/]\d{1,2}$/));
                    if (monetaryValues.length > 0) {
                        valor = this.formatarValor(monetaryValues[monetaryValues.length - 1]);
                    }
                }
                return `${fileDate} VENDA DINHEIRO ${valor}`;
            }
        }

        // FLIPER - Formato específico: DATA NOME (DESCRIÇÃO) VALOR
        if (company === 'fliper') {
            const datePattern = /DATA:?\s*(\d{1,2})[-\/](\d{1,2})/i;
            const dateMatch = formatted.match(datePattern);
            const valorPattern = /VALOR:?\s*(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;
            const valorMatch = formatted.match(valorPattern);
            const nomePattern = /(?:NOME|BENEFICI[AÁ]RIO):?\s*([^\n\r\d]+)/i;
            const nomeMatch = formatted.match(nomePattern);

            if (dateMatch && valorMatch && (nomeMatch || fileDescription)) {
                const date = `${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
                const nome = nomeMatch ? nomeMatch[1].trim().split(' ')[0] : 'ND';
                const valor = this.formatarValor(valorMatch[1]);
                const desc = fileDescription ? `(${fileDescription}) ` : '';
                return `${date} ${nome} ${desc}${valor}`;
            }
        }

        // Padrão Genérico de Venda
        const genericPattern = /(\d{1,2}[-\/]\d{1,2})\s+VENDA\s+(\w+)\s+(.+?)\s+([\d.,]+)$/i;
        const genericMatch = formatted.match(genericPattern);
        if (genericMatch) {
            const date = genericMatch[1].replace('/', '-').split('-').map(s => s.padStart(2, '0')).join('-');
            return `${date} VENDA ${genericMatch[2]} ${genericMatch[3].trim()} ${this.formatarValor(genericMatch[4])}`;
        }

        return formatted || 'ERRO';
    }
}

export default new ReceiptParser();
