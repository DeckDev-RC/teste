/**
 * Instruções de sistema globais para economia de tokens e consistência.
 * Estas regras são aplicadas em todas as análises via System Instruction (Gemini/OpenAI).
 */
export const GLOBAL_SYSTEM_INSTRUCTIONS = `
REGRAS DE OURO (Siga rigorosamente):
- Use "ND" para qualquer dado não encontrado.
- RETORNE APENAS o dado extraído no formato especificado, nada mais.
- NUNCA inclua palavras proibidas no retorno: "Boleto", "Venda", "Comprovante", "Nota Fiscal", "Transferência", "Depósito", "Pagamento", "Pix", "Cartão" (e seus plurais ou variações em maiúsculas/minúsculas).
- O formato deve ser sempre: XX-XX DADO_1 DADO_2 VALOR (ou conforme especificado no prompt por empresa).
- Use ponto (.) como separador decimal para valores (ex: 1250.00).
- Datas devem ser convertidas para o formato "dia-mês" (XX-XX).
`.trim();

export const COMPANIES = {
  /**
   * Configurações por empresa
   */
  'enia-marcia-joias': {
    name: 'Enia Marcia Joias',
    icon: 'Gem', // Alterado para o nome do ícone para o frontend mapear
    FINANCIAL: {
      RECEIPT: `Identifique se é uma ORDEM DE SERVIÇO, um COMPROVANTE DE RECEBIMENTO DA STONE ou um COMPROVANTE DE VENDA:

**ORDEM DE SERVIÇO:**
Características: documento que contém "ordem de serviço" e seções "RECEBEMOS" e "Restante".

Dados a extrair:
1. DATA: Procure EXCLUSIVAMENTE no campo "Data:" que está na seção "Restante" (lado direito do documento) ou no Comprovante da Stone podendo estar no canto superior direito ou esquerdo. IGNORE todas as outras datas do documento.
2. NOME DO CLIENTE: Procure por campo "Cliente:" ou similar
3. NÚMERO DA ORDEM: Procure por "Nº" seguido de números (exemplo: "Nº 1747") - pode estar no canto superior direito
4. VALOR: Procure nos seguintes locais, em ORDEM DE PRIORIDADE:
   - PRIMEIRO: Campo "DÉBITO" com valor R$ (se existir)
   - SEGUNDO: Campo "Valor Total:"
   - TERCEIRO: Qualquer valor em destaque

FORMATO DE RETORNO: XX-XX VENDA XXXX NOME_CLIENTE XXX,XX

EXEMPLO: 26-03 VENDA 1747 HELIO FILHO 1285,00

**COMPROVANTE DE RECEBIMENTO DA STONE:**
Características: contém "STONE" e "Comprovante de recebimento" ou "Stone Instituição de Pagamentos S.A."

Dados a extrair:
1. DATA: Procure abaixo de "Comprovante de recebimento"
2. NOME: Campo "QUEM PAGOU"
3. NÚMERO: Número escrito à mão na folha (se houver)
4. VALOR: Campo "Valor"

FORMATO DE RETORNO: XX-XX VENDA XXXX NOME_CLIENTE XXX,XX

EXEMPLO: 01-04 VENDA 5866 HELIO FILHO 2090,00

**COMPROVANTE DE VENDA:**
Características: contém "Nº" em vermelho no canto inferior direito e "agradecemos a preferência"

Dados a extrair:
1. DATA: Campo "Entrada:"
2. NOME: Campo "Nome:"
3. NÚMERO: Número vermelho no canto inferior direito (nunca manuscrito)
4. VALOR: Campo "Total R$"

FORMATO DE RETORNO: XX-XX VENDA XXXX NOME_CLIENTE XXX,XX

EXEMPLO: 01-04 VENDA 5866 HELIO FILHO 2090,00

**COMPROVANTE DE RECEBIMENTO DA Sicoob:**
Características: contém "SICOOB" e "Comprovante de recebimento" ou "Comprovante de recebimento Pix"

Dados a extrair:
1. DATA: Procure ao lado esquerdo de "Recebido em"
2. NOME: Campo "Pagador" abaixo de "Nome"
3. NÚMERO: Número escrito à mão na folha (se houver)
4. VALOR: Abaixo de "Comprovante de recebimento Pix"

FORMATO DE RETORNO: XX-XX VENDA XXXX NOME_CLIENTE XXX,XX

EXEMPLO: 01-04 VENDA 5866 HELIO FILHO 2090,00

**REGRAS GERAIS:**
- Use "ND" para dados não encontrados
- RETORNE APENAS no formato especificado
- Formato obrigatório: XX-XX VENDA XXXX NOME_CLIENTE XXX,XX
- Não retorne palavras como "Boleto" e "Boletos" e "BOLETO" E "BOLETOS"
- Não retorne palavras como "Venda" e "Vendas" e "VENDA" E "VENDAS"
- Não retorne palavras como "Comprovante" e "Comprovantes" e "COMPROVANTE" E "COMPROVANTES"
- Não retorne palavras como "Nota Fiscal" e "Notas Fiscais" e "NOTA FISCAL" E "NOTAS FISCAIS"
- Não retorne palavras como "Transferência" e "Transferências" e "TRANSFERÊNCIA" E "TRANSFERÊNCIAS"
- Não retorne palavras como "Depósito" e "Depósitos" e "DEPÓSITO" E "DEPÓSITOS"
- Não retorne palavras como "Pagamento" e "Pagamentos" e "PAGAMENTO" E "PAGAMENTOS"
- Não retorne palavras como "Pix" e "Pixs" e "PIX" E "PIS"
- Não retorne palavras como "Cartão" e "Cartões" e "CARTÃO" E "CARTÕES"`,

      PAYMENT: `pizza`
    }
  },

  'eletromoveis': {
    name: 'Eletromoveis',
    icon: 'Zap',
    FINANCIAL: {
      RECEIPT: `Identifique se é um COMPROVANTE DE CARTÃO e extraia os seguintes dados:

Características para identificação:
Contém bandeira do cartão (ex: Mastercard)
Campo "VENDA DÉBITO" ou "VENDA CRÉDITO"
Campo "VALOR"
Campo com data e hora da operação

Dados a extrair:
DATA: Campo de data da operação (após "VALOR")
OPERAÇÃO: O texto logo acima do valor, indicando se foi "VENDA DÉBITO" ou "VENDA CRÉDITO"
VALOR: Campo "VALOR"

FORMATO DE RETORNO:
XX-XX OPERACAO XXX,XX

onde:
XX-XX = dia e mês da data da operação
OPERACAO = tipo da operação ("VENDA DÉBITO" ou "VENDA CRÉDITO")
XXX,XX = valor, com ponto como separador decimal

EXEMPLO DE RETORNO:
03-06 VENDA DÉBITO 70,00

Identifique se é um COMPROVANTE DE VENDA de cartão PicPay e extraia os seguintes dados:

Características para identificação:
Logotipo ou nome PicPay
Campo "COMPROVANTE DE VENDA"
Campo com data e hora no topo
Campo "VALOR" com destaque

Dados a extrair:
DATA: Campo de data da operação (normalmente no topo, junto ao horário)
OPERAÇÃO: Campo logo abaixo de "VALOR" indicando "Crédito" ou "Débito"
VALOR: Campo "VALOR" com cifra em reais

FORMATO DE RETORNO:
XX-XX OPERACAO XXX,XX

onde:
XX-XX = dia e mês da data da operação
OPERACAO = tipo da operação ("VENDA CRÉDITO" ou "VENDA DÉBITO")
XXX,XX = valor, com ponto como separador decimal

EXEMPLO DE RETORNO:
11-06 VENDA CRÉDITO 242,00

Identifique se é um COMPROVANTE DE DEPÓSITO do Sicoob e extraia os seguintes dados:

Características para identificação:
Logotipo ou nome SICOOB
Campo "DEPÓSITO CONTA CORRENTE"
Campo "DATA DO DEPÓSITO"
Campo "VALOR"

Dados a extrair:
DATA DO DEPÓSITO: Campo "Data do Depósito"
TIPO DE OPERAÇÃO: Campo "Operacao", verificando se contém "DEPÓSITO CONTA CORRENTE"
VALOR: Campo "Valor"

FORMATO DE RETORNO:
XX-XX DEPOSITO CONTA CORRENTE XXX,XX

onde:
XX-XX = dia e mês da data do depósito
XXX,XX = valor depositado, com ponto como separador decimal

EXEMPLO DE RETORNO:
03-06 DEPOSITO CONTA CORRENTE 7944,00

Identifique se é um COMPROVANTE DE DEPÓSITO EM CONTA CORRENTE do Bradesco e extraia os seguintes dados:

Características para identificação:
Logotipo Bradesco Expresso
Campo "DEPÓSITO EM CONTA CORRENTE"
Campo "VALOR TOTAL"
Campo com data e hora da operação

Dados a extrair:
DATA: Campo de data da operação (após "Data")
TIPO DE OPERAÇÃO: Sempre retorne "DEPÓSITO CONTA CORRENTE"
VALOR TOTAL: Campo "VALOR TOTAL"

FORMATO DE RETORNO:
XX-XX DEPOSITO CONTA CORRENTE XXX,XX

onde:
XX-XX = dia e mês da data do depósito
XXX,XX = valor total, com ponto como separador decimal

EXEMPLO DE RETORNO:
20-06 DEPOSITO CONTA CORRENTE 2000,00

Identifique se é um CONFERÊNCIA DE CAIXA e extraia os seguintes dados:

Características para identificação:
TOPO DO DOCUMENTO ESCRITO "AGREGAR"
Campo "CONFERÊNCIA DE CAIXA"
Campo "DATA"

Dados a extrair:
DATA: Campo de data da operação após "DATA
TIPO DE OPERAÇÃO: Sempre retorne "CONFERÊNCIA DE CAIXA"


FORMATO DE RETORNO:
XX-XX CONFERÊNCIA DE CAIXA

onde:
XX-XX = dia e mês da data do depósito

EXEMPLO DE RETORNO:
20-06 CONFERÊNCIA DE CAIXA

Identifique se é um RELATÓRIO DE CAIXA e extraia os seguintes dados:

Características para identificação:
TOPO DO DOCUMENTO ESCRITO TUDO A MÃO GERALMENTE NO TOPO TEM UMA DATA
UM MONTE DE ESCRITA A MÃO NA FOLHA TODO ALONGADA VERTICALMENTE

FORMATO DE RETORNO:
RELATÓRIO DE CAIXA

EXEMPLO DE RETORNO:
RELATÓRIO DE CAIXA

**REGRAS GERAIS:**
- Use "ND" para dados não encontrados
- RETORNE APENAS no formato especificado
- Formato obrigatório: XX-XX VENDA XXXX NOME_CLIENTE XXX,XX
- Não retorne palavras como "Boleto" e "Boletos" e "BOLETO" E "BOLETOS"
- Não retorne palavras como "Venda" e "Vendas" e "VENDA" E "VENDAS"
- Não retorne palavras como "Comprovante" e "Comprovantes" e "COMPROVANTE" E "COMPROVANTES"
- Não retorne palavras como "Nota Fiscal" e "Notas Fiscais" e "NOTA FISCAL" E "NOTAS FISCAIS"
- Não retorne palavras como "Transferência" e "Transferências" e "TRANSFERÊNCIA" E "TRANSFERÊNCIAS"
- Não retorne palavras como "Depósito" e "Depósitos" e "DEPÓSITO" E "DEPÓSITOS"
- Não retorne palavras como "Pagamento" e "Pagamentos" e "PAGAMENTO" E "PAGAMENTOS"
- Não retorne palavras como "Pix" e "Pixs" e "PIX" E "PIS"
- Não retorne palavras como "Cartão" e "Cartões" e "CARTÃO" E "CARTÕES"
`,

      PAYMENT: `Identifique se é uma NOTA FISCAL DE VENDA e extraia os seguintes dados:

Características para identificação:
Contém "NOTA FISCAL ELETRÔNICA"
Campo "VENDA" como natureza da operação
Campo "VALOR TOTAL DA NOTA" ou "TOTAL DA NOTA"
Campo "DATA DE EMISSÃO"

Dados a extrair:
DATA DE EMISSÃO: Procure o campo com a etiqueta "Data de Emissão"
NOME DO FORNECEDOR: no primeiro bloco CANTO superior direito, PODE SER LOGO OU NOME COMPLETO "LTDA" 
VALOR DA NOTA: Campo "VALOR TOTAL DA NF" (não confundir com total dos produtos)
FORMATO DE RETORNO:
XX-XX NOME_FORNECEDOR XXX,XX

onde:
XX-XX = dia e mês da data de emissão
NOME_FORNECEDOR = nome completo do fornecedor
XXX,XX = valor total da nota
EXEMPLO: 02-05 J&A MOVEIS LTDA - EPP 1.535,49

**REGRA ESPECIFICA**
- NUNCA PEGUE O "NOME/RAZÃO SOCIAL"

Identifique se é um COMPROVANTE DE ENVIO PIX do Sicoob e extraia os seguintes dados:

Características para identificação:
Logotipo do SICOOB
Contém "Comprovante de envio Pix"
Campo "Transferido" com data e hora

Dados a extrair:
RECEBEDOR: Nome no campo "Recebedor" ou "Beneficiário"
DESCRIÇÃO: Texto abaixo do valor transferido (exemplo: "compra de pés de madeira"), GERALMENTE ABAIXO DE DADOS DE DATA (EXEMPLO: "TRANSFERIDO 30/06/2025 ÁS 17:55:04")
VALOR: Campo "R$" destacado logo abaixo de "Comprovante de envio Pix"

FORMATO DE RETORNO:
XX-XX NOME_RECEBEDOR DESCRICAO XXX,XX

onde:
XX-XX = dia e mês da data de transferência
NOME_RECEBEDOR = nome completo do recebedor ou beneficiário
DESCRICAO = texto descritivo da transferência
XXX,XX = valor transferido, com ponto como separador decimal

EXEMPLO DE RETORNO:
02-06 JOAQUIM ANTONIO DE CARVALHO compra de pes de madeira 990,00

Identifique se é um BOLETO BANCÁRIO e extraia os seguintes dados:

Características para identificação:
Código de barras na lateral ou no Rodapé
Campo "Beneficiário"
Campo "Data de Vencimento"
Campo "Valor do Documento"
Sempre terá código de barras
Sempre terá a numeração do código de barras no cabeçalho


Dados a extrair:
DATA DE VENCIMENTO: Sempre Campo "Data de Vencimento"
BENEFICIÁRIO: SEMPRE Campo "Beneficiário"
VALOR: Campo "Valor do Documento"

FORMATO DE RETORNO:
XX-XX BENEFICIARIO XXX,XX

onde:
XX-XX = dia e mês da data de vencimento
BENEFICIARIO = nome completo do beneficiário
XXX,XX = valor do boleto (com ponto como separador decimal)

EXEMPLO DE RETORNO:
07-07 J A MOVEIS LTDA 1539,40

**REGRAS ESPECIFICAS:**
JAMAIS PEGUE O NOME DO PAGADOR 

Identifique se é um COMPROVANTE DE TRANSFERÊNCIA BANCÁRIA do Bradesco e extraia os seguintes dados:

Características para identificação:
Logotipo do Bradesco Net Empresa
Campo "Comprovante de Transação Bancária"
Campo "Data da operação"

Dados a extrair:
DATA DA OPERAÇÃO: Campo "Data de Vencimento"
NOME: Campo "Nome" dentro de "Dados de quem recebeu"
VALOR: Campo "Valor" em "Dados da transferência"

FORMATO DE RETORNO:
XX-XX NOME XXX,XX

onde:
XX-XX = dia e mês da data da operação
NOME = nome completo do recebedor
XXX,XX = valor da transferência, com ponto como separador decimal

EXEMPLO DE RETORNO:
06-06 GENESIS WILLIAM FERREIRA 1000,00

Identifique se é uma CONTA DE ÁGUA da SANEAGO e extraia os seguintes dados:

Características para identificação:
Logotipo ou nome SANEAGO
Campo "Vencimento"
Campo "Valor a pagar"

Dados a extrair:
VENCIMENTO: Campo "Vencimento"
NOME DO FORNECEDOR: Sempre fixo como "SANEAMENTO DE GOIÁS S.A"
VALOR: Campo "Valor a pagar"

FORMATO DE RETORNO:
XX-XX AGUA NOME_FORNECEDOR XXX,XX

onde:
XX-XX = dia e mês do vencimento
NOME_FORNECEDOR = "SANEAMENTO DE GOIÁS S.A"
XXX,XX = valor a pagar, com ponto como separador decimal

EXEMPLO DE RETORNO:
21-06 AGUA SANEAMENTO DE GOIÁS S.A 224,34

Identifique se é uma CONTA DE ENERGIA da EQUATORIAL e extraia os seguintes dados:

Características para identificação:
Logotipo ou nome EQUATORIAL
Campo "Vencimento"
Campo "Valor a pagar"

Dados a extrair:
VENCIMENTO: Campo "Vencimento"
NOME DO FORNECEDOR: Sempre fixo como "EQUATORIAL GOIÁS DISTRIBUIDORA DE ENERGIA S.A"
VALOR: Campo "Valor a pagar"

FORMATO DE RETORNO:
XX-XX ENERGIA NOME_FORNECEDOR XXX,XX

onde:
XX-XX = dia e mês do vencimento
NOME_FORNECEDOR = "EQUATORIAL DE GOIÁS S.A"
XXX,XX = valor a pagar, com ponto como separador decimal

EXEMPLO DE RETORNO:
21-06 ENERGIA EQUATORIAL DE GOIÁS S.A 224,34

Identifique se é um COMPROVANTE DE ABASTECIMENTO de posto de combustível e extraia os seguintes dados:

Características para identificação:
Logotipo Auto Posto Petrolina
Campo "Total" com valor destacado
Campo manuscrito com data

Dados a extrair:
DATA: Campo manuscrito (normalmente ao lado de "Data")
NOME DO FORNECEDOR: Fixo como "AUTO POSTO PETROLINA"
VALOR: Campo "Total"

FORMATO DE RETORNO:
XX-XX AUTO POSTO PETROLINA XXX,XX

onde:
XX-XX = dia e mês da data do abastecimento
XXX,XX = valor total, com ponto como separador decimal

EXEMPLO DE RETORNO:
05-06 AUTO POSTO PETROLINA 150,00

Identifique se é um COMPROVANTE DE TRANSFERÊNCIA BANCÁRIA do Bradesco e extraia os seguintes dados:

Características para identificação:
Contém logotipo ou nome Bradesco
Campo "Confirmação de Operação"
Campo "Data da operação"

Dados a extrair:
DATA DA OPERAÇÃO: Campo "Data de Vencimento"
NOME: Campo "Nome" dentro de "Dados de quem recebeu"
DESCRIÇÃO: Campo "Descrição" em "Dados da Transferência"
VALOR: Campo "Valor" em "Dados da Transferência"

FORMATO DE RETORNO:
XX-XX NOME DESCRICAO XXX,XX

onde:
XX-XX = dia e mês da data da operação
NOME = nome completo do recebedor
DESCRICAO = descrição da transferência no campo (exemplo: "Descrição: Honorario Advocaticio") 
XXX,XX = valor da transferência, com ponto como separador decimal

EXEMPLO DE RETORNO:
03-06 MICAELLY KAROLINY MARTINS Honorario Advocaticio 5500,00

Identifique se é um DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS e extraia os seguintes dados:

Características para identificação:
Logotipo Receita Federal ESCRITO Receita Federal
Campo “Pagar este documento até”
Campo “Valor Total do Documento” destacado


Dados a extrair:
DATA: Campo “Pagar este documento até”, devolvendo no formato DD-MM (ex: “17/04/2025” retorna “17-04”)
NOME: Sempre retorne fixo como “INSS"
VALOR TOTAL DO DOCUMENTO: Campo “Valor Total do Documento”, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX INSS XXX,XX

onde:
XX-XX = dia e mês da data de vencimento
XXX,XX = valor total do documento, com ponto como separador decimal

EXEMPLO DE RETORNO:
17-04 INSS 785,53

Identifique se é um DOCUMENTO SIMPLES NACIONAL e extraia os seguintes dados:

Características para identificação:
Logotipo SIMPLES NACIONAL ESCRITO SIMPLES NACIONAL
Campo “Pagar este documento até”
Campo “Valor Total do Documento” destacado


Dados a extrair:
DATA: Campo “Pagar este documento até”, devolvendo no formato DD-MM (ex: “17/04/2025” retorna “17-04”)
NOME: Sempre retorne fixo como “SIMPLES NACIONAL"
VALOR TOTAL DO DOCUMENTO: Campo “Valor Total do Documento”, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX SIMPLES NACIONAL XXX,XX

onde:
XX-XX = dia e mês da data de vencimento
XXX,XX = valor total do documento, com ponto como separador decimal

EXEMPLO DE RETORNO:
17-04 SIMPLES NACIONAL 785,53

Identifique se é um DOCUMENTO FGTS DIGITAL e extraia os seguintes dados:

Características para identificação:
Logotipo FGTS DIGITAL ESCRITO FGTS DIGITAL
Campo “Pagar este documento até”
Campo “Valor Total do Documento” destacado


Dados a extrair:
DATA: Campo “Pagar este documento até”, devolvendo no formato DD-MM (ex: “17/04/2025” retorna “17-04”)
NOME: Sempre retorne fixo como “FGTS"
VALOR TOTAL DO DOCUMENTO: Campo “Valor Total do Documento”, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX FGTS XXX,XX

onde:
XX-XX = dia e mês da data de vencimento
XXX,XX = valor total do documento, com ponto como separador decimal

EXEMPLO DE RETORNO:
17-04 FGTS 785,53

**REGRAS GERAIS:**
- Use "ND" para dados não encontrados
- RETORNE APENAS no formato especificado
- Formato obrigatório: XX-XX NOME_CLIENTE XXX,XX
- NUNCA PEGUE O NOME DO PAGADOR
- NUNCA retorne palavras como "Boleto" e "Boletos" e "BOLETO" E "BOLETOS"
- NUNCA retorne palavras como "Venda" e "Vendas" e "VENDA" E "VENDAS"
- NUNCA retorne palavras como "Comprovante" e "Comprovantes" e "COMPROVANTE" E "COMPROVANTES"
- NUNCA retorne palavras como "Nota Fiscal" e "Notas Fiscais" e "NOTA FISCAL" E "NOTAS FISCAIS"
- NUNCA retorne palavras como "Transferência" e "Transferências" e "TRANSFERÊNCIA" E "TRANSFERÊNCIAS"
- NUNCA retorne palavras como "Depósito" e "Depósitos" e "DEPÓSITO" E "DEPÓSITOS"
- NUNCA retorne palavras como "Pagamento" e "Pagamentos" e "PAGAMENTO" E "PAGAMENTOS"
- NUNCA retorne palavras como "Pix" e "Pixs" e "PIX" E "PIXS"
- NUNCA retorne palavras como "Cartão" e "Cartões" e "CARTÃO" E "CARTÕES"`
    }
  },

  'marcondes': {
    name: 'Marcondes',
    icon: 'Building',
    FINANCIAL: {
      RECEIPT: ``,

      PAYMENT: `Identifique os tipos de documentos e extraia os dados conforme especificado:

Identifique se é um COMPROVANTE DE TRANSFERÊNCIA BANCÁRIA do Bradesco e extraia os seguintes dados:

Características para identificação:
Campo "Instituição de Origem" do Bradesco
Campo "Confirmação de Operação" no Cabeçalho topo documento
Campo "Data da operação"

Dados a extrair:
DATA DA OPERAÇÃO: Campo "Data de Vencimento"
NOME: Campo "Nome" dentro de "Dados de quem recebeu"
VALOR: Campo "Valor" 

FORMATO DE RETORNO:
XX-XX NOME XXX,XX

onde:
XX-XX = dia e mês da data da operação
NOME = nome completo do recebedor
XXX,XX = valor da transferência, com ponto como separador decimal

EXEMPLO DE RETORNO:
06-06 GENESIS WILLIAM FERREIRA 1000,00

COMPROVANTE DE COMPRA EM POSTO (via maquininha ou cupom)
Características:
Gasto com combustível ou produtos de posto
Pode estar em nome de pessoa física ou jurídica
A descrição do documento é essencial para categorizar

Dados a extrair:
DATA: Data do comprovante (formato DD-MM)
FORNECEDOR: Nome impresso no comprovante (ex: POSTO GEDDA)
DESCRIÇÃO: Texto livre conforme consta no nome do arquivo
VALOR: Valor total, com ponto como separador decimal

FORMATO DE RETORNO:
DD-MM FORNECEDOR (DESCRIÇÃO) XXX.XX

EXEMPLO:
22-06 POSTO GEDDA (COMBUSTÍVEL) 200.00

✅ 2. COMPROVANTE DE PIX
Características:
Pix enviado com valor pago
Deve conter o nome do recebedor

Dados a extrair:
DATA: Data do Pix (formato DD-MM)
NOME: Nome do recebedor
DESCRIÇÃO: Do nome do arquivo
VALOR: Valor transferido

FORMATO DE RETORNO:
DD-MM NOME (DESCRIÇÃO) XXX.XX

EXEMPLO:
28-06 AUTO POSTO SAMDU (COMBUSTÍVEL) 190.61

✅ 3. COMPROVANTE DE TRANSFERÊNCIA BANCÁRIA
Características:
Transferência feita por TED/DOC
Informações bancárias e nome do favorecido

Dados a extrair:
DATA DA TRANSFERÊNCIA: (formato DD-MM)
FAVORECIDO: Nome da pessoa ou empresa que recebeu
DESCRIÇÃO: Do nome do arquivo
VALOR: Valor da transferência

FORMATO DE RETORNO:
DD-MM FAVORECIDO (DESCRIÇÃO) XXX.XX

EXEMPLO:
04-07 FRANCIELLY CRISTINA (SALÁRIO) 1600.00

✅ 4. COMPROVANTE DE BOLETO
Características:
Pagamento de boleto
Deve conter o nome/razão social do beneficiário

Dados a extrair:
DATA DO PAGAMENTO: (formato DD-MM)
RAZÃO SOCIAL / NOME DO BENEFICIÁRIO:
VALOR PAGO:

FORMATO DE RETORNO:
DD-MM NOME (DESCRIÇÃO) XXX.XX

EXEMPLO:
27-06 DROGARIA XYZ LTDA (MEDICAMENTOS) 4497.72

- Se for comprovante de boleto, extraia a razão social completa do beneficiário.

`
    },
  },

  'marcmix': {
    name: 'MarcMix',
    icon: 'Factory',
    FINANCIAL: {
      RECEIPT: `Identifique os tipos de comprovantes e extraia os dados conforme especificado:

**COMPROVANTE DE CARTÃO:**
Características: Bandeira do cartão, campos "VENDA DÉBITO/CRÉDITO", "VALOR"
Dados: DATA, OPERAÇÃO, VALOR
FORMATO: XX-XX CARTAO OPERACAO XXX,XX
EXEMPLO: 03-06 CARTAO VENDA DÉBITO 70,00

**COMPROVANTE PICPAY:**
Características: Logo PicPay, "COMPROVANTE DE VENDA", "VALOR"
Dados: DATA, OPERAÇÃO, VALOR
FORMATO: XX-XX CARTAO OPERACAO XXX,XX
EXEMPLO: 11-06 CARTAO VENDA CRÉDITO 242,00

**COMPROVANTE DE DEPÓSITO:**
Características: "DEPÓSITO CONTA CORRENTE", "DATA DO DEPÓSITO", "VALOR"
Dados: DATA, TIPO, VALOR
FORMATO: XX-XX DEPOSITO CONTA CORRENTE XXX,XX
EXEMPLO: 03-06 DEPOSITO CONTA CORRENTE 7944,00

- Não retorne palavras como "Boleto", "Venda", "Comprovante", etc. sozinhas`,

      PAYMENT: `Identifique os tipos de documentos e extraia os dados conforme especificado:

Identifique se é um COMPROVANTE DE ENVIO PIX tipo 1e extraia os seguintes dados:

Características para identificação:
Contém “Pix realizado com sucesso” ou “Comprovante de Pix enviado”
Campo “Dados do recebedor”
Campo “Valor”
Campo “Data”

Dados a extrair:
DATA: Campo de data no formato DD/MM/AAAA, devolvendo apenas DD-MM no retorno (exemplo: “03/04/2025” retorna “03-04”)
NOME: Campo “Nome” dentro de Dados do recebedor
VALOR: Campo “Valor” destacado na transação, com separador decimal ponto
FORMATO DE RETORNO:
XX-XX PIX NOME XXX,XX

onde:
XX-XX = dia e mês extraídos da data do comprovante
NOME = nome completo do recebedor
XXX,XX = valor transferido, com ponto como separador decimal

EXEMPLO DE RETORNO:
03-04 PIX JESSICA ANDRESSA RODRIGUES 600,00

Identifique se é um COMPROVANTE DE PAGAMENTO Sicoob e extraia os seguintes dados:

Características para identificação:
Contém texto como “Comprovante de pagamento” ou “Pagamento realizado com sucesso”
Campo “Beneficiário” com nome/razão social
Campo “Valor total”
Campo “Data do pagamento”

Dados a extrair:
DATA: Campo “Data do pagamento” (devolvendo no formato DD-MM, por exemplo “03/04/2025” vira “03-04”)
BENEFICIÁRIO: Campo “Nome/Razão social” dentro da seção Beneficiário
VALOR TOTAL: Campo “Valor total”, usando ponto como separador decimal
FORMATO DE RETORNO:
XX-XX PAG MPL I E C DE ROUPAS LTDA XXX,XX

onde:
XX-XX = dia e mês extraídos da data do pagamento
BENEFICIÁRIO = nome ou razão social do beneficiário
XXX,XX = valor total pago, com ponto como separador decimal

EXEMPLO DE RETORNO:
03-04 PAG MPL I E C DE ROUPAS LTDA 1119,88

Identifique se é um COMPROVANTE DE ENVIO PIX tipo 2 e extraia os seguintes dados:

Características para identificação:
Contém “Comprovante de Pix enviado”
Campo “Dados do recebedor”
Campo “Valor”
Campo “Data”

Dados a extrair:
DATA: Campo “Data” do comprovante, devolvendo no formato DD-MM (exemplo: “04/04/2025” retorna “04-04”)
NOME: Campo “Nome” dentro de Dados do recebedor
VALOR: Campo “Valor” no cabeçalho, com ponto como separador decimal
FORMATO DE RETORNO:
XX-XX PIX NOME XXX,XX

onde:
XX-XX = dia e mês da data do Pix
NOME = nome completo do recebedor
XXX,XX = valor transferido, com ponto como separador decimal

EXEMPLO DE RETORNO:
04-04 PIX ANA CRISTINA COTRIM DO NASCIMENTO 50,00

Identifique se é um COMPROVANTE DE VENDA DE CARTÃO tipo 1 e extraia os seguintes dados:

Características para identificação:
Contém o nome do fornecedor (ex: ATACADÃO KASART)
Campo com data e hora da operação
Campo “CRÉDITO À VISTA” ou similar
Valor destacado com cifra em reais

Dados a extrair:
DATA: Campo de data (normalmente abaixo do nome do estabelecimento), devolvendo no formato DD-MM (ex: “07/04/2025” vira “07-04”)
NOME DO FORNECEDOR: Fixo como “ATACADÃO KASART”
VALOR: Campo de valor destacado, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX CARTAO ATACADÃO KASART XXX,XX

onde:
XX-XX = dia e mês da data da operação
XXX,XX = valor da venda, com ponto como separador decimal

EXEMPLO DE RETORNO:
07-04 CARTAO ATACADÃO KASART 870,09

Identifique se é um COMPROVANTE DE VENDA DE CARTÃO tipo 2 e extraia os seguintes dados:

Características para identificação:
Contém nome do fornecedor HIPER FESTA GOL
Campo “CRÉDITO À VISTA” ou similar
Data da operação no cabeçalho
Valor destacado com cifra em reais

Dados a extrair:
DATA: Campo de data no topo do comprovante, devolvendo no formato DD-MM (ex: “07/04/2025” retorna “07-04”)
NOME DO FORNECEDOR: Fixo como “HIPER FESTA GOL”
VALOR: Campo de valor destacado, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX CARTAO HIPER FESTA GOL XXX,XX

onde:
XX-XX = dia e mês da data da operação
XXX,XX = valor da venda, com ponto como separador decimal

EXEMPLO DE RETORNO:
07-04 CARTAO HIPER FESTA GOL 1000,43

Identifique se é um COMPROVANTE DE PAGAMENTO DE BOLETO e extraia os seguintes dados:

Características para identificação:
Contém “Comprovante Boleto”
Campo “Beneficiário original / Cedente”
Campo “Valor calculado (R$)”
Campo “Data” no topo

Dados a extrair:
DATA: Campo “Data” do comprovante, devolvendo no formato DD-MM (ex: “07/04/2025” vira “07-04”)
NOME: Campo “Nome fantasia” dentro de Beneficiário original / Cedente
VALOR: Campo “Valor calculado (R$)”, usando ponto como separador decimal

FORMATO DE RETORNO:
XX-XX BOLETO NOME XXX,XX

onde:
XX-XX = dia e mês da data do pagamento
NOME = nome fantasia do beneficiário original / cedente
XXX,XX = valor calculado, com ponto como separador decimal

EXEMPLO DE RETORNO:
07-04 BOLETO MPL I E C DE ROUPAS LTDA 465,75

Identifique se é um COMPROVANTE DE VENDA DE CARTÃO tipo 3 e extraia os seguintes dados:

Características para identificação:
Contém texto ou logotipo Cielo
Campo “CRÉDITO À VISTA”
Campo de data e hora
Apresenta a expressão VIA DO CLIENTE (comprovante de maquininha)
Campo de valor destacado com cifra em reais

IMPORTANTE:
O nome do fornecedor deverá ser obtido a partir do CNPJ impresso no comprovante, se possível, fazendo correspondência do CNPJ com base de cadastro previamente informada (exemplo: tabela local, dicionário, etc).
Caso o nome do fornecedor não seja identificado no cadastro, retorne apenas ND para o nome.

Dados a extrair:
DATA: Campo de data (normalmente abaixo do nome do estabelecimento), devolvendo no formato DD-MM (ex: “07/04/2025” retorna “07-04”)
NOME DO FORNECEDOR: Consultar a partir do CNPJ encontrado no comprovante (comparando com a base cadastrada local), caso não encontre retorne “ND”
VALOR: Campo de valor destacado, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX CARTAO NOME_FORNECEDOR XXX,XX

onde:
XX-XX = dia e mês da data da operação
NOME_FORNECEDOR = nome do fornecedor associado ao CNPJ, ou “ND” se não localizar
XXX,XX = valor, com ponto como separador decimal

EXEMPLO DE RETORNO:
07-04 CARTAO POSTO CARRIJO 158,00

Identifique se é um RECIBO preenchido manualmente e extraia os seguintes dados:

Características para identificação:
Campo “RECIBO” no topo do documento
Campo de data manuscrita
Campo “Assinatura”
Campo “Referente”
Campo de valor destacado normalmente precedido de “R$”

Dados a extrair:
DATA: Campo de data manuscrita, devolvendo no formato DD-MM (ex: “03 Abril 2025” retorna “03-04”)
ASSINATURA: Nome escrito no campo “Assinatura”
REFERENTE: Campo “Referente” (pode estar logo abaixo do “Recebi de” ou “Importância de”)
VALOR: Valor destacado, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX REC ASSINATURA REFERENTE XXX,XX

onde:
XX-XX = dia e mês da data
ASSINATURA = nome do assinante
REFERENTE = motivo ou referência do pagamento
XXX,XX = valor do recibo, com ponto como separador decimal

EXEMPLO DE RETORNO:
03-04 REC PAULA AMENTA DE SOUZA Custodia salario Paula 1500,00
03-04 REC ISADORA ELIUZA S MACHADO Custodia salario Isadora 520,00

Identifique se é um RECIBO preenchido manualmente tipo 2 e extraia os seguintes dados:

Características para identificação:
Título RECIBO no topo do documento
Campo de data manuscrita
Campo “Referente” preenchido
Campo de valor destacado, normalmente precedido de “R$”

Dados a extrair:
DATA: Campo de data manuscrita, devolvendo no formato DD-MM (ex: “09 Abril 2025” vira “09-04”)
REFERENTE: Campo “Referente” (texto completo preenchido)
VALOR: Valor destacado, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX REC REFERENTE XXX,XX

onde:
XX-XX = dia e mês da data
REFERENTE = texto preenchido no campo “Referente”
XXX,XX = valor do recibo, com ponto como separador decimal

EXEMPLO DE RETORNO:
09-04 REC Josefa (piso loja Juliana) 735,00

Identifique se é um DOCUMENTO DE ARRECADAÇÃO (DARF) pago e extraia os seguintes dados:

Características para identificação:
Título “Documento de Arrecadação de Receitas Federais”
Campo “Data do pagamento”
Campo “Agente arrecadador” (normalmente banco ou lotérica)
Campo “Valor do documento”

Dados a extrair:
DATA DO PAGAMENTO: Campo de data do pagamento, devolvendo no formato DD-MM (ex: “09/04/2025” retorna “09-04”)
AGENTE ARRECADADOR: Nome da instituição arrecadadora (ex: “Lotéricas Caixa” ou nome do banco)
VALOR DO DOCUMENTO: Valor total pago, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX DARF AGENTE XXX,XX

onde:
XX-XX = dia e mês da data do pagamento
AGENTE = nome do agente arrecadador
XXX,XX = valor do documento, com ponto como separador decimal

EXEMPLO DE RETORNO:
09-04 DARF LOTERICAS CAIXA 1294,98

Identifique se é um DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL (DAS) e extraia os seguintes dados:

Características para identificação:
Contém logotipo e texto Simples Nacional
Campo “Pagar este documento até”
Campo “Valor Total do Documento” destacado
Razão social no cabeçalho

Dados a extrair:
DATA: Campo “Pagar este documento até”, devolvendo no formato DD-MM (ex: “22/04/2025” vira “22-04”)
NOME: Sempre retorne fixo como “SIMPLES NACIONAL”
VALOR TOTAL DO DOCUMENTO: Campo “Valor Total do Documento”, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX DAS SIMPLES NACIONAL XXX,XX

onde:
XX-XX = dia e mês da data de vencimento
XXX,XX = valor total do documento, com ponto como separador decimal

EXEMPLO DE RETORNO:
22-04 DAS SIMPLES NACIONAL 3274,04

Identifique se é um DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS e extraia os seguintes dados:

Características para identificação:
Logotipo Receita Federal
Campo “Pagar este documento até”
Campo “Valor Total do Documento” destacado
Campo “Data de Vencimento”

Dados a extrair:
DATA: Campo “Pagar este documento até”, devolvendo no formato DD-MM (ex: “17/04/2025” retorna “17-04”)
NOME: Sempre retorne fixo como “RECEITA FEDERAL”
VALOR TOTAL DO DOCUMENTO: Campo “Valor Total do Documento”, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX DARF RECEITA FEDERAL XXX,XX

onde:
XX-XX = dia e mês da data de vencimento
XXX,XX = valor total do documento, com ponto como separador decimal

EXEMPLO DE RETORNO:
17-04 DARF RECEITA FEDERAL 785,53

Identifique se é uma GUIA DO FGTS DIGITAL (GFD) e extraia os seguintes dados:

Características para identificação:
Logotipo FGTS Digital
Campo “Pagar este documento até”
Campo “Valor a recolher”
Razão social no topo do documento

Dados a extrair:
DATA: Campo “Pagar este documento até”, devolvendo no formato DD-MM (ex: “17/04/2025” retorna “17-04”)
NOME: Sempre retorne fixo como “FGTS”
VALOR A RECOLHER: Campo “Valor a recolher”, com ponto como separador decimal

FORMATO DE RETORNO:
XX-XX FGTS FGTS XXX,XX

onde:
XX-XX = dia e mês da data de vencimento
XXX,XX = valor a recolher, com ponto como separador decimal

EXEMPLO DE RETORNO:
17-04 FGTS FGTS 453,90

Identifique se é um COMPROVANTE DE PAGAMENTO vinculado a compra de produto ou serviço e extraia os seguintes dados:

Características para identificação:
Contém texto como “Pagamento efetuado com sucesso”
Campo com o nome do fornecedor (no topo, ex: ANNA PRATA)
Campo de valor total destacado em reais

Dados a extrair:
NOME DO FORNECEDOR: Sempre capturar o nome em destaque no topo (ex: “ANNA PRATA”)
VALOR: Campo “valor total” ou valor de cobrança destacado, com ponto como separador decimal

FORMATO DE RETORNO:
PAG FORNECEDOR XXX,XX

onde:
FORNECEDOR = nome do fornecedor (ex: ANNA PRATA)
XXX,XX = valor pago, com ponto como separador decimal

EXEMPLO DE RETORNO:
PAG ANNA PRATA 540,00


**REGRAS GERAIS:**
- Use "ND" para dados não encontrados
- RETORNE APENAS no formato especificado
- Não retorne palavras como "Boleto", "Venda", "Comprovante", etc. sozinhas
- Sempre use o termo RECIBO por extenso no formato de saída, nunca apenas REC
- Caso algum campo não seja encontrado, retorne “ND” no local correspondente
- Utilize ponto como separador decimal
- Retorne apenas no formato especificado
`

    }
  },


  'raquel-luc': {
    name: 'Raquel Luc',
    icon: 'Store',
    FINANCIAL: {
      RECEIPT: `Identifique os tipos de comprovantes e extraia os dados conforme especificado:

 1. COMPROVANTE ITAÚ
Características:
Comprovante de transferência ou Pix do Banco Itaú
Deve conter: data, nome e valor

Prompt:
Identifique se é um COMPROVANTE ITAÚ e extraia:
DATA (formato DD-MM)
NOME
VALOR

FORMATO DE RETORNO:
DD-MM NOME VALOR

EXEMPLO:
01-07 DEUZENIR DARC FERREIRA 214,90

✅ 2. COMPROVANTE BRADESCO
Características:
Comprovante do Banco Bradesco
Deve conter: data, nome e valor

Prompt:
Identifique se é um COMPROVANTE BRADESCO e extraia:
DATA (formato DD/MM ou DD-MM)
NOME
VALOR
FORMATO DE RETORNO:
DD-MM NOME VALOR

EXEMPLO:
01-07 NAIR HELENA GONÇALVES DA SILVA PAIVA 189,90

✅ 3. COMPROVANTE DE PAGAMENTO NUBANK
Características:
Pagamento realizado via Nubank
Deve conter: data, nome da conta de origem e valor

Prompt:
Identifique se é um COMPROVANTE NUBANK e extraia:
DATA (formato DD-MM)
NOME DA CONTA ORIGEM
VALOR

FORMATO DE RETORNO:
DD-MM NOME VALOR

EXEMPLO:
05-07 DIWLHA FERNANDES SANTOS 150,00

INDEPENDENTE DE TUDO COLOQUE O NOME DA PESSOA QUE FEZ O PAGAMENTO

✅ 4. CASOS ORDINÁRIOS (SEM NOME/ORIGEM)
Características:
Não aparece nome do cliente ou origem da conta
Use descrição padrão: VENDA PIX


✅ 5. RECEITAS EM DINHEIRO (foto de dinheiro)
Características:
Imagem de valores em espécie
Data virá do nome do arquivo
Descrição padrão: VENDA DINHEIRO
Valor vem da imagem

Prompt:
Para comprovante com dinheiro em espécie:
DATA = Nome do arquivo (formato DD-MM)
DESCRIÇÃO: VENDA DINHEIRO
VALOR = Some APENAS os valores das cédulas de dinheiro visíveis na imagem. Identifique cada cédula (R$ 2, R$ 5, R$ 10, R$ 20, R$ 50, R$ 100, R$ 200) e some o valor total.

IMPORTANTE: 
1. Retorne APENAS o valor numérico total das cédulas, sem incluir a data ou outros números.
2. Não confunda a data no nome do arquivo com o valor monetário.
3. Examine CUIDADOSAMENTE a imagem para identificar TODAS as cédulas, inclusive aquelas que estão parcialmente visíveis ou sobrepostas.
4. ATENÇÃO ESPECIAL: Quando houver múltiplas cédulas do mesmo valor empilhadas ou sobrepostas, conte CADA UMA INDIVIDUALMENTE. Observe atentamente as bordas e cantos visíveis para determinar quantas cédulas estão empilhadas.
5. Verifique todos os cantos e bordas da imagem para não perder nenhuma cédula.
6. Identifique explicitamente cada cédula encontrada, incluindo a quantidade de cada valor (exemplo: "1x R$50, 3x R$20, 2x R$10 = R$130,00").
7. Para cédulas empilhadas, indique claramente a quantidade (exemplo: "3x R$50 empilhadas").
8. Use vírgula como separador decimal no valor final.
9. Após identificar todas as cédulas, faça uma verificação final para garantir que nenhuma cédula foi contada em duplicidade ou omitida.

FORMATO DE RETORNO:
DD-MM VENDA DINHEIRO VALOR

EXEMPLO:
01-07 VENDA DINHEIRO 200,00


✅ 6. RELATÓRIO DE VENDAS EM CARTÃO
Características:
Relatório impresso de vendas no cartão
Descrição fixa: RELATÓRIO DE VENDAS IMPRESSO
Data está abaixo de “RELATÓRIO RESUMIDO”

Prompt:
Para relatório de vendas em cartão impresso:
DATA = Data embaixo de “RELATÓRIO RESUMIDO”
DESCRIÇÃO: RELATÓRIO DE VENDAS IMPRESSO

FORMATO DE RETORNO:
DD-MM RELATÓRIO DE VENDAS IMPRESSO

EXEMPLO:
03-07 RELATÓRIO DE VENDAS IMPRESSO

**REGRAS GERAIS:**
- Utilize "ND" para qualquer campo não localizado (nome, valor ou data).
- RETORNE APENAS no formato de saída especificado para cada tipo de comprovante.
- O formato da data deve ser sempre DD-MM (ex: 05-07 para 5 de julho).
- O valor deve usar ponto como separador decimal, com duas casas (ex: 100.00).
- O nome da empresa RAQUEL LUC CALÇADOS nunca deve ser retornado como cliente — essa é a recebedora, não a pagadora.
- Em casos onde não houver nome de cliente ou origem da conta, utilize a descrição padrão: VENDA PIX.
- Para comprovantes de dinheiro em espécie, a data vem do nome do arquivo, e a descrição é VENDA DINHEIRO.
- Para relatórios de vendas, utilize a descrição fixa RELATÓRIO DE VENDAS IMPRESSO.
        `
    }
  },

  'fliper': {
    name: 'Fliper',
    icon: 'BarChart3',
    FINANCIAL: {
      RECEIPT: `**VOCÊ É UM LEITOR DE DOCUMENTOS DA MINHA PARA RENOMEAÇÃO DE DOCUMENTAÇÃO ENTÃO HAJA COMO TAL E SEJA EXATO E SIGA A RISCA TODAS AS REGRAS ABAIXO**
        Identifique os tipos de comprovantes e extraia os dados conforme especificado:


1. COMPROVANTE ITAÚ
Características:

Banco: Itaú
Dados extraídos do comprovante + nome do arquivo

Dados a extrair:
DATA: Do comprovante (formato DD-MM)
NOME: Nome do pagador no comprovante
DESCRIÇÃO: Extraída do nome do arquivo
VALOR: Valor pago

FORMATO DE RETORNO:
DD-MM NOME (DESCRIÇÃO) XXX,XX

EXEMPLO:
03-07 RV COMERCIO E SERVIÇOS LTDA (ADESIVOS) 200,00

2. COMPROVANTE NUBANK
Características:
Banco: Nubank
Dados extraídos do comprovante + nome do arquivo

Dados a extrair:
DATA: Do comprovante (formato DD-MM)
NOME: Nome do pagador
DESCRIÇÃO: Extraída do nome do arquivo
VALOR: Valor pago

FORMATO DE RETORNO:
DD-MM NOME (DESCRIÇÃO) XXX,XX

EXEMPLO:
04-07 RHAFAEL ARANATES DE OLIVEIRA (ADESIVOS RECORTES) 400,00

**REGRAS GERAIS (Fliper)**
-Use "ND" para dados não encontrados
-Sempre retorne apenas no formato especificado
-O formato da data deve ser DD-MM
-O valor deve conter ponto como separador decimal, com duas casas
-A descrição entre parênteses sempre virá do nome do arquivo
-Todos os documentos em “Contas a Receber” representam receitas efetivamente recebidas



        `,

      PAYMENT:
        `**VOCÊ É UM LEITOR DE DOCUMENTOS DA MINHA PARA RENOMEAÇÃO DE DOCUMENTAÇÃO ENTÃO HAJA COMO TAL E SEJA EXATO E SIGA A RISCA TODAS AS REGRAS ABAIXO**
       Identifique os tipos de documentos financeiros e extraia os dados conforme especificado:

COMPROVANTES DE PAGAMENTO (Sicoob ou outro banco)
Características:
Conta pagadora geralmente: Sicoob
Informações vêm do comprovante + nome do arquivo

Dados a extrair:
DATA: Do comprovante (formato DD-MM)
NOME: Nome do recebedor
DESCRIÇÃO: Extraída do nome do arquivo
VALOR: Valor pago

FORMATO DE RETORNO:
DD-MM NOME (DESCRIÇÃO) XXX,XX

EXEMPLO:
02-07 FERRO MIX COMERCIAL LTDA (FERRAGISTA) 288,00
03-07 FABRICIO RODRIGUES DE ALMEIDA (GRÁFICA) 150,00

**REGRAS GERAIS (Fliper)**
-Use "ND" para dados não encontrados
-Sempre retorne apenas no formato especificado
-O formato da data deve ser DD-MM
-O valor deve conter ponto como separador decimal, com duas casas
-A descrição entre parênteses sempre virá do nome do arquivo
-Nas “Contas a Pagar”, considere sempre que o pagamento foi feito (mesmo sem verificação bancária)
        `
    }
  }
};

