// Estado da aplicação
let currentFile = null;
let currentFiles = []; // Array para múltiplas imagens
let isMultipleMode = false; // Flag para modo múltiplas imagens
let selectedCompany = localStorage.getItem('selectedCompany') || 'enia-marcia-joias'; // Empresa selecionada
let analysisHistory = loadAnalysisHistory();
let geminiInitialized = false; // Flag para indicar se o Gemini foi inicializado

// Estado do histórico
let filteredHistory = [];
let currentHistoryTab = 'all';
let currentDateFilter = 'all';
let currentSearchTerm = '';
let historyPage = 1;
const historyItemsPerPage = 10;

// Elementos DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const imageInfo = document.getElementById('imageInfo');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const analysisResult = document.getElementById('analysisResult');
const analysisTypeBadge = document.getElementById('analysisTypeBadge');
const timestamp = document.getElementById('timestamp');
const historyList = document.getElementById('historyList');
const toastContainer = document.getElementById('toastContainer');

// Elementos DOM para resultados
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadRenamedBtn = document.getElementById('downloadRenamedBtn');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');

// Elementos DOM para múltiplas imagens
const multipleImagesToggle = document.getElementById('multipleImagesToggle');
const multiplePreviewSection = document.getElementById('multiplePreviewSection');
const multipleImagesGrid = document.getElementById('multipleImagesGrid');
const imageCount = document.getElementById('imageCount');
const analyzeAllBtn = document.getElementById('analyzeAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const multipleResultsSection = document.getElementById('multipleResultsSection');
const multipleResultsGrid = document.getElementById('multipleResultsGrid');
const resultsCount = document.getElementById('resultsCount');
const multipleAnalysisTypeBadge = document.getElementById('multipleAnalysisTypeBadge');
const multipleTimestamp = document.getElementById('multipleTimestamp');
const copyAllBtn = document.getElementById('copyAllBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadAllRenamedBtn = document.getElementById('downloadAllRenamedBtn');
const newMultipleAnalysisBtn = document.getElementById('newMultipleAnalysisBtn');

// Elementos DOM para seleção de empresa
const companyTabs = document.querySelectorAll('.company-tab');

// Elementos DOM para histórico
const historySearch = document.getElementById('historySearch');
const dateFilter = document.getElementById('dateFilter');
const historyTabs = document.querySelectorAll('.history-tab');
const historyPagination = document.getElementById('historyPagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const paginationInfo = document.getElementById('paginationInfo');
const countAll = document.getElementById('countAll');
const countReceipt = document.getElementById('countReceipt');
const countPayment = document.getElementById('countPayment');

// Elementos DOM para configuração da API
const apiConfigSection = document.getElementById('apiConfigSection');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiBtn = document.getElementById('saveApiBtn');
const testApiBtn = document.getElementById('testApiBtn');
const toggleVisibilityBtn = document.getElementById('toggleVisibilityBtn');
const statusIndicator = document.getElementById('statusIndicator');

// Adiciona elemento de progresso ao HTML
const progressSection = document.createElement('div');
progressSection.id = 'progressSection';
progressSection.style.display = 'none';
progressSection.innerHTML = `
  <div class="progress-container">
    <h3 class="progress-title">Processando imagens...</h3>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
    <div class="progress-status">
      <span class="progress-text">Preparando...</span>
      <span class="progress-percentage">0%</span>
    </div>
    <div class="progress-details">
      <div>Total: <span class="progress-total">0</span></div>
      <div>Processadas: <span class="progress-processed">0</span></div>
      <div>Erros: <span class="progress-errors">0</span></div>
    </div>
  </div>
`;
document.querySelector('.main-content').appendChild(progressSection);

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se os elementos essenciais foram carregados
    if (!validateDOMElements()) {
        console.error('Elementos DOM essenciais não encontrados. Verifique o HTML.');
        showToast('Erro de carregamento da página. Recarregue a página.', 'error');
        return;
    }
    
    initializeEventListeners();
    initializeCompanySelection();
    await initializeApiConfiguration();
    loadHistory();
});

// Função para validar elementos DOM essenciais
function validateDOMElements() {
    const essentialElements = [
        'uploadArea', 'fileInput', 'historyList', 'toastContainer'
    ];
    
    for (const elementId of essentialElements) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Elemento essencial não encontrado: ${elementId}`);
            return false;
        }
    }
    
    return true;
}

// Funções de configuração da API
async function initializeApiConfiguration() {
    // Oculta a seção de configuração da API, pois estamos usando chaves internas
    if (apiConfigSection) {
        apiConfigSection.style.display = 'none';
    }
    
    // Adiciona event listeners para configuração da API (mantidos para compatibilidade)
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', saveApiConfiguration);
    }
    
    if (testApiBtn) {
        testApiBtn.addEventListener('click', testApiConfiguration);
    }
    
    if (toggleVisibilityBtn) {
        toggleVisibilityBtn.addEventListener('click', toggleApiKeyVisibility);
    }
    
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveApiConfiguration();
            }
        });
    }
    
    // Verifica se o Gemini está inicializado (sempre estará com as chaves internas)
    await checkApiStatus();
}

async function checkApiStatus() {
    try {
        // Verifica se o Gemini está inicializado com as chaves internas
        if (window.tauriIntegration && window.tauriIntegration.isGeminiInitialized) {
            updateApiStatus(true, 'API configurada com chaves internas');
            geminiInitialized = true;
            hideApiConfigSection();
        } else {
            // Tenta inicializar com as chaves internas
            const result = await window.tauriIntegration.initializeGemini();
            if (result && result.success) {
                updateApiStatus(true, 'API configurada com chaves internas');
                geminiInitialized = true;
                hideApiConfigSection();
            } else {
                updateApiStatus(false, 'Falha ao inicializar API');
                showApiConfigSection();
            }
        }
    } catch (error) {
        console.error('Erro ao verificar status da API:', error);
        // Tenta novamente com as chaves internas
        try {
            const result = await window.tauriIntegration.initializeGemini();
            if (result && result.success) {
                updateApiStatus(true, 'API configurada com chaves internas');
                geminiInitialized = true;
                hideApiConfigSection();
            } else {
                throw new Error('Falha ao inicializar API');
            }
        } catch (retryError) {
            console.error('Erro ao inicializar API:', retryError);
            updateApiStatus(false, 'Falha ao inicializar API');
            showApiConfigSection();
        }
    }
}

async function saveApiConfiguration() {
    // Esta função é mantida para compatibilidade, mas agora usa as chaves internas
    try {
        saveApiBtn.disabled = true;
        saveApiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Configurando...';
        
        // Inicializa o Gemini com as chaves internas
        const result = await window.tauriIntegration.initializeGemini();
        
        if (result && result.success) {
            geminiInitialized = true;
            updateApiStatus(true, 'API configurada com chaves internas');
            showToast('API Gemini configurada com sucesso!', 'success');
            
            // Oculta a seção de configuração após sucesso
            setTimeout(() => {
                hideApiConfigSection();
            }, 2000);
        } else {
            throw new Error('Falha ao configurar API com chaves internas');
        }
    } catch (error) {
        console.error('Erro ao configurar API:', error);
        updateApiStatus(false, 'Erro na configuração');
        showToast(`Erro ao configurar API: ${error.message}`, 'error');
    } finally {
        saveApiBtn.disabled = false;
        saveApiBtn.innerHTML = '<i class="fas fa-save"></i> Salvar e Configurar';
    }
}

async function testApiConfiguration() {
    if (!geminiInitialized) {
        showToast('API não inicializada', 'warning');
        return;
    }
    
    try {
        testApiBtn.disabled = true;
        testApiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testando...';
        
        // Testa a API usando uma chave interna
        const apiKey = window.tauriIntegration.getNextKey();
        
        // Faz uma requisição simples para a API do Gemini
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: "Olá, este é um teste da API. Por favor, responda apenas com 'API funcionando corretamente'." }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 10,
            }
        };
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            showToast('API funcionando corretamente!', 'success');
            updateApiStatus(true, 'API testada e funcionando');
        } else {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('Erro no teste da API:', error);
        showToast(`Erro no teste da API: ${error.message}`, 'error');
        updateApiStatus(false, 'Erro no teste da API');
    } finally {
        testApiBtn.disabled = false;
        testApiBtn.innerHTML = '<i class="fas fa-vial"></i> Testar API';
    }
}

function toggleApiKeyVisibility() {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    
    const icon = toggleVisibilityBtn.querySelector('i');
    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function updateApiStatus(isConfigured, message) {
    if (!statusIndicator) return;
    
    const icon = statusIndicator.querySelector('i');
    const span = statusIndicator.querySelector('span');
    
    if (isConfigured) {
        statusIndicator.className = 'status-indicator status-success';
        icon.className = 'fas fa-check-circle';
        if (testApiBtn) testApiBtn.style.display = 'inline-block';
    } else {
        statusIndicator.className = 'status-indicator status-error';
        icon.className = 'fas fa-times-circle';
        if (testApiBtn) testApiBtn.style.display = 'none';
    }
    
    span.textContent = message;
}

function showApiConfigSection() {
    if (apiConfigSection) {
        apiConfigSection.style.display = 'block';
    }
}

function hideApiConfigSection() {
    if (apiConfigSection) {
        apiConfigSection.style.display = 'none';
    }
}

function initializeEventListeners() {
    // File upload events
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Analysis and action buttons
    if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeImage);
    if (copyBtn) copyBtn.addEventListener('click', copyResult);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadResult);
    if (downloadRenamedBtn) downloadRenamedBtn.addEventListener('click', downloadRenamedImage);
    if (newAnalysisBtn) newAnalysisBtn.addEventListener('click', newAnalysis);
    
    // Multiple images events
    if (multipleImagesToggle) multipleImagesToggle.addEventListener('change', toggleMultipleMode);
    if (analyzeAllBtn) analyzeAllBtn.addEventListener('click', analyzeMultipleImages);
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllImages);
    if (copyAllBtn) copyAllBtn.addEventListener('click', copyAllResults);
    if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllResults);
    if (downloadAllRenamedBtn) downloadAllRenamedBtn.addEventListener('click', downloadAllRenamedImages);
    if (newMultipleAnalysisBtn) newMultipleAnalysisBtn.addEventListener('click', newAnalysis);
    
    // Company selection events
    if (companyTabs && companyTabs.length > 0) {
        companyTabs.forEach(tab => {
            tab.addEventListener('click', () => handleCompanyChange(tab.dataset.company));
        });
    }
    
    // Error handling
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            if (isMultipleMode && currentFiles.length > 0) {
                analyzeMultipleImages();
            } else if (currentFile) {
                analyzeImage();
            }
        });
    }

    // History events
    if (historySearch) {
        historySearch.addEventListener('input', debounce(handleHistorySearch, 300));
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', handleDateFilterChange);
    }
    
    if (historyTabs && historyTabs.length > 0) {
        historyTabs.forEach(tab => {
            tab.addEventListener('click', () => handleTabChange(tab.dataset.tab));
        });
    }
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => changeHistoryPage(-1));
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => changeHistoryPage(1));
    }
}

// Drag and Drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        if (isMultipleMode) {
            handleMultipleFiles(files);
        } else {
            handleFile(files[0]);
        }
    }
}

// File selection handlers
function handleFileSelect(e) {
    const files = e.target.files;
    
    // Debug: log para verificar se o evento está sendo disparado
    console.log('handleFileSelect chamado, arquivos:', files.length);
    
    if (files.length > 0) {
        if (isMultipleMode) {
            handleMultipleFiles(files);
        } else {
            handleFile(files[0]);
        }
    }
    
    // Força o reset do input para permitir seleção do mesmo arquivo novamente
    setTimeout(() => {
        e.target.value = '';
    }, 100);
}

function handleFile(file) {
    console.log('handleFile chamado com:', file.name);
    
    // Valida tipo de arquivo
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    
    if (!isImage && !isPDF) {
        showToast('Por favor, selecione apenas arquivos de imagem (JPEG, PNG, GIF, WebP, BMP) ou documentos PDF.', 'error');
        return;
    }
    
    // Valida tamanho (20MB)
    if (file.size > 20 * 1024 * 1024) {
        showToast('Arquivo muito grande! Máximo permitido: 20MB', 'error');
        return;
    }
    
    currentFile = file;
    showPreview(file);
}

function showPreview(file) {
    const isPDF = file.type === 'application/pdf';
    
    if (isPDF) {
        // Para PDFs, mostra um ícone e informações
        previewImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDIwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiNFRjQ0NDQiLz4KPHN2ZyB4PSI3MCIgeT0iODAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xNCAySDZhMiAyIDAgMCAwLTIgMnYxNmEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJWOGwtNi02eiIvPgo8cGF0aCBkPSJNMTQgMnY2aDYiLz4KPHN2ZyB4PSI2IiB5PSIxNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjQiPgo8dGV4dCB4PSI2IiB5PSIzIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMyIgZmlsbD0id2hpdGUiPlBERjwvdGV4dD4KPC9zdmc+Cjwvc3ZnPgo8L3N2Zz4K';
        previewImage.alt = 'PDF Document';
        previewImage.style.objectFit = 'contain';
        previewImage.style.backgroundColor = '#f8f9fa';
        
        imageInfo.innerHTML = `
            <div class="file-info">
                <div class="file-type-badge pdf-badge">📄 PDF</div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
    } else {
        // Para imagens, mostra preview normal
        const reader = new FileReader();
        
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.alt = 'Preview da imagem';
            previewImage.style.objectFit = 'cover';
            previewImage.style.backgroundColor = 'transparent';
            
            imageInfo.innerHTML = `
                <div class="file-info">
                    <div class="file-type-badge image-badge">🖼️ Imagem</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${formatFileSize(file.size)}</div>
                    </div>
                </div>
            `;
        };
        
        reader.readAsDataURL(file);
    }
    
    // Mostra seção de preview
    hideAllSections();
    previewSection.style.display = 'block';
    previewSection.classList.add('fade-in');
}

