# 🧪 Teste da Funcionalidade de Comprovantes

## Formato Esperado

A funcionalidade deve retornar **EXATAMENTE** no formato:
```
DD-MM NOME VALOR
```

## Exemplos de Retorno Correto

### Exemplo 1
```
01-04 CAMINHOS DO OESTE 726,02
```

### Exemplo 2
```
15-03 SUPERMERCADO ABC 89,50
```

### Exemplo 3
```
28-02 ENERGIA ELÉTRICA 245,67
```

## O que NÃO deve aparecer

❌ **Texto explicativo**
❌ **Quebras de linha extras**
❌ **Formatação adicional**
❌ **Campos separados**

## Teste Manual

1. Acesse: `http://localhost:3000`
2. Selecione: "Comprovantes/Boletos"
3. Faça upload de um comprovante
4. Verifique se a resposta está no formato exato: `DD-MM NOME VALOR`

## Casos de Erro

Se não conseguir extrair os dados:
```
ERRO
```

## Validação

A resposta deve seguir o padrão regex:
```regex
^\d{2}-\d{2}\s+.+\s+[\d.,]+$
```

Ou seja:
- 2 dígitos
- hífen
- 2 dígitos
- espaço
- nome (qualquer texto)
- espaço
- valor (números, vírgulas e pontos)

## Logs de Teste

Quando testar, você deve ver no console do servidor:
```
📸 Analisando imagem: [nome_do_arquivo]
🔍 Tipo de análise: receipt
```

E a resposta deve ser limpa, sem texto adicional. 