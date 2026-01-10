/**
 * Verificador de senhas comprometidas usando HaveIBeenPwned API
 * Usa k-anonymity: apenas os 5 primeiros caracteres do hash SHA-1 são enviados
 */

/**
 * Verifica se uma senha foi exposta em vazamentos de dados
 * @param {string} password - Senha a verificar
 * @returns {Promise<{compromised: boolean, count: number}>}
 */
export async function checkPasswordPwned(password) {
    try {
        // Calcula hash SHA-1 da senha
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);

        // Converte para hexadecimal uppercase
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        // K-anonymity: envia apenas os 5 primeiros caracteres
        const prefix = hashHex.substring(0, 5);
        const suffix = hashHex.substring(5);

        // Consulta a API do HIBP
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: {
                'User-Agent': 'LeitorDocsBPO-PasswordCheck'
            }
        });

        if (!response.ok) {
            // Em caso de erro, permite continuar (fail-open para não bloquear cadastro)
            console.warn('HIBP API error:', response.status);
            return { compromised: false, count: 0, error: true };
        }

        const text = await response.text();

        // Procura o sufixo do hash na resposta
        // Formato: SUFFIX:COUNT
        const lines = text.split('\n');
        for (const line of lines) {
            const [hashSuffix, count] = line.split(':');
            if (hashSuffix.trim() === suffix) {
                return {
                    compromised: true,
                    count: parseInt(count.trim(), 10)
                };
            }
        }

        return { compromised: false, count: 0 };
    } catch (error) {
        console.error('Erro ao verificar senha:', error);
        // Fail-open: permite continuar em caso de erro de rede
        return { compromised: false, count: 0, error: true };
    }
}

/**
 * Formata mensagem de aviso sobre senha comprometida
 * @param {number} count - Número de vezes que a senha apareceu em vazamentos
 * @returns {string}
 */
export function formatPwnedMessage(count) {
    if (count >= 1000000) {
        return `Esta senha foi exposta em mais de ${Math.floor(count / 1000000)} milhões de vazamentos de dados. Por favor, escolha outra.`;
    } else if (count >= 1000) {
        return `Esta senha foi exposta em mais de ${Math.floor(count / 1000)} mil vazamentos de dados. Por favor, escolha outra.`;
    } else {
        return `Esta senha foi exposta em ${count} vazamentos de dados. Por favor, escolha outra.`;
    }
}