async function analyzeImage() {
    if (!currentFile) {
        showToast('Nenhuma imagem selecionada.', 'error');
        return;
    }

    // Verifica se a API está configurada
    if (!geminiInitialized) {
        showToast('Configure a API Gemini primeiro', 'error');
        showApiConfigSection();
        return;
    }
    
    // Obtém tipo de análise selecionado
    const analysisType = document.querySelector('input[name="analysisType"]:checked').value;
    
    // Mostra loading
    hideAllSections();
    loadingSection.style.display = 'block';
    loadingSection.classList.add('fade-in');
    
    try {
        let result;
        
        // Usa a nova integração Tauri nativa
        if (window.tauriIntegration?.isRunningInTauri) {
            result = await window.tauriIntegration.analyzeFile(
                currentFile, 
                analysisType, 
                selectedCompany, 
                true // forceStructuredFormat
            );
            
            // Adapta o resultado para o formato esperado
            const adaptedResult = {
                analysis: result.content,
                analysisType: result.analysis_type,
                originalName: result.file_name,
                fileSize: result.file_size,
                timestamp: result.timestamp
            };
            
            showResults(adaptedResult);
            addToHistory(adaptedResult);
            showToast('Análise concluída com sucesso!', 'success');
        } else {
            // Fallback para modo web (usando fetch)
            const formData = new FormData();
            formData.append('image', currentFile);
            formData.append('analysisType', analysisType);
            formData.append('company', selectedCompany);
            
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Servidor retornou ${response.status}: ${response.statusText}. Resposta não é JSON válida.`);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const apiResult = await response.json();
            
            if (apiResult.success) {
                showResults(apiResult.data);
                addToHistory(apiResult.data);
                showToast('Análise concluída com sucesso!', 'success');
            } else {
                throw new Error(apiResult.error || 'Erro desconhecido');
            }
        }
        
    } catch (error) {
        console.error('Erro na análise:', error);
        showError(error.message);
        showToast('Erro na análise da imagem.', 'error');
    }
}

function showResults(data) {
    hideAllSections();
    
    // Verifica se os dados necessários existem
    if (!data || !data.analysisType) {
        showError('Dados de análise inválidos');
        return;
    }
    
    // Verifica se os elementos DOM necessários existem
    if (!analysisTypeBadge || !timestamp || !analysisResult || !resultsSection) {
        console.error('Elementos DOM necessários não encontrados para mostrar resultados');
        showToast('Erro interno: elementos da interface não encontrados.', 'error');
        return;
    }
    
    // Atualiza informações
    analysisTypeBadge.textContent = getAnalysisTypeName(data.analysisType);
    timestamp.textContent = formatTimestamp(data.timestamp || new Date().toISOString());
    
    // Verifica se a análise existe
    if (!data.analysis) {
        analysisResult.textContent = 'Resultado da análise não disponível';
        resultsSection.style.display = 'block';
        resultsSection.classList.add('fade-in');
        return;
    }
    
    // Para documentos financeiros, mostra o resultado de forma destacada
    if (data.analysisType === 'financial-receipt' || data.analysisType === 'financial-payment') {
        // Verifica se está no formato correto
        const receiptPattern = /^\d{2}-\d{2}\s+.+\s+[\d.,]+$/;
        if (receiptPattern.test(data.analysis.trim())) {
            analysisResult.innerHTML = `<div class="receipt-result">${data.analysis}</div>`;
        } else if (data.analysis.toLowerCase().includes('erro')) {
            analysisResult.innerHTML = `<div class="receipt-error">❌ ${data.analysis}</div>`;
        } else {
            analysisResult.innerHTML = `<div class="receipt-warning">⚠️ Formato inesperado: ${data.analysis}</div>`;
        }
    } else {
        analysisResult.textContent = data.analysis;
    }
    
    // Mostra seção de resultados
    resultsSection.style.display = 'block';
    resultsSection.classList.add('fade-in');
    
    // Scroll suave para a seção de resultados
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function showError(message) {
    hideAllSections();
    
    const errorMessage = document.getElementById('errorMessage');
    if (!errorMessage || !errorSection) {
        console.error('Elementos DOM de erro não encontrados');
        showToast(`Erro: ${message}`, 'error');
        return;
    }
    
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    errorSection.classList.add('fade-in');
}

function hideAllSections() {
    [previewSection, multiplePreviewSection, loadingSection, resultsSection, multipleResultsSection, errorSection].forEach(section => {
        section.style.display = 'none';
        section.classList.remove('fade-in');
    });
}

// History functions
function addToHistory(data) {
    const historyItem = {
        id: Date.now(),
        ...data,
        fileName: currentFile.name
    };
    
    analysisHistory.unshift(historyItem);
    
    // Limita histórico a 50 itens
    if (analysisHistory.length > 50) {
        analysisHistory = analysisHistory.slice(0, 50);
    }
    
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
    loadHistory();
}

function loadHistory() {
    // Atualiza contadores
    updateHistoryCounts();
    
    // Aplica filtros
    applyHistoryFilters();
    
    // Renderiza histórico
    renderHistory();
}

function updateHistoryCounts() {
    const receiptCount = analysisHistory.filter(item => item.analysisType === 'financial-receipt').length;
    const paymentCount = analysisHistory.filter(item => item.analysisType === 'financial-payment').length;
    const totalCount = analysisHistory.length;
    
    if (countAll) countAll.textContent = totalCount;
    if (countReceipt) countReceipt.textContent = receiptCount;
    if (countPayment) countPayment.textContent = paymentCount;
}

function applyHistoryFilters() {
    let filtered = [...analysisHistory];
    
    // Filtro por aba/tipo
    if (currentHistoryTab !== 'all') {
        filtered = filtered.filter(item => item.analysisType === currentHistoryTab);
    }
    
    // Filtro por data
    if (currentDateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.timestamp);
            
            switch (currentDateFilter) {
                case 'today':
                    return itemDate >= today;
                case 'week':
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return itemDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                    return itemDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    // Filtro por busca
    if (currentSearchTerm.trim()) {
        const searchTerm = currentSearchTerm.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const fileName = (item.fileName || '').toLowerCase();
            const analysis = (item.analysis || '').toLowerCase();
            const analysisType = getAnalysisTypeName(item.analysisType).toLowerCase();
            
            return fileName.includes(searchTerm) || 
                   analysis.includes(searchTerm) || 
                   analysisType.includes(searchTerm);
        });
    }
    
    filteredHistory = filtered;
    
    // Reset página se necessário
    const totalPages = Math.ceil(filteredHistory.length / historyItemsPerPage);
    if (historyPage > totalPages) {
        historyPage = Math.max(1, totalPages);
    }
}

function renderHistory() {
    if (!historyList) {
        console.error('historyList não encontrado');
        return;
    }
    
    if (filteredHistory.length === 0) {
        historyList.innerHTML = `
            <p class="no-history">
                ${currentHistoryTab === 'all' && currentDateFilter === 'all' && !currentSearchTerm.trim() 
                    ? 'Nenhuma análise realizada ainda.' 
                    : 'Nenhuma análise encontrada com os filtros aplicados.'}
            </p>
        `;
        if (historyPagination) {
            historyPagination.style.display = 'none';
        }
        return;
    }
    
    // Calcula paginação
    const startIndex = (historyPage - 1) * historyItemsPerPage;
    const endIndex = startIndex + historyItemsPerPage;
    const pageItems = filteredHistory.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredHistory.length / historyItemsPerPage);
    
    // Renderiza itens
    historyList.innerHTML = pageItems.map(item => {
        let resultText = '';
        let fileName = '';
        
        if (item.isMultiple) {
            fileName = `${item.totalImages} imagens`;
            resultText = `${item.successCount} analisadas com sucesso`;
        } else {
            fileName = item.fileName || 'Imagem';
            if (item.analysis && typeof item.analysis === 'string') {
                resultText = highlightSearchTerm(
                    `${item.analysis.substring(0, 150)}${item.analysis.length > 150 ? '...' : ''}`,
                    currentSearchTerm
                );
            } else {
                resultText = 'Análise não disponível';
            }
        }
        
        return `
            <div class="history-item ${currentSearchTerm.trim() ? 'highlighted' : ''}" 
                 data-type="${item.analysisType}" 
                 data-history-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-type">${getAnalysisTypeName(item.analysisType)}</span>
                    <span class="history-item-time">
                        <i class="fas fa-clock"></i>
                        ${formatTimestamp(item.timestamp)}
                    </span>
                </div>
                <div class="history-item-result">
                    <strong>${highlightSearchTerm(fileName, currentSearchTerm)}</strong><br>
                    ${resultText}
                </div>
            </div>
        `;
    }).join('');
    
    // Adiciona event listeners para os itens do histórico
    const historyItems = historyList.querySelectorAll('.history-item[data-history-id]');
    historyItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const historyId = parseInt(item.dataset.historyId);
            if (!isNaN(historyId)) {
                showHistoryResult(historyId);
            } else {
                console.error('ID do histórico inválido:', item.dataset.historyId);
                showToast('Erro ao abrir item do histórico.', 'error');
            }
        });
        
        // Adiciona estilo de cursor pointer
        item.style.cursor = 'pointer';
    });
    
    // Atualiza paginação
    updateHistoryPagination(totalPages);
}

function updateHistoryPagination(totalPages) {
    if (totalPages <= 1) {
        if (historyPagination) {
            historyPagination.style.display = 'none';
        }
        return;
    }
    
    if (historyPagination) {
        historyPagination.style.display = 'flex';
    }
    
    if (prevPageBtn) {
        prevPageBtn.disabled = historyPage <= 1;
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = historyPage >= totalPages;
    }
    
    if (paginationInfo) {
        paginationInfo.textContent = `Página ${historyPage} de ${totalPages}`;
    }
}

function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm.trim())})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Event handlers para histórico
function handleHistorySearch(event) {
    currentSearchTerm = event.target.value;
    historyPage = 1;
    applyHistoryFilters();
    renderHistory();
}

function handleDateFilterChange(event) {
    currentDateFilter = event.target.value;
    historyPage = 1;
    applyHistoryFilters();
    renderHistory();
}

function handleTabChange(tabName) {
    currentHistoryTab = tabName;
    historyPage = 1;
    
    // Atualiza visual das abas
    historyTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Adiciona animação de transição
    if (historyList) {
        historyList.classList.add('changing');
        setTimeout(() => {
            applyHistoryFilters();
            renderHistory();
            historyList.classList.remove('changing');
            historyList.classList.add('loaded');
            setTimeout(() => historyList.classList.remove('loaded'), 300);
        }, 150);
    }
}

function changeHistoryPage(direction) {
    const totalPages = Math.ceil(filteredHistory.length / historyItemsPerPage);
    const newPage = historyPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        historyPage = newPage;
        renderHistory();
        
        // Scroll suave para o topo da lista
        if (historyList) {
            historyList.scrollTop = 0;
        }
    }
}

// Utility function para debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showHistoryResult(id) {
    try {
        const item = analysisHistory.find(h => h.id === id);
        if (!item) {
            console.error('Item do histórico não encontrado:', id);
            showToast('Item do histórico não encontrado.', 'error');
            return;
        }

        if (item.isMultiple) {
            // Para análises múltiplas, mostra os resultados múltiplos
            if (item.results && Array.isArray(item.results)) {
                showMultipleResults(item.results, item.analysisType);
            } else {
                console.error('Dados de análise múltipla inválidos:', item);
                showToast('Dados de análise múltipla inválidos.', 'error');
            }
        } else {
            // Para análises simples, mostra resultado normal
            if (item.analysis && item.analysisType) {
                showResults(item);
            } else {
                console.error('Dados de análise simples inválidos:', item);
                showToast('Dados de análise inválidos.', 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao mostrar resultado do histórico:', error);
        showToast('Erro ao exibir resultado do histórico.', 'error');
    }
}

// Action functions
async function copyResult() {
    try {
        await navigator.clipboard.writeText(analysisResult.textContent);
        showToast('Resultado copiado para a área de transferência!', 'success');
    } catch (error) {
        console.error('Erro ao copiar:', error);
        showToast('Erro ao copiar resultado.', 'error');
    }
}

function downloadResult() {
    const content = `Análise de Imagem - ${getAnalysisTypeName(document.querySelector('input[name="analysisType"]:checked').value)}
Data: ${new Date().toLocaleString('pt-BR')}
Arquivo: ${currentFile ? currentFile.name : 'N/A'}

Resultado:
${analysisResult.textContent}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    showToast('Resultado baixado com sucesso!', 'success');
}

// Variável para controlar se um download único está em andamento
let isSingleDownloadInProgress = false;

async function downloadRenamedImage() {
    // Proteção contra cliques múltiplos
    if (isSingleDownloadInProgress) {
        console.log('⚠️ Download único já está em andamento, ignorando clique adicional');
        showToast('Processamento já está em andamento, aguarde...', 'warning');
        return;
    }
    
    if (!currentFile) {
        showToast('Nenhuma imagem selecionada.', 'error');
        return;
    }
    
    try {
        // Marca que um download está em andamento
        isSingleDownloadInProgress = true;
        
        // Desabilita o botão visualmente
        const downloadBtn = document.getElementById('downloadRenamedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.classList.add('btn-disabled');
        }
        
        showToast('Processando download renomeado...', 'info');
        
        const analysisType = document.querySelector('input[name="analysisType"]:checked').value;
        
        // Prepara FormData
        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('analysisType', analysisType);
        formData.append('company', selectedCompany);
        
        // Faz requisição para API de download renomeado
        const response = await fetch('/api/download-renamed', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Erro no servidor: ${response.status}`);
        }
        
        // Obtém o nome do arquivo do header
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'imagem_renomeada.jpg';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) {
                fileName = match[1];
            }
        }
        
        // Baixa o arquivo
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        showToast(`Imagem renomeada baixada: ${fileName}`, 'success');
        
    } catch (error) {
        console.error('Erro no download renomeado:', error);
        showToast('Erro ao baixar imagem renomeada.', 'error');
    } finally {
        // Sempre reseta o estado de download e reativa o botão, independente de sucesso ou erro
        isSingleDownloadInProgress = false;
        
        // Reativa o botão
        const downloadBtn = document.getElementById('downloadRenamedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('btn-disabled');
        }
        
        console.log('🔄 Sistema de download único resetado e pronto para nova operação');
    }
}

function newAnalysis() {
    // Limpa estado da aplicação
    currentFile = null;
    currentFiles = [];
    
    // Limpa input de arquivo
    fileInput.value = '';
    
    // Remove classes de dragover se existirem
    uploadArea.classList.remove('dragover');
    
    // Limpa preview de imagem
    if (previewImage) {
        previewImage.src = '';
    }
    if (imageInfo) {
        imageInfo.textContent = '';
    }
    
    // Limpa resultados anteriores
    if (analysisResult) {
        analysisResult.textContent = '';
        analysisResult.innerHTML = '';
    }
    
    // Limpa grids de múltiplas imagens
    if (multipleImagesGrid) {
        multipleImagesGrid.innerHTML = '';
    }
    if (multipleResultsGrid) {
        multipleResultsGrid.innerHTML = '';
    }
    
    // Reseta contadores
    if (imageCount) {
        imageCount.textContent = '0';
    }
    if (resultsCount) {
        resultsCount.textContent = '0';
    }
    
    // Limpa barras de progresso se existirem
    const progressBar = document.getElementById('multipleProgressBar');
    const progressText = document.getElementById('multipleProgressText');
    if (progressBar) {
        progressBar.remove();
    }
    if (progressText) {
        progressText.remove();
    }
    
    // Esconde todas as seções
    hideAllSections();
    
    // Reseta modo múltiplas imagens se necessário
    if (isMultipleMode) {
        multipleImagesToggle.checked = false;
        isMultipleMode = false;
        updateUploadAreaText();
    }
    
    // Reativa o sistema de upload
    reactivateUpload();
    
    // Volta para o início
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Pronto para nova análise!', 'success');
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getAnalysisTypeName(type) {
    const names = {
        'financial-receipt': 'Contas a Receber',
        'financial-payment': 'Contas a Pagar'
    };
    return names[type] || type;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Remove toast após 4 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + V para colar imagem
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        navigator.clipboard.read().then(clipboardItems => {
            for (const clipboardItem of clipboardItems) {
                for (const type of clipboardItem.types) {
                    if (type.startsWith('image/')) {
                        clipboardItem.getType(type).then(blob => {
                            const file = new File([blob], 'clipboard-image.png', { type });
                            handleFile(file);
                        });
                    }
                }
            }
        }).catch(error => {
            console.log('Clipboard API não disponível:', error);
        });
    }
    
    // Esc para nova análise
    if (e.key === 'Escape') {
        newAnalysis();
    }
    
    // Enter para analisar (se arquivo selecionado)
    if (e.key === 'Enter' && currentFile && previewSection.style.display === 'block') {
        analyzeImage();
    }
});

// Service Worker para cache (opcional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('Service Worker registration failed:', error);
        });
    });
}

// Função para teste de conectividade com retry
async function testConnection(retryCount = 0, maxRetries = 5) {
    try {
        console.log(`🔄 Testando conexão (tentativa ${retryCount + 1}/${maxRetries + 1})...`);
        
        const response = await fetch('/api/test');
        
        // Verifica se a resposta é realmente JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Servidor retornou ${response.status}: ${response.statusText}. Conteúdo não é JSON.`);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Conexão com API funcionando');
            return true;
        } else {
            console.warn('⚠️ API com problemas:', result.error);
            return false;
        }
    } catch (error) {
        console.error(`❌ Erro de conexão (tentativa ${retryCount + 1}):`, error.message);
        
        // Se ainda há tentativas restantes, tenta novamente
        if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Backoff exponencial, máximo 10s
            console.log(`⏳ Tentando novamente em ${delay/1000}s...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return testConnection(retryCount + 1, maxRetries);
        } else {
            console.error('❌ Falha definitiva na conexão após todas as tentativas');
            // Mostra toast de erro apenas se a interface estiver carregada
            if (typeof showToast === 'function') {
                showToast('Erro de conexão com o servidor. Verifique se a aplicação está funcionando corretamente.', 'error');
            }
            return false;
        }
    }
}

// Testa conexão após um delay maior para garantir que o servidor esteja pronto
setTimeout(() => {
    testConnection();
}, 5000); // Aumentado de 2s para 5s

// Função para verificar e carregar logo
function checkLogo() {
    const logoImage = document.getElementById('logoImage');
    const logoIcon = document.getElementById('logoIcon');
    
    if (logoImage && logoIcon) {
        logoImage.onload = function() {
            logoIcon.style.display = 'none';
            logoImage.style.display = 'block';
        };
        
        logoImage.onerror = function() {
            logoIcon.style.display = 'block';
            logoImage.style.display = 'none';
        };
        
        // Força verificação
        logoImage.src = logoImage.src;
    }
}

// Verifica logo ao carregar a página
checkLogo();

// ========== FUNÇÕES DE GERENCIAMENTO DE EMPRESA ==========

/**
 * Inicializa a seleção de empresa
 */
function initializeCompanySelection() {
    // Aplica a empresa selecionada nas abas
    updateCompanyTabs();
    
    // Mostra toast informativo sobre a empresa selecionada
    const companyNames = {
        'enia-marcia-joias': 'Enia Marcia Joias',
        'eletromoveis': 'Eletromoveis',
        'marcmix': 'MarcMix',
        'raquel-luc': 'Raquel Luc',
        'fliper': 'Fliper',
        'marcondes': 'Marcondes'
    };
    
    showToast(`Empresa selecionada: ${companyNames[selectedCompany]}`, 'info');
}

/**
 * Atualiza as abas de empresa para refletir a seleção atual
 */
function updateCompanyTabs() {
    if (companyTabs && companyTabs.length > 0) {
        companyTabs.forEach(tab => {
            if (tab.dataset.company === selectedCompany) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }
}

/**
 * Manipula a mudança de empresa
 * @param {string} companyId - ID da empresa selecionada
 */
function handleCompanyChange(companyId) {
    if (companyId === selectedCompany) {
        return; // Já está selecionada
    }
    
    selectedCompany = companyId;
    
    // Salva a preferência no localStorage
    localStorage.setItem('selectedCompany', selectedCompany);
    
    // Atualiza as abas
    updateCompanyTabs();
    
    // Mostra feedback visual
    const companyNames = {
        'enia-marcia-joias': 'Enia Marcia Joias',
        'eletromoveis': 'Eletromoveis',
        'marcmix': 'MarcMix',
        'raquel-luc': 'Raquel Luc',
        'fliper': 'Fliper',
        'marcondes': 'Marcondes'
    };
    
    showToast(`Empresa alterada para: ${companyNames[selectedCompany]}`, 'success');
    
    // Limpa resultados anteriores se houver
    if (resultsSection && resultsSection.style.display !== 'none') {
        hideAllSections();
        reactivateUpload();
    }
    
    if (multipleResultsSection && multipleResultsSection.style.display !== 'none') {
        hideAllSections();
        reactivateUpload();
    }
}

// ========== FUNÇÕES PARA MÚLTIPLAS IMAGENS ==========

function toggleMultipleMode() {
    isMultipleMode = multipleImagesToggle.checked;
    
    if (isMultipleMode) {
        // Limpa seleção única
        currentFile = null;
        hideAllSections();
        showToast('Modo múltiplas imagens ativado!', 'success');
    } else {
        // Limpa seleções múltiplas
        currentFiles = [];
        hideAllSections();
        showToast('Modo imagem única ativado!', 'success');
    }
    
    updateUploadAreaText();
}

function updateUploadAreaText() {
    const uploadContent = uploadArea.querySelector('.upload-content h3');
    const uploadDescription = uploadArea.querySelector('.upload-content p');
    
    if (isMultipleMode) {
        uploadContent.textContent = 'Arraste seus arquivos aqui';
        uploadDescription.innerHTML = 'ou <span class="upload-button-text">clique para selecionar múltiplos arquivos</span>';
    } else {
        uploadContent.textContent = 'Arraste seus arquivos aqui';
        uploadDescription.innerHTML = 'ou <span class="upload-button-text">clique para selecionar</span>';
    }
}

function handleMultipleFiles(files) {
    const validFiles = [];
    
    for (let file of files) {
        // Valida tipo de arquivo
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        
        if (!isImage && !isPDF) {
            showToast(`${file.name}: Apenas imagens e PDFs são permitidos.`, 'error');
            continue;
        }
        
        // Valida tamanho (20MB)
        if (file.size > 20 * 1024 * 1024) {
            showToast(`${file.name}: Arquivo muito grande! Máximo: 20MB`, 'error');
            continue;
        }
        
        // Verifica se já não foi adicionado
        if (!currentFiles.find(f => f.name === file.name && f.size === file.size)) {
            validFiles.push(file);
        }
    }
    
    if (validFiles.length > 0) {
        currentFiles.push(...validFiles);
        showMultiplePreview();
        const fileTypes = validFiles.some(f => f.type === 'application/pdf') ? 'arquivo(s)' : 'imagem(ns)';
        showToast(`${validFiles.length} ${fileTypes} adicionada(s)! Total: ${currentFiles.length}`, 'success');
    }
}

function showMultiplePreview() {
    if (currentFiles.length === 0) {
        hideAllSections();
        return;
    }
    
    hideAllSections();
    multiplePreviewSection.style.display = 'block';
    multiplePreviewSection.classList.add('fade-in');
    
    imageCount.textContent = currentFiles.length;
    multipleImagesGrid.innerHTML = '';
    
    currentFiles.forEach((file, index) => {
        const isPDF = file.type === 'application/pdf';
        
        if (isPDF) {
            // Para PDFs, mostra ícone
            const imageItem = document.createElement('div');
            imageItem.className = 'multiple-image-item pdf-item';
            imageItem.innerHTML = `
                <button class="remove-btn" onclick="removeImage(${index})" title="Remover arquivo">
                    <i class="fas fa-times"></i>
                </button>
                <div class="pdf-preview">
                    <div class="pdf-icon">📄</div>
                    <div class="pdf-label">PDF</div>
                </div>
                <div class="image-name">${file.name}</div>
                <div class="image-size">${formatFileSize(file.size)}</div>
            `;
            multipleImagesGrid.appendChild(imageItem);
        } else {
            // Para imagens, mostra preview normal
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'multiple-image-item';
                imageItem.innerHTML = `
                    <button class="remove-btn" onclick="removeImage(${index})" title="Remover imagem">
                        <i class="fas fa-times"></i>
                    </button>
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="image-name">${file.name}</div>
                    <div class="image-size">${formatFileSize(file.size)}</div>
                `;
                multipleImagesGrid.appendChild(imageItem);
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeImage(index) {
    currentFiles.splice(index, 1);
    showMultiplePreview();
    showToast('Arquivo removido!', 'success');
}

function clearAllImages() {
    currentFiles = [];
    hideAllSections();
    showToast('Todos os arquivos foram removidos!', 'success');
}

async function analyzeMultipleImages() {
    if (currentFiles.length === 0) {
        showToast('Nenhum arquivo selecionado.', 'error');
        return;
    }
    
    const analysisType = document.querySelector('input[name="analysisType"]:checked').value;
    
    // Mostra informações sobre rate limits se há muitas imagens
    if (currentFiles.length > 10) {
        const shouldContinue = await showRateLimitWarning(currentFiles.length);
        if (!shouldContinue) {
            return;
        }
    }
    
    // Mostra loading
    hideAllSections();
    loadingSection.style.display = 'block';
    loadingSection.classList.add('fade-in');
    
    // Adiciona barra de progresso
    const progressHtml = `
        <div class="multiple-progress">
            <div class="multiple-progress-bar" id="multipleProgressBar"></div>
        </div>
        <div class="multiple-progress-text" id="multipleProgressText">
            Preparando análise...
        </div>
        <div class="multiple-stats" id="multipleStats" style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px; font-size: 0.9em;">
            <div>📊 <strong>Total:</strong> ${currentFiles.length} imagens</div>
            <div>✅ <strong>Processadas:</strong> <span id="processedCount">0</span></div>
            <div>❌ <strong>Erros:</strong> <span id="errorCount">0</span></div>
            <div>⏱️ <strong>Tempo decorrido:</strong> <span id="elapsedTime">0s</span></div>
            <div>🕐 <strong>Tempo estimado restante:</strong> <span id="remainingTime">Calculando...</span></div>
        </div>
        <div class="rate-limit-info" id="rateLimitInfo" style="display: none; margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; color: #856404;">
            ⏳ Aguardando para respeitar limites da API...
        </div>
    `;
    loadingSection.querySelector('.loading-container').insertAdjacentHTML('beforeend', progressHtml);
    
    const progressBar = document.getElementById('multipleProgressBar');
    const progressText = document.getElementById('multipleProgressText');
    const rateLimitInfo = document.getElementById('rateLimitInfo');
    
    // Elementos de estatísticas
    const processedCountEl = document.getElementById('processedCount');
    const errorCountEl = document.getElementById('errorCount');
    const elapsedTimeEl = document.getElementById('elapsedTime');
    const remainingTimeEl = document.getElementById('remainingTime');
    
    // Controle de tempo
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    
    // Timer para atualizar tempo decorrido
    const timeUpdateInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        elapsedTimeEl.textContent = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        
        // Calcula tempo estimado restante
        if (processedCount > 0) {
            const avgTimePerImage = (Date.now() - startTime) / processedCount;
            const remainingImages = currentFiles.length - processedCount;
            const estimatedRemainingMs = remainingImages * avgTimePerImage;
            const remainingMinutes = Math.floor(estimatedRemainingMs / 60000);
            const remainingSecondsOnly = Math.floor((estimatedRemainingMs % 60000) / 1000);
            
            if (remainingMinutes > 0) {
                remainingTimeEl.textContent = `${remainingMinutes}m ${remainingSecondsOnly}s`;
            } else {
                remainingTimeEl.textContent = `${remainingSecondsOnly}s`;
            }
        }
    }, 1000);
    
    try {
        const results = [];
        const total = currentFiles.length;
        
        // Processa imagens sequencialmente para evitar rate limits
        for (let i = 0; i < currentFiles.length; i++) {
            const file = currentFiles[i];
            
            try {
                progressText.textContent = `Analisando ${file.name}... (${i + 1}/${total})`;
                
                // Se não é a primeira imagem, aguarda um tempo para evitar rate limit
                if (i > 0) {
                    rateLimitInfo.style.display = 'block';
                    rateLimitInfo.textContent = `⏳ Aguardando 4 segundos para respeitar limites da API... (${i + 1}/${total})`;
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    rateLimitInfo.style.display = 'none';
                }
                
                const formData = new FormData();
                formData.append('image', file);
                formData.append('analysisType', analysisType);
                formData.append('company', selectedCompany);
                
                                        const response = await fetch('/api/analyze', {
                            method: 'POST',
                            body: formData
                        });
                        
                        // Verifica se a resposta é JSON válida
                        const contentType = response.headers.get('content-type');
                        if (!contentType || !contentType.includes('application/json')) {
                            throw new Error(`Servidor retornou ${response.status}: ${response.statusText}. Resposta não é JSON válida.`);
                        }
                        
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        
                        const result = await response.json();
                
                if (result.success) {
                    results.push({
                        success: true,
                        file: file,
                        data: result.data
                    });
                    processedCount++;
                    processedCountEl.textContent = processedCount;
                    console.log(`✅ Processada: ${file.name} -> ${result.data.analysis}`);
                } else {
                    throw new Error(result.error || 'Erro desconhecido');
                }
                
            } catch (error) {
                console.error(`❌ Erro ao processar ${file.name}:`, error);
                
                // Se é erro de rate limit, tenta aguardar mais tempo
                if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
                    rateLimitInfo.style.display = 'block';
                    rateLimitInfo.textContent = `⏳ Rate limit detectado. Aguardando 60 segundos antes de continuar...`;
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    rateLimitInfo.style.display = 'none';
                    
                    // Tenta novamente
                    try {
                        const formData = new FormData();
                        formData.append('image', file);
                        formData.append('analysisType', analysisType);
                        formData.append('company', selectedCompany);
                        
                        const response = await fetch('/api/analyze', {
                            method: 'POST',
                            body: formData
                        });
                        
                        // Verifica se a resposta é JSON válida
                        const contentType = response.headers.get('content-type');
                        if (!contentType || !contentType.includes('application/json')) {
                            throw new Error(`Servidor retornou ${response.status}: ${response.statusText}. Resposta não é JSON válida.`);
                        }
                        
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            results.push({
                                success: true,
                                file: file,
                                data: result.data
                            });
                            processedCount++;
                            processedCountEl.textContent = processedCount;
                            console.log(`✅ Processada (retry): ${file.name} -> ${result.data.analysis}`);
                        } else {
                            throw new Error(result.error || 'Erro desconhecido após retry');
                        }
                    } catch (retryError) {
                        results.push({
                            success: false,
                            file: file,
                            error: `Rate limit persistente: ${retryError.message}`
                        });
                        errorCount++;
                        errorCountEl.textContent = errorCount;
                    }
                } else {
                    results.push({
                        success: false,
                        file: file,
                        error: error.message
                    });
                    errorCount++;
                    errorCountEl.textContent = errorCount;
                }
            }
            
            // Atualiza progresso
            const progress = ((i + 1) / total) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        // Limpa o timer
        clearInterval(timeUpdateInterval);
        
        // Atualiza estatísticas finais
        remainingTimeEl.textContent = 'Concluído!';
        
        showMultipleResults(results, analysisType);
        addMultipleToHistory(results, analysisType);
        
        const successCount = results.filter(r => r.success).length;
        const finalErrorCount = results.length - successCount;
        
        if (finalErrorCount === 0) {
            showToast(`🎉 Todas as ${successCount} imagens foram analisadas com sucesso!`, 'success');
        } else if (successCount > 0) {
            showToast(`✅ ${successCount} imagens analisadas com sucesso, ❌ ${finalErrorCount} com erro. Verifique os resultados.`, 'warning');
        } else {
            showToast(`❌ Todas as ${finalErrorCount} imagens falharam. Verifique sua conexão e limites da API.`, 'error');
        }
        
    } catch (error) {
        console.error('Erro na análise múltipla:', error);
        showError(error.message);
        showToast('Erro na análise das imagens.', 'error');
    }
}

/**
 * Mostra aviso sobre rate limits e estimativa de tempo
 * @param {number} imageCount - Número de imagens
 * @returns {Promise<boolean>} Se o usuário quer continuar
 */
async function showRateLimitWarning(imageCount) {
    return new Promise((resolve) => {
        // Calcula estimativa de tempo
        const delayBetweenRequests = 4000; // 4 segundos
        const totalDelayTime = (imageCount - 1) * delayBetweenRequests;
        const estimatedRequestTime = imageCount * 3000; // ~3s por requisição
        const totalTime = totalDelayTime + estimatedRequestTime;
        const totalMinutes = Math.ceil(totalTime / 60000);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        let timeEstimate = '';
        if (totalHours > 0) {
            timeEstimate = `${totalHours}h ${remainingMinutes}min`;
        } else {
            timeEstimate = `${totalMinutes} minutos`;
        }
        
        // Gera dicas específicas baseadas na quantidade
        const tips = [];
        
        if (imageCount >= 100) {
            tips.push('🚨 ATENÇÃO: Mais de 100 imagens! Isso pode levar várias horas.');
            tips.push('💡 Considere processar em lotes menores para maior controle.');
            tips.push('☕ Deixe o computador ligado - o processamento não pode ser pausado.');
        } else if (imageCount >= 50) {
            tips.push('⚠️ Grande quantidade de imagens detectada.');
            tips.push('🕐 Processamento longo - mantenha a aba aberta.');
        } else if (imageCount > 15) {
            tips.push('⚠️ Você tem mais de 15 imagens. O plano gratuito permite 15 requisições por minuto.');
            tips.push('💡 Considere processar em lotes menores para evitar erros.');
        }
        
        if (imageCount > 5) {
            tips.push('⏱️ Processamento sequencial será usado para evitar rate limits.');
            tips.push('🔄 Se houver erros de rate limit, o sistema tentará automaticamente após o delay sugerido.');
        }
        
        tips.push('📊 Considere fazer upgrade para o plano pago para limites maiores.');
        tips.push('❌ Você pode fechar esta janela para cancelar o processamento.');
        
        const modal = document.createElement('div');
        modal.className = 'rate-limit-modal';
        modal.innerHTML = `
            <div class="rate-limit-modal-content">
                <h3>${imageCount >= 100 ? '🚨' : '⚠️'} Informações sobre Rate Limits</h3>
                <div class="rate-limit-info-box ${imageCount >= 100 ? 'warning-high' : ''}">
                    <p><strong>📊 Análise de ${imageCount} imagens</strong></p>
                    <p><strong>⏱️ Tempo estimado:</strong> ~${timeEstimate}</p>
                    <p><strong>🔄 Delay entre requisições:</strong> 4 segundos</p>
                    ${imageCount >= 100 ? '<p><strong>🚨 AVISO:</strong> Processamento muito longo!</p>' : ''}
                </div>
                <div class="rate-limit-tips">
                    <h4>💡 Informações importantes:</h4>
                    <ul>
                        ${tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
                <div class="rate-limit-actions">
                    <button class="btn-cancel" onclick="this.closest('.rate-limit-modal').remove(); resolve(false);">
                        ❌ Cancelar
                    </button>
                    <button class="btn-continue ${imageCount >= 100 ? 'btn-danger' : ''}" onclick="this.closest('.rate-limit-modal').remove(); resolve(true);">
                        ${imageCount >= 100 ? '🚨 Continuar Mesmo Assim' : '✅ Continuar'}
                    </button>
                </div>
            </div>
        `;
        
        // Adiciona estilos inline para o modal
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const content = modal.querySelector('.rate-limit-modal-content');
        content.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 10px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        const infoBox = modal.querySelector('.rate-limit-info-box');
        infoBox.style.cssText = `
            background: #e3f2fd;
            padding: 1rem;
            border-radius: 5px;
            margin: 1rem 0;
            border-left: 4px solid #2196f3;
        `;

        // Estilo especial para avisos de muitas imagens
        if (modal.querySelector('.warning-high')) {
            infoBox.style.cssText = `
                background: #ffebee;
                padding: 1rem;
                border-radius: 5px;
                margin: 1rem 0;
                border-left: 4px solid #f44336;
                color: #d32f2f;
            `;
        }
        
        const tips_element = modal.querySelector('.rate-limit-tips');
        tips_element.style.cssText = `
            background: #fff3e0;
            padding: 1rem;
            border-radius: 5px;
            margin: 1rem 0;
            border-left: 4px solid #ff9800;
        `;
        
        const actions = modal.querySelector('.rate-limit-actions');
        actions.style.cssText = `
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 1.5rem;
        `;
        
        const cancelBtn = modal.querySelector('.btn-cancel');
        cancelBtn.style.cssText = `
            padding: 0.5rem 1rem;
            border: 1px solid #ccc;
            background: white;
            border-radius: 5px;
            cursor: pointer;
        `;
        
        const continueBtn = modal.querySelector('.btn-continue');
        continueBtn.style.cssText = `
            padding: 0.5rem 1rem;
            border: none;
            background: #667eea;
            color: white;
            border-radius: 5px;
            cursor: pointer;
        `;

        // Estilo especial para botão de perigo
        if (continueBtn.classList.contains('btn-danger')) {
            continueBtn.style.cssText = `
                padding: 0.5rem 1rem;
                border: none;
                background: #f44336;
                color: white;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            `;
        }
        
        // Adiciona event listeners
        cancelBtn.addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        continueBtn.addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        document.body.appendChild(modal);
    });
}

function showMultipleResults(results, analysisType) {
    hideAllSections();
    
    multipleAnalysisTypeBadge.textContent = getAnalysisTypeName(analysisType);
    multipleTimestamp.textContent = formatTimestamp(new Date().toISOString());
    resultsCount.textContent = results.length;
    
    multipleResultsGrid.innerHTML = '';
    
    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = `multiple-result-item ${result.success ? 'success' : 'error'}`;
        
        // Verifica se o arquivo tem base64 (vem do histórico) ou é um File (análise atual)
        if (result.file && result.file.base64) {
            // Dados do histórico - usa base64 diretamente
            resultItem.innerHTML = `
                <div class="result-header">
                    <img src="${result.file.base64}" alt="${result.file.name}" class="result-thumbnail">
                    <div class="file-info">
                        <div class="file-name">${result.file.name}</div>
                        <div class="file-status">
                            ${result.success ? '✅ Analisado com sucesso' : '❌ Erro na análise'}
                        </div>
                    </div>
                </div>
                <div class="result-content">
                    ${result.success ? 
                        (analysisType === 'financial-receipt' || analysisType === 'financial-payment' ? 
                            formatReceiptResult(result.data.analysis) : 
                            result.data.analysis
                        ) : 
                        `Erro: ${result.error}`
                    }
                </div>
            `;
            multipleResultsGrid.appendChild(resultItem);
        } else if (result.file && result.file instanceof File) {
            // Análise atual - usa FileReader
            const reader = new FileReader();
            reader.onload = (e) => {
                resultItem.innerHTML = `
                    <div class="result-header">
                        <img src="${e.target.result}" alt="${result.file.name}" class="result-thumbnail">
                        <div class="file-info">
                            <div class="file-name">${result.file.name}</div>
                            <div class="file-status">
                                ${result.success ? '✅ Analisado com sucesso' : '❌ Erro na análise'}
                            </div>
                        </div>
                    </div>
                    <div class="result-content">
                        ${result.success ? 
                            (analysisType === 'financial-receipt' || analysisType === 'financial-payment' ? 
                                formatReceiptResult(result.data.analysis) : 
                                result.data.analysis
                            ) : 
                            `Erro: ${result.error}`
                        }
                    </div>
                `;
            };
            reader.onerror = (error) => {
                console.error('Erro ao ler arquivo:', error);
                resultItem.innerHTML = `
                    <div class="result-header">
                        <div class="file-info">
                            <div class="file-name">${result.file.name}</div>
                            <div class="file-status">❌ Erro ao carregar imagem</div>
                        </div>
                    </div>
                    <div class="result-content">
                        ${result.success ? 
                            (analysisType === 'financial-receipt' || analysisType === 'financial-payment' ? 
                                formatReceiptResult(result.data.analysis) : 
                                result.data.analysis
                            ) : 
                            `Erro: ${result.error}`
                        }
                    </div>
                `;
            };
            reader.readAsDataURL(result.file);
            multipleResultsGrid.appendChild(resultItem);
        } else {
            // Fallback para casos sem imagem
            resultItem.innerHTML = `
                <div class="result-header">
                    <div class="file-info">
                        <div class="file-name">${result.file ? result.file.name : 'Arquivo desconhecido'}</div>
                        <div class="file-status">
                            ${result.success ? '✅ Analisado com sucesso' : '❌ Erro na análise'}
                        </div>
                    </div>
                </div>
                <div class="result-content">
                    ${result.success ? 
                        (analysisType === 'financial-receipt' || analysisType === 'financial-payment' ? 
                            formatReceiptResult(result.data.analysis) : 
                            result.data.analysis
                        ) : 
                        `Erro: ${result.error}`
                    }
                </div>
            `;
            multipleResultsGrid.appendChild(resultItem);
        }
    });
    
    multipleResultsSection.style.display = 'block';
    multipleResultsSection.classList.add('fade-in');
}

function formatReceiptResult(analysis) {
    const receiptPattern = /^\d{2}-\d{2}\s+.+\s+[\d.,]+$/;
    if (receiptPattern.test(analysis.trim())) {
        return `<div class="receipt-result">${analysis}</div>`;
    } else if (analysis.toLowerCase().includes('erro')) {
        return `<div class="receipt-error">❌ ${analysis}</div>`;
    } else {
        return `<div class="receipt-warning">⚠️ Formato inesperado: ${analysis}</div>`;
    }
}

function addMultipleToHistory(results, analysisType) {
    // Converte os arquivos para base64 antes de salvar
    const processResults = async () => {
        const processedResults = await Promise.all(results.map(async (result) => {
            if (result.file && result.file instanceof File) {
                try {
                    const base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(result.file);
                    });
                    
                    return {
                        ...result,
                        file: {
                            name: result.file.name,
                            size: result.file.size,
                            type: result.file.type,
                            base64: base64
                        }
                    };
                } catch (error) {
                    console.error('Erro ao converter arquivo para base64:', error);
                    return {
                        ...result,
                        file: {
                            name: result.file.name,
                            size: result.file.size,
                            type: result.file.type,
                            base64: null
                        }
                    };
                }
            }
            return result;
        }));

        const historyItem = {
            id: Date.now(),
            analysisType: analysisType,
            timestamp: new Date().toISOString(),
            isMultiple: true,
            results: processedResults,
            totalImages: processedResults.length,
            successCount: processedResults.filter(r => r.success).length
        };
        
        analysisHistory.unshift(historyItem);
        
        if (analysisHistory.length > 50) {
            analysisHistory = analysisHistory.slice(0, 50);
        }
        
        localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
        loadHistory();
    };

    processResults().catch(error => {
        console.error('Erro ao processar histórico múltiplo:', error);
        showToast('Erro ao salvar no histórico.', 'error');
    });
}

async function copyAllResults() {
    const results = Array.from(multipleResultsGrid.children).map(item => {
        const fileName = item.querySelector('.file-name').textContent;
        const content = item.querySelector('.result-content').textContent;
        return `${fileName}: ${content}`;
    }).join('\n\n');
    
    try {
        await navigator.clipboard.writeText(results);
        showToast('Todos os resultados copiados!', 'success');
    } catch (error) {
        showToast('Erro ao copiar resultados.', 'error');
    }
}

function downloadAllResults() {
    const analysisType = multipleAnalysisTypeBadge.textContent;
    const timestamp = multipleTimestamp.textContent;
    
    const results = Array.from(multipleResultsGrid.children).map(item => {
        const fileName = item.querySelector('.file-name').textContent;
        const status = item.querySelector('.file-status').textContent;
        const content = item.querySelector('.result-content').textContent;
        return `Arquivo: ${fileName}\nStatus: ${status}\nResultado: ${content}\n${'='.repeat(50)}`;
    }).join('\n\n');
    
    const content = `Análise Múltipla de Imagens - ${analysisType}
Data: ${timestamp}
Total de imagens: ${resultsCount.textContent}

${'='.repeat(80)}

${results}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-multipla-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    showToast('Resultados baixados com sucesso!', 'success');
}

// Função para atualizar o progresso
function updateProgress(data) {
  // Se for chamada no formato antigo, converte para novo formato
  if (typeof data === 'number' || !data) {
    data = {
      processed: data || 0,
      total: arguments[1] || 0,
      errors: arguments[2] || 0,
      currentFile: '',
      status: 'processando',
      lastError: null
    };
  }

  const { processed, total, errors, currentFile, status, lastError, newFileName } = data;
  
  const progressSection = document.getElementById('progressSection');
  const progressFill = progressSection.querySelector('.progress-fill');
  const progressText = progressSection.querySelector('.progress-text');
  const progressPercentage = progressSection.querySelector('.progress-percentage');
  const progressTotal = progressSection.querySelector('.progress-total');
  const progressProcessed = progressSection.querySelector('.progress-processed');
  const progressErrors = progressSection.querySelector('.progress-errors');
  
  // Criar ou obter elemento para arquivo atual
  let currentFileElement = progressSection.querySelector('.current-file');
  if (!currentFileElement) {
    currentFileElement = document.createElement('div');
    currentFileElement.className = 'current-file';
    progressSection.querySelector('.progress-details').appendChild(currentFileElement);
  }

  // Criar ou obter elemento para status
  let statusElement = progressSection.querySelector('.status-indicator');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.className = 'status-indicator';
    progressSection.querySelector('.progress-details').appendChild(statusElement);
  }
  
  // Calcular porcentagem e atualizar barra
  const percentage = Math.round((processed / total) * 100);
  
  // Mostrar seção de progresso
  progressSection.style.display = 'block';
  
  // Atualizar elementos visuais
  progressFill.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;
  progressTotal.textContent = total;
  progressProcessed.textContent = processed;
  progressErrors.textContent = errors;
  
  // Atualizar mensagem com base no status
  if (status === 'iniciando') {
    progressText.textContent = `Iniciando processamento...`;
    statusElement.innerHTML = `<span class="badge bg-info">Iniciando</span>`;
  } else if (status === 'concluído') {
    progressText.textContent = `Processamento concluído!`;
    statusElement.innerHTML = `<span class="badge bg-success">Concluído</span>`;
  } else {
    // Texto baseado na etapa de processamento
    let statusText = 'Processando';
    let statusBadgeClass = 'bg-primary';
    
    switch (status) {
      case 'preparando':
        statusText = 'Preparando imagem';
        statusBadgeClass = 'bg-info';
        break;
      case 'analisando':
        statusText = 'Analisando com IA';
        statusBadgeClass = 'bg-warning';
        break;
      case 'renomeando':
        statusText = 'Processando resultado';
        statusBadgeClass = 'bg-info';
        break;
      case 'salvando':
        statusText = 'Salvando arquivo';
        statusBadgeClass = 'bg-success';
        break;
      default:
        statusText = 'Processando';
        statusBadgeClass = 'bg-primary';
    }
    
    progressText.textContent = `${statusText} (${processed} de ${total})`;
    statusElement.innerHTML = `<span class="badge ${statusBadgeClass}">${statusText}</span>`;
  }
  
  // Mostrar arquivo atual sendo processado
  if (currentFile) {
    currentFileElement.innerHTML = `<strong>Arquivo atual:</strong> ${currentFile.length > 30 ? currentFile.substring(0, 30) + '...' : currentFile}`;
    
    // Se tiver novo nome, mostrar
    if (newFileName) {
      currentFileElement.innerHTML += `<br><strong>Novo nome:</strong> ${newFileName.length > 30 ? newFileName.substring(0, 30) + '...' : newFileName}`;
    }
  } else {
    currentFileElement.textContent = '';
  }
  
  // Mostrar último erro se houver
  let errorElement = progressSection.querySelector('.last-error');
  if (lastError) {
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'last-error text-danger mt-2';
      progressSection.querySelector('.progress-container').appendChild(errorElement);
    }
    errorElement.textContent = `Último erro: ${lastError}`;
  } else if (errorElement) {
    errorElement.textContent = '';
  }
}

// Função para resetar o progresso
function resetProgress() {
  const progressSection = document.getElementById('progressSection');
  progressSection.style.display = 'none';
}

// Variável para controlar se um download está em andamento
let isDownloadInProgress = false;

async function downloadAllRenamedImages() {
    // Proteção contra cliques múltiplos
    if (isDownloadInProgress) {
        console.log('⚠️ Download já está em andamento, ignorando clique adicional');
        showToast('Processamento já está em andamento, aguarde...', 'warning');
        return;
    }
    
    if (!currentFiles || currentFiles.length === 0) {
        showToast('Nenhuma imagem selecionada.', 'error');
        return;
    }
    
    try {
        // Marca que um download está em andamento
        isDownloadInProgress = true;
        
        // Desabilita o botão visualmente
        const downloadBtn = document.getElementById('downloadAllRenamedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.classList.add('btn-disabled');
        }
        
        console.log('🚀 Iniciando download de ZIP com', currentFiles.length, 'imagens');
        showToast('Processando ZIP com imagens renomeadas...', 'info');
        
        const analysisType = document.querySelector('input[name="analysisType"]:checked').value;
        console.log('📋 Tipo de análise:', analysisType);
        
        // Prepara FormData com todas as imagens
        const formData = new FormData();
        currentFiles.forEach((file, index) => {
            console.log(`📎 Adicionando imagem ${index + 1}/${currentFiles.length}:`, file.name);
            formData.append('images', file);
        });
        formData.append('analysisType', analysisType);
        formData.append('company', selectedCompany);
        
        // Reseta e mostra barra de progresso
        resetProgress();
        updateProgress({
            processed: 0,
            total: currentFiles.length,
            errors: 0,
            currentFile: '',
            status: 'iniciando'
        });
        
        console.log('📤 Enviando requisição para servidor...');
        
        // Cria um EventSource para receber atualizações de progresso
        const progressUrl = new URL('/api/progress', window.location.origin);
        const eventSource = new EventSource(progressUrl);
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            updateProgress(data);
        };
        
        eventSource.onerror = () => {
            eventSource.close();
        };
        
        // Faz requisição para API de download múltiplo renomeado
        const response = await fetch('/api/download-multiple-renamed', {
            method: 'POST',
            body: formData
        });
        
        // Fecha o EventSource
        eventSource.close();
        
        // Verifica se a resposta é válida
        if (!response.ok) {
            // Para downloads, não esperamos JSON, então lemos como texto
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            throw new Error(`Erro no servidor: ${response.status} - ${errorText}`);
        }
        
        // Verifica se a resposta é realmente um arquivo (não JSON de erro)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // Se for JSON, provavelmente é uma mensagem de erro
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro desconhecido do servidor');
        }
        
        console.log('✅ Resposta recebida com sucesso');
        
        // Obtém o nome do arquivo ZIP do header
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `imagens_analisadas_${Date.now()}.zip`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) {
                fileName = match[1];
            }
        }
        console.log('📦 Nome do arquivo ZIP:', fileName);
        
        // Baixa o arquivo ZIP
        console.log('💾 Iniciando download do blob...');
        const blob = await response.blob();
        console.log('📊 Tamanho do ZIP:', formatFileSize(blob.size));
        
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        console.log('🔗 Link de download criado');
        
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        console.log('✨ Download iniciado com sucesso');
        showToast(`ZIP com imagens renomeadas baixado: ${fileName}`, 'success');
        
        // Esconde barra de progresso após sucesso
        resetProgress();
        
    } catch (error) {
        console.error('❌ Erro no download ZIP renomeado:', error);
        showToast('Erro ao baixar ZIP com imagens renomeadas. Tente novamente.', 'error');
        
        // Esconde barra de progresso em caso de erro
        resetProgress();
        
        // Reativa o sistema de upload após erro
        reactivateUpload();
    } finally {
        // Sempre reseta o estado de download e reativa o botão, independente de sucesso ou erro
        isDownloadInProgress = false;
        
        // Reativa o botão
        const downloadBtn = document.getElementById('downloadAllRenamedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('btn-disabled');
        }
        
        console.log('🔄 Sistema de download resetado e pronto para nova operação');
    }
}

