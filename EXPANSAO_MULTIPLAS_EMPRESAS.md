# Expansão para Múltiplas Empresas - Leitor de Fotos IA

## Resumo
Implementação completa de suporte para múltiplas empresas no sistema de análise de documentos financeiros, permitindo alternar entre **Enia Marcia Joias** e **Eletromoveis** com prompts específicos para cada negócio.

## Principais Mudanças Implementadas

### 1. Refatoração da Estrutura de Prompts (`src/config/prompts.js`)

#### Antes:
```javascript
export const PROMPTS = {
  FINANCIAL: {
    RECEIPT: "prompt para joias...",
    PAYMENT: "prompt para joias..."
  }
}
```

#### Depois:
```javascript
export const PROMPTS = {
  COMPANIES: {
    'enia-marcia-joias': {
      name: 'Enia Marcia Joias',
      icon: 'fas fa-gem',
      FINANCIAL: {
        RECEIPT: "prompts específicos para joias...",
        PAYMENT: "prompts específicos para joias..."
      }
    },
    'eletromoveis': {
      name: 'Eletromoveis', 
      icon: 'fas fa-car-battery',
      FINANCIAL: {
        RECEIPT: "prompts específicos para setor automotivo...",
        PAYMENT: "prompts específicos para setor automotivo..."
      }
    }
  }
}
```

#### Novas Funções:
- `getAvailableCompanies()` - Lista empresas disponíveis
- `getPrompt(company, analysisType)` - Obtém prompt específico da empresa
- `getCompanyInfo(companyId)` - Informações da empresa

### 2. Interface de Seleção de Empresa (`web-interface/public/index.html`)

Adicionada nova seção antes do upload:
```html
<!-- Company Selection Section -->
<section class="company-section">
    <div class="company-container">
        <h3><i class="fas fa-building"></i> Selecione a Empresa</h3>
        <div class="company-tabs">
            <button class="company-tab active" data-company="enia-marcia-joias">
                <i class="fas fa-gem"></i>
                <span>Enia Marcia Joias</span>
            </button>
            <button class="company-tab" data-company="eletromoveis">
                <i class="fas fa-car-battery"></i>
                <span>Eletromoveis</span>
            </button>
        </div>
    </div>
</section>
```

### 3. Estilos CSS para Abas de Empresa (`web-interface/public/style.css`)

Implementados estilos modernos com:
- Animações suaves
- Gradientes elegantes
- Design responsivo
- Estados hover e ativo
- Compatibilidade com tema escuro existente

### 4. Lógica JavaScript (`web-interface/public/script.js`)

#### Novas Variáveis:
```javascript
let selectedCompany = localStorage.getItem('selectedCompany') || 'enia-marcia-joias';
const companyTabs = document.querySelectorAll('.company-tab');
```

#### Novas Funções:
- `initializeCompanySelection()` - Inicializa empresa selecionada
- `updateCompanyTabs()` - Atualiza estado visual das abas
- `handleCompanyChange(companyId)` - Gerencia mudança de empresa

#### Persistência:
- Empresa selecionada salva no `localStorage`
- Mantém preferência entre sessões

### 5. Atualização do Backend (`web-interface/server.js`)

#### Endpoints Atualizados:
- `/api/analyze` - Aceita parâmetro `company`
- `/api/analyze-base64` - Aceita parâmetro `company`
- `/api/download-renamed` - Aceita parâmetro `company`
- `/api/download-multiple-renamed` - Aceita parâmetro `company`

#### Logs Melhorados:
```javascript
console.log(`🏢 Empresa: ${company}`);
```

### 6. Atualização do GeminiService (`src/services/GeminiService.js`)

Função `analyzeReceipt` atualizada para aceitar:
```javascript
async analyzeReceipt(
  imageData, 
  mimeType = 'image/jpeg', 
  customPrompt = null, 
  forceStructuredFormat = true, 
  fileName = '', 
  fileIndex = null, 
  company = 'enia-marcia-joias',  // NOVO
  analysisType = 'financial-receipt' // NOVO
)
```

## Prompts Específicos por Empresa

### Enia Marcia Joias
- **Foco**: Ordens de serviço de joias, comprovantes Stone/Sicoob
- **Formato**: `XX-XX VENDA XXXX NOME_CLIENTE XXX,XX`
- **Documentos**: Ordens de serviço, comprovantes de recebimento, comprovantes de venda

### Eletromoveis  
- **Foco**: Setor automotivo e elétrico
- **Formatos**: 
  - Recebimento: `XX-XX SERVICO/VENDA/INSTALACAO XXXX NOME_CLIENTE XXX,XX`
  - Pagamento: `XX-XX COMPRA/PAGAMENTO/ENERGIA/TRANSFERENCIA XXXX NOME XXX,XX`
- **Documentos**: Notas fiscais de serviço, OS automotiva, vendas de peças, instalações, faturas de energia

## Funcionalidades

### ✅ Implementado:
1. **Seleção de Empresa**: Abas elegantes com ícones específicos
2. **Prompts Específicos**: Cada empresa tem prompts otimizados para seu negócio
3. **Persistência**: Empresa selecionada é salva entre sessões
4. **Feedback Visual**: Toasts informativos sobre mudanças
5. **Compatibilidade**: Funciona com análise única e múltipla
6. **Design Responsivo**: Interface adaptável para mobile
7. **Retrocompatibilidade**: Sistema mantém funcionamento com código existente

### 🎯 Benefícios:
- **Escalabilidade**: Fácil adição de novas empresas
- **Manutenibilidade**: Código bem estruturado e organizado
- **Usabilidade**: Interface intuitiva e elegante
- **Performance**: Carregamento otimizado e cache eficiente

## Como Adicionar Nova Empresa

1. **Adicionar em `prompts.js`**:
```javascript
'nova-empresa': {
  name: 'Nova Empresa',
  icon: 'fas fa-building',
  FINANCIAL: {
    RECEIPT: "prompt específico...",
    PAYMENT: "prompt específico..."
  }
}
```

2. **Adicionar aba no HTML**:
```html
<button class="company-tab" data-company="nova-empresa">
    <i class="fas fa-building"></i>
    <span>Nova Empresa</span>
</button>
```

3. **Atualizar função de nomes**:
```javascript
const companyNames = {
  'enia-marcia-joias': 'Enia Marcia Joias',
  'eletromoveis': 'Eletromoveis',
  'nova-empresa': 'Nova Empresa' // ADICIONAR
};
```

## Arquivos Modificados

- ✅ `src/config/prompts.js` - Estrutura multi-empresa
- ✅ `src/services/GeminiService.js` - Suporte a empresa
- ✅ `web-interface/public/index.html` - Interface de seleção
- ✅ `web-interface/public/style.css` - Estilos das abas
- ✅ `web-interface/public/script.js` - Lógica de gerenciamento
- ✅ `web-interface/server.js` - Endpoints atualizados

## Testes Recomendados

1. **Troca de Empresa**: Verificar se a mudança persiste
2. **Análise Única**: Testar com documentos de cada empresa
3. **Análise Múltipla**: Verificar processamento em lote
4. **Responsividade**: Testar em diferentes tamanhos de tela
5. **Compatibilidade**: Verificar funcionamento com histórico existente

---

## Conclusão

A implementação foi realizada seguindo as melhores práticas de desenvolvimento, mantendo a escalabilidade e manutenibilidade do código. O sistema agora suporta múltiplas empresas de forma elegante e eficiente, pronto para futuras expansões. 