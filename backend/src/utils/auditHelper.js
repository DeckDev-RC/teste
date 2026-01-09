/**
 * Utilitário para auditoria de respostas da IA
 */
class AuditHelper {
    /**
     * Analisa a resposta da IA em busca de alertas ou inconsistências
     * @param {any} analysis - Resultado da análise da IA (objeto ou string)
     * @returns {Array<string>} - Lista de alertas detectados
     */
    detectAlerts(analysis) {
        const alerts = [];

        if (!analysis) {
            alerts.push('Resposta da IA vazia');
            return alerts;
        }

        // Se for string (algumas IAs podem retornar texto puro se falhar o JSON)
        if (typeof analysis === 'string') {
            if (analysis.includes('ND')) alerts.push('Contém campos não encontrados (ND)');
            if (analysis.length < 10) alerts.push('Resposta suspeitosamente curta');
            return alerts;
        }

        // Se for objeto (JSON extraído)
        const checkObject = (obj) => {
            for (const key in obj) {
                const value = obj[key];

                // Verificar campos ND
                if (value === 'ND' || value === 'N/D' || value === 'Não encontrado') {
                    alerts.push(`Campo "${key}" não encontrado`);
                }

                // Verificar valores zerados suspeitos (ex: Valor total 0)
                if ((key.toLowerCase().includes('valor') || key.toLowerCase().includes('total')) &&
                    (value === 0 || value === '0' || value === '0,00' || value === '0.00')) {
                    alerts.push(`Campo "${key}" está com valor zero`);
                }

                // Recursão para objetos aninhados
                if (value && typeof value === 'object') {
                    checkObject(value);
                }
            }
        };

        checkObject(analysis);

        // Alertas de IA comuns no texto (caso o objeto tenha campos de comentário)
        const analysisString = JSON.stringify(analysis).toLowerCase();
        if (analysisString.includes('borrada') || analysisString.includes('ilegível') || analysisString.includes('baixa qualidade')) {
            alerts.push('IA detectou imagem de baixa qualidade/ilegível');
        }

        if (analysisString.includes('incerto') || analysisString.includes('provável') || analysisString.includes('possível erro')) {
            alerts.push('IA expressou incerteza sobre os dados extraídos');
        }

        return [...new Set(alerts)]; // Remover duplicatas
    }
}

export default new AuditHelper();