function newMultipleAnalysis() {
    // Limpa estado da aplicação
    currentFile = null;
    currentFiles = [];
    
    // Limpa input de arquivo
    fileInput.value = '';
    
    // Remove classes de dragover se existirem
    uploadArea.classList.remove('dragover');
    
    // Limpa preview de imagem
    if (previewImage) {
        previewImage.src = '';
    }
    if (imageInfo) {
        imageInfo.textContent = '';
    }
    
    // Limpa resultados anteriores
    if (analysisResult) {
        analysisResult.textContent = '';
        analysisResult.innerHTML = '';
    }
    
    // Limpa grids de múltiplas imagens
    if (multipleImagesGrid) {
        multipleImagesGrid.innerHTML = '';
    }
    if (multipleResultsGrid) {
        multipleResultsGrid.innerHTML = '';
    }
    
    // Reseta contadores
    if (imageCount) {
        imageCount.textContent = '0';
    }
    if (resultsCount) {
        resultsCount.textContent = '0';
    }
    
    // Limpa barras de progresso se existirem
    const progressBar = document.getElementById('multipleProgressBar');
    const progressText = document.getElementById('multipleProgressText');
    if (progressBar) {
        progressBar.remove();
    }
    if (progressText) {
        progressText.remove();
    }
    
    // Esconde todas as seções
    hideAllSections();
    
    // Reativa o sistema de upload
    reactivateUpload();
    
    // Volta para o início
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Pronto para nova análise múltipla!', 'success');
}