/**
 * Prompts de validação e teste
 */
export const VALIDATION = {
  API_TEST: "pizza" // Prompt de teste
};


/**
 * Lista todas as empresas disponíveis
 * @returns {Array<Object>} Lista de empresas com id, nome e ícone
 */
export function getAvailableCompanies() {
  return Object.entries(COMPANIES).map(([id, config]) => ({
    id,
    name: config.name,
    icon: config.icon
  }));
}

/**
 * Retorna o prompt baseado na empresa e tipo de análise
 * @param {string} company - ID da empresa (enia-marcia-joias, eletromoveis, marcmix)
 * @param {string} analysisType - Tipo de análise (financial-receipt, financial-payment)
 * @returns {string} Prompt correspondente
 */
export function getPrompt(company, analysisType) {
  // Fallback para compatibilidade com código existente
  if (typeof company === 'string' && !analysisType) {
    analysisType = company;
    company = 'enia-marcia-joias'; // empresa padrão
  }

  const companyConfig = COMPANIES[company];
  if (!companyConfig) {
    console.warn(`Empresa não encontrada: ${company}. Usando padrão.`);
    company = 'enia-marcia-joias';
  }

  const prompts = {
    'financial-receipt': COMPANIES[company]?.FINANCIAL?.RECEIPT,
    'financial-payment': COMPANIES[company]?.FINANCIAL?.PAYMENT,
    'default': VALIDATION.API_TEST
  };

  return prompts[analysisType] || prompts['default'];
}

/**
 * Lista todos os tipos de análise disponíveis
 * @returns {Array<string>} Lista de tipos de análise
 */
export function getAvailableAnalysisTypes() {
  return [
    'financial-receipt',
    'financial-payment'
  ];
}

/**
 * Retorna informações da empresa
 * @param {string} companyId - ID da empresa
 * @returns {Object} Configuração da empresa
 */
export function getCompanyInfo(companyId) {
  return COMPANIES[companyId] || COMPANIES['enia-marcia-joias'];
}

export default {
  GLOBAL_SYSTEM_INSTRUCTIONS,
  COMPANIES,
  VALIDATION,
  getPrompt,
  getAvailableAnalysisTypes,
  getAvailableCompanies,
  getCompanyInfo
};