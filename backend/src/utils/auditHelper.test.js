/**
 * Testes unitários para AuditHelper
 */
import auditHelper from './auditHelper.js';

describe('AuditHelper', () => {
    describe('detectAlerts', () => {
        test('retorna alerta para resposta vazia/null', () => {
            const alerts = auditHelper.detectAlerts(null);
            expect(alerts).toContain('Resposta da IA vazia');
        });

        test('retorna alerta para resposta undefined', () => {
            const alerts = auditHelper.detectAlerts(undefined);
            expect(alerts).toContain('Resposta da IA vazia');
        });

        test('detecta campos ND em string', () => {
            const alerts = auditHelper.detectAlerts('Valor: ND');
            expect(alerts).toContain('Contém campos não encontrados (ND)');
        });

        test('detecta resposta curta em string', () => {
            const alerts = auditHelper.detectAlerts('abc');
            expect(alerts).toContain('Resposta suspeitosamente curta');
        });

        test('detecta campos ND em objeto', () => {
            const analysis = {
                nome: 'João',
                cpf: 'ND',
                valor: 100
            };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toContain('Campo "cpf" não encontrado');
        });

        test('detecta N/D como campo não encontrado', () => {
            const analysis = { endereco: 'N/D' };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toContain('Campo "endereco" não encontrado');
        });

        test('detecta "Não encontrado" como campo ausente', () => {
            const analysis = { telefone: 'Não encontrado' };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toContain('Campo "telefone" não encontrado');
        });

        test('detecta valores zerados em campos de valor', () => {
            const analysis = { valor_total: 0 };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toContain('Campo "valor_total" está com valor zero');
        });

        test('detecta valores zerados como string', () => {
            const analysis = { Total: '0,00' };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toContain('Campo "Total" está com valor zero');
        });

        test('detecta objetos aninhados com ND', () => {
            const analysis = {
                dados: {
                    pessoa: {
                        nome: 'Maria',
                        rg: 'ND'
                    }
                }
            };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toContain('Campo "rg" não encontrado');
        });

        test('detecta menção a imagem borrada', () => {
            const analysis = {
                observacao: 'Imagem borrada, difícil leitura'
            };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toContain('IA detectou imagem de baixa qualidade/ilegível');
        });

        test('detecta menção a incerteza', () => {
            const analysis = {
                nota: 'Valor incerto, verificar manualmente'
            };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toContain('IA expressou incerteza sobre os dados extraídos');
        });

        test('remove alertas duplicados', () => {
            const analysis = {
                campo1: 'ND',
                campo2: 'ND',
                obs: 'imagem borrada e texto borrada'
            };
            const alerts = auditHelper.detectAlerts(analysis);
            const borgadaCount = alerts.filter(a => a.includes('baixa qualidade')).length;
            expect(borgadaCount).toBe(1);
        });

        test('retorna array vazio para análise limpa', () => {
            const analysis = {
                nome: 'Empresa XYZ',
                cnpj: '12.345.678/0001-90',
                valor: 1500.50
            };
            const alerts = auditHelper.detectAlerts(analysis);
            expect(alerts).toHaveLength(0);
        });
    });
});