// Função para carregar histórico com verificação de integridade
function loadAnalysisHistory() {
    try {
        const stored = localStorage.getItem('analysisHistory');
        if (!stored) return [];
        
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        
        // Filtra itens válidos
        return parsed.filter(item => {
            if (!item || typeof item !== 'object') return false;
            if (!item.id || !item.analysisType) return false;
            
            // Para análises simples, deve ter analysis
            if (!item.isMultiple && !item.analysis) return false;
            
            // Para análises múltiplas, deve ter results
            if (item.isMultiple && (!item.results || !Array.isArray(item.results))) return false;
            
            return true;
        });
    } catch (error) {
        console.warn('Erro ao carregar histórico, limpando dados corrompidos:', error);
        localStorage.removeItem('analysisHistory');
        return [];
    }
}

// Função para limpar histórico corrompido (pode ser chamada via console)
function clearCorruptedHistory() {
    localStorage.removeItem('analysisHistory');
    analysisHistory = [];
    loadHistory();
    showToast('Histórico limpo com sucesso!', 'success');
}

// Função para reativar completamente o sistema de upload
function reactivateUpload() {
    // Remove e readiciona os event listeners para garantir que funcionem
    fileInput.removeEventListener('change', handleFileSelect);
    fileInput.addEventListener('change', handleFileSelect);
    
    // Garante que o input está habilitado
    fileInput.disabled = false;
    fileInput.style.pointerEvents = 'auto';
    
    // Reativa a área de upload
    uploadArea.style.pointerEvents = 'auto';
    uploadArea.classList.remove('disabled');
    
    console.log('Sistema de upload reativado');
}