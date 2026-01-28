import { useState, useContext, useCallback, useEffect, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
    FileText, Upload, X, Copy, Download,
    Building2, Bot, TrendingUp, TrendingDown,
    LogOut, History, Trash2, Loader2,
    FileImage, FileType, Check,
    Gem, Zap, Factory, Store, BarChart3, Building,
    Sparkles, Brain, Route, Play, ChevronRight, Cpu, Star, RefreshCw,
    BarChart, Layout, ChevronLeft, Info, ShieldCheck, FileCheck, LayoutDashboard
} from 'lucide-react'
import { useRef } from 'react'
import { AuthContext } from '../App'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authenticatedFetch } from '../utils/api'
import Header from '../components/Header'

// Memoized Sub-components for performance
const CompanyCard = memo(({ company, isSelected, onSelect }) => {
    const Icon = company.Icon
    return (
        <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(company)}
            className={`flex-none w-32 p-5 rounded-2xl border-2 transition-all snap-start ${isSelected
                ? 'border-brand-blue bg-brand-blue/10 shadow-[0_8px_20px_rgba(43,153,255,0.15)]'
                : 'border-transparent bg-dark-700/50 hover:bg-dark-600/50'
                }`}
        >
            <Icon className={`w-8 h-8 mx-auto mb-3 transition-colors ${isSelected ? 'text-brand-blue' : 'text-dark-500 group-hover:text-light-200'}`} />
            <p className={`text-[11px] font-bold text-center truncate tracking-tight ${isSelected ? 'text-brand-blue' : 'text-light-200'}`}>
                {company.name}
            </p>
        </motion.button>
    )
})

const PROVIDER_HINTS = {
    'gemini': { label: 'Melhor Visão', color: 'blue', recommended: true },
    'openai': { label: 'Melhor Lógica', color: 'purple' },
    'nexus': { label: 'Versátil', color: 'emerald' },
    'default': { label: 'IA', color: 'gray' }
}

const ProviderButton = memo(({ provider, isSelected, onSelect }) => {
    const Icon = provider.Icon
    const hint = PROVIDER_HINTS[provider.id] || PROVIDER_HINTS['default']
    const isRecommended = hint.recommended

    return (
        <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(provider)}
            className={`relative flex-1 p-5 pt-7 rounded-2xl border-2 transition-all overflow-hidden ${isSelected
                ? 'border-brand-blue bg-brand-blue/10 shadow-[0_8px_20px_rgba(43,153,255,0.15)]'
                : isRecommended
                    ? 'border-brand-blue/30 bg-dark-700/50 shadow-[0_0_15px_rgba(43,153,255,0.1)]'
                    : 'border-transparent bg-dark-700/50 hover:bg-dark-600/50'
                }`}
        >
            {/* Specialty Badge */}
            <div className={`absolute top-0 right-0 left-0 py-1 text-[7px] font-black uppercase tracking-widest text-center ${isSelected ? 'bg-brand-blue text-white' : isRecommended ? 'bg-brand-blue/80 text-white' : 'bg-dark-600 text-dark-400'
                }`}>
                {isRecommended ? '⭐ Recomendado' : hint.label}
            </div>

            <Icon className={`w-7 h-7 mx-auto mb-2 transition-colors ${isSelected ? 'text-brand-blue' : isRecommended ? 'text-brand-blue/70' : 'text-dark-500'}`} />
            <div className="flex items-center justify-center gap-1">
                <p className={`text-xs font-bold text-center tracking-tight ${isSelected ? 'text-brand-blue' : 'text-light-100'}`}>
                    {provider.name}
                </p>
                {isRecommended && <Star className="w-2.5 h-2.5 text-brand-blue fill-brand-blue" />}
            </div>
        </motion.button>
    )
})

const HistoryItem = memo(({ item, onCopy }) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: 4 }}
        onClick={() => onCopy(item.result)}
        className="p-4 bg-dark-700/50 border border-dark-600 rounded-xl hover:bg-dark-600/50 hover:border-brand-blue/30 cursor-pointer transition-all group/item"
    >
        <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-sm text-light-100 truncate flex-1">{item.result}</p>
            <Copy className="w-3 h-3 text-dark-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
        </div>
        <div className="flex items-center gap-2 mt-2">
            <span className="w-1 h-1 bg-brand-blue rounded-full"></span>
            <p className="text-[10px] text-dark-500 font-bold uppercase tracking-tighter">{new Date(item.timestamp).toLocaleString('pt-BR')}</p>
        </div>
    </motion.div>
))

// AI Provider Icons Mapping
const PROVIDER_ICONS = {
    'gemini': Sparkles,
    'openai': Brain,
    'nexus': Cpu,
    'deepseek': Zap,
    'anthropic': Bot
}

const COMPANY_ICONS = {
    'Gem': Gem,
    'Zap': Zap,
    'Factory': Factory,
    'Store': Store,
    'BarChart3': BarChart3,
    'Building': Building,
    'default': Building2
}

const ANALYSIS_TYPE_CONFIG = {
    'financial-receipt': { label: 'Receber', Icon: TrendingUp, color: 'emerald' },
    'financial-payment': { label: 'Pagar', Icon: TrendingDown, color: 'red' },
    'default': { label: 'Outro', Icon: FileText, color: 'blue' }
}

export default function HomePage() {
    const { user, logout, isMaster } = useContext(AuthContext)
    const navigate = useNavigate()

    const [files, setFiles] = useState([])
    const [companies, setCompanies] = useState([])
    const [selectedCompany, setSelectedCompany] = useState(null)
    const [providers, setProviders] = useState([])
    const [selectedProvider, setSelectedProvider] = useState(null)
    const [availableAnalysisTypes, setAvailableAnalysisTypes] = useState([])
    const [analysisType, setAnalysisType] = useState('financial-receipt')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [results, setResults] = useState([])
    const [history, setHistory] = useState([])
    const [isDragging, setIsDragging] = useState(false)
    const [usageStats, setUsageStats] = useState({ count: 0, limit: 0, remaining: 0, percent: 0 })
    const [hasAnalyzed, setHasAnalyzed] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showLimitModal, setShowLimitModal] = useState(false)
    const scrollRef = useRef(null)

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef
            const scrollAmount = 300
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
        }
    }

    const refreshSystemData = async () => {
        try {
            // Buscar créditos do usuário autenticado (prioridade)
            if (user?.id) {
                try {
                    const creditsRes = await authenticatedFetch('/api/credits')
                    const creditsData = await creditsRes.json()
                    if (creditsData.success && creditsData.data) {
                        const credits = creditsData.data
                        // Usar valores do banco de dados, sem fallbacks hardcoded
                        const creditsUsed = credits.credits_used ?? 0
                        const creditsLimit = credits.credits_limit ?? 0
                        const creditsRemaining = credits.credits_remaining ?? 0
                        const percent = creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0

                        setUsageStats({
                            count: creditsUsed,
                            limit: creditsLimit,
                            remaining: creditsRemaining,
                            percent: percent
                        })
                    }
                } catch (creditsError) {
                    console.warn('Erro ao buscar créditos do usuário, usando fallback:', creditsError)
                    // Fallback para stats global se falhar
                    const statsRes = await fetch('/api/stats')
                    const statsData = await statsRes.json()
                    if (statsData.success) {
                        setUsageStats(statsData.data.usage)
                    }
                }
            } else {
                // Se não autenticado, usar stats global
                const statsRes = await fetch('/api/stats')
                const statsData = await statsRes.json()
                if (statsData.success) {
                    setUsageStats(statsData.data.usage)
                }
            }

            // Fetch Companies
            const compRes = await authenticatedFetch('/api/companies')
            const compData = await compRes.json()
            if (compData.success) {
                const loadedCompanies = compData.data.companies.map(c => ({
                    ...c,
                    Icon: COMPANY_ICONS[c.icon] || COMPANY_ICONS['default']
                }))
                setCompanies(loadedCompanies)
                if (!selectedCompany && loadedCompanies.length > 0) {
                    setSelectedCompany(loadedCompanies[0])
                }
                setAvailableAnalysisTypes(compData.data.availableTypes || ['financial-receipt', 'financial-payment'])
            }

            // Fetch Providers
            const provRes = await authenticatedFetch('/api/providers')
            const provData = await provRes.json()
            if (provData.success) {
                const loadedProviders = provData.data.availableProviders.map(id => ({
                    id,
                    name: id === 'openai' ? 'ChatGPT' : id.charAt(0).toUpperCase() + id.slice(1),
                    Icon: PROVIDER_ICONS[id] || Bot
                }))
                setProviders(loadedProviders)

                const defaultId = provData.data.defaultProvider
                if (!selectedProvider) {
                    setSelectedProvider(loadedProviders.find(p => p.id === defaultId) || loadedProviders[0])
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do sistema:', error)
            toast.error('Erro de conexão com o servidor')
        }
    }

    useEffect(() => {
        refreshSystemData()

        const saved = localStorage.getItem('analysisHistory')
        if (saved) setHistory(JSON.parse(saved))
    }, [user]) // Recarregar quando o usuário mudar

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true) }, [])
    const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false) }, [])
    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.type.startsWith('image/') || file.type === 'application/pdf'
        )
        setFiles(prev => [...prev, ...droppedFiles])
    }, [])

    const handleFileSelect = (e) => setFiles(prev => [...prev, ...Array.from(e.target.files)])
    const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index))
    const clearFiles = () => { setFiles([]); setResults([]) }

    const analyzeFiles = async () => {
        if (files.length === 0) { toast.error('Selecione arquivos'); return }
        if (!selectedCompany || !selectedProvider) { toast.error('Selecione empresa e provedor'); return }

        if (usageStats.remaining < files.length) {
            setShowLimitModal(true)
            return
        }

        setIsAnalyzing(true)
        setProgress({ current: 0, total: files.length })
        setResults([])

        const batchId = `batch_${Date.now()}`
        const CONCURRENCY_LIMIT = 2
        const completedResults = []
        let processedCount = 0

        const processFile = async (file, index) => {
            try {
                const formData = new FormData()
                formData.append('image', file)
                formData.append('analysisType', analysisType)
                formData.append('company', selectedCompany.id)
                formData.append('provider', selectedProvider.id)
                formData.append('batchId', batchId)

                // Usar authenticatedFetch para incluir token JWT
                const response = await authenticatedFetch('/api/analyze', { method: 'POST', body: formData })
                const data = await response.json()

                processedCount++
                setProgress({ current: processedCount, total: files.length })

                return {
                    id: `${batchId}_${index}`,
                    fileName: file.name,
                    result: data.success ? data.data.analysis : 'ERRO',
                    error: data.success ? null : data.error,
                    timestamp: new Date().toISOString(),
                }
            } catch (error) {
                processedCount++
                setProgress({ current: processedCount, total: files.length })
                return {
                    id: `${batchId}_${index}`,
                    fileName: file.name,
                    result: 'ERRO',
                    error: error.message,
                    timestamp: new Date().toISOString(),
                }
            }
        }

        // Simple parallel processing with chunks
        for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
            const chunk = files.slice(i, i + CONCURRENCY_LIMIT)
            const chunkPromises = chunk.map((file, idx) => processFile(file, i + idx))
            const chunkResults = await Promise.all(chunkPromises)
            completedResults.push(...chunkResults)
            setResults([...completedResults]) // Update UI progressively
        }

        setIsAnalyzing(false)
        setHasAnalyzed(true)

        // Atualizar créditos imediatamente após análise
        await refreshSystemData()

        const successResults = completedResults.filter(r => !r.error)
        const newHistory = [...successResults, ...history].slice(0, 100)
        setHistory(newHistory)
        localStorage.setItem('analysisHistory', JSON.stringify(newHistory))

        const successCount = successResults.length
        successCount === files.length
            ? toast.success(`${successCount} analisado(s) com sucesso!`)
            : toast(`${successCount} de ${files.length} processados. Verifique erros.`, { icon: '⚠️' })
    }

    const copyResult = (text) => { navigator.clipboard.writeText(text); toast.success('Copiado!') }
    const copyAllResults = () => { navigator.clipboard.writeText(results.map(r => r.result).join('\n')); toast.success('Nomes copiados!') }

    // Start new analysis with confirmation
    const startNewAnalysis = () => {
        if (results.length > 0) {
            setShowConfirmModal(true)
            return
        }
        confirmNewAnalysis()
    }

    const confirmNewAnalysis = () => {
        setShowConfirmModal(false)
        setFiles([])
        setResults([])
        setHasAnalyzed(false)
        setProgress({ current: 0, total: 0 })
        toast.success('Pronto para nova análise!')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Download all results as ZIP with renamed files
    const downloadAllAsZip = async () => {
        const successResults = results.filter(r => !r.error && r.result !== 'ERRO')
        if (successResults.length === 0) {
            toast.error('Nenhum resultado válido para baixar')
            return
        }

        toast.loading('Preparando download...', { id: 'zip-download' })

        try {
            const zip = new JSZip()
            const usedNames = {}

            for (const result of successResults) {
                // Find the original file
                const originalFile = files.find(f => f.name === result.fileName)
                if (!originalFile) continue

                // Get the extension from original file
                const ext = result.fileName.split('.').pop() || 'jpg'

                // Create base name from AI result (sanitize for filename)
                let baseName = result.result
                    .replace(/[\\/:*?"<>|]/g, '') // Remove invalid chars
                    .replace(/\s+/g, ' ')         // Normalize spaces
                    .trim()
                    .substring(0, 200)            // Limit length

                // Handle duplicates
                let finalName = `${baseName}.${ext}`
                if (usedNames[finalName.toLowerCase()]) {
                    let counter = 1
                    while (usedNames[`${baseName} (${counter}).${ext}`.toLowerCase()]) {
                        counter++
                    }
                    finalName = `${baseName} (${counter}).${ext}`
                }
                usedNames[finalName.toLowerCase()] = true

                // Add file to ZIP
                const fileData = await originalFile.arrayBuffer()
                zip.file(finalName, fileData)
            }

            // Generate and download ZIP with company name
            const content = await zip.generateAsync({ type: 'blob' })
            const date = new Date().toISOString().split('T')[0]
            const companySlug = selectedCompany?.name?.replace(/\s+/g, '_') || 'empresa'
            saveAs(content, `analise_${companySlug}_${date}.zip`)

            toast.success(`${successResults.length} arquivo(s) baixados!`, { id: 'zip-download' })
        } catch (error) {
            console.error('Erro ao criar ZIP:', error)
            toast.error('Erro ao criar arquivo ZIP', { id: 'zip-download' })
        }
    }

    return (
        <div className="min-h-screen bg-dark-900 relative overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div
                    animate={{ x: [0, 30, 0], y: [0, 40, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-blue/5 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{ x: [0, -20, 0], y: [0, 60, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px]"
                />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
            </div>

            {/* Floating Decorative Icons */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity }} className="absolute top-[15%] left-[5%] text-brand-blue/10">
                    <Brain className="w-16 h-16" />
                </motion.div>
                <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 9, repeat: Infinity }} className="absolute bottom-[20%] right-[5%] text-emerald-500/10">
                    <Sparkles className="w-12 h-12" />
                </motion.div>
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-[40%] right-[15%] text-brand-blue/5">
                    <Zap className="w-10 h-10" />
                </motion.div>
            </div>

            <Header title="Leitor de Docs" />

            <div className="relative z-20">
                {/* Selection Summary Bar */}
                <div className="bg-dark-800/80 backdrop-blur-md border-b border-dark-600 sticky top-16 z-40 py-2">
                    <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-center">
                        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2 px-2.5 py-1 bg-dark-700 rounded-full border border-dark-600">
                                    <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-light-200 uppercase tracking-tight whitespace-nowrap">Modo Ativo</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="text-[10px] text-dark-500 uppercase font-bold tracking-widest">Empresa</span>
                                    <div className="flex items-center gap-1.5">
                                        {selectedCompany?.Icon && <selectedCompany.Icon className="w-3.5 h-3.5 text-brand-blue" />}
                                        <span className="text-xs font-semibold text-light-100">{selectedCompany?.name || 'Selecionando...'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="text-[10px] text-dark-500 uppercase font-bold tracking-widest">IA</span>
                                    <div className="flex items-center gap-1.5">
                                        {selectedProvider?.Icon && <selectedProvider.Icon className="w-3.5 h-3.5 text-brand-blue" />}
                                        <span className="text-xs font-semibold text-light-100">{selectedProvider?.name || 'Selecionando...'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="text-[10px] text-dark-500 uppercase font-bold tracking-widest">Fluxo</span>
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${analysisType === 'financial-receipt'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                                        }`}>
                                        {analysisType === 'financial-receipt' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        <span className="text-[10px] font-bold uppercase">{analysisType === 'financial-receipt' ? 'Receber' : 'Pagar'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="max-w-screen-xl mx-auto px-6 py-8">
                    {/* Steps Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Left: Config + Upload */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Step 1: Select Company */}
                            <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl relative group">
                                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-brand-blue/30 to-transparent"></div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center border border-brand-blue/20">
                                        <Building2 className="w-5 h-5 text-brand-blue" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-light-100 tracking-tight">Selecione a Empresa</h2>
                                        <p className="text-dark-500 text-xs mt-0.5">Defina para qual cliente os dados serão processados</p>
                                    </div>
                                </div>
                                <div className="relative group">
                                    {/* Scroll arrows - positioned relative to cards only */}
                                    <button
                                        onClick={() => scroll('left')}
                                        className="absolute left-[-12px] top-[calc(50%-8px)] -translate-y-1/2 z-10 w-8 h-8 bg-dark-600 border border-dark-500 rounded-full flex items-center justify-center text-light-200 hover:text-white hover:bg-brand-blue transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => scroll('right')}
                                        className="absolute right-[-12px] top-[calc(50%-8px)] -translate-y-1/2 z-10 w-8 h-8 bg-dark-600 border border-dark-500 rounded-full flex items-center justify-center text-light-200 hover:text-white hover:bg-brand-blue transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>

                                    <div
                                        ref={scrollRef}
                                        className="flex gap-4 overflow-x-auto pb-2 no-scrollbar snap-x scroll-smooth"
                                    >
                                        {companies.map(company => (
                                            <CompanyCard
                                                key={company.id}
                                                company={company}
                                                isSelected={selectedCompany?.id === company.id}
                                                onSelect={setSelectedCompany}
                                            />
                                        ))}
                                        {companies.length === 0 && (
                                            <div className="flex items-center justify-center w-full py-8 text-dark-500 italic text-sm">
                                                Carregando empresas...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Step 2: Select Options */}
                            <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl relative group">
                                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                        <Layout className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-light-100 tracking-tight">Configure a Análise</h2>
                                        <p className="text-dark-500 text-xs mt-0.5">Ajuste o modelo de IA e o tipo de fluxo financeiro</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Provider */}
                                    <div>
                                        <label className="text-xs text-light-200 uppercase tracking-wide mb-3 block">Provedor de IA</label>
                                        <div className="flex gap-2">
                                            {providers.map(provider => (
                                                <ProviderButton
                                                    key={provider.id}
                                                    provider={provider}
                                                    isSelected={selectedProvider.id === provider.id}
                                                    onSelect={setSelectedProvider}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Type */}
                                    <div>
                                        <label className="text-xs text-light-200 uppercase tracking-wide mb-3 block">Tipo de Documento</label>
                                        <div className="flex gap-2">
                                            {availableAnalysisTypes.map(type => {
                                                const config = ANALYSIS_TYPE_CONFIG[type] || ANALYSIS_TYPE_CONFIG['default']
                                                const TypeIcon = config.Icon
                                                const isSelected = analysisType === type

                                                // Dynamic styles based on color config
                                                let borderClass, bgClass, textClass, iconClass

                                                if (config.color === 'emerald') {
                                                    borderClass = isSelected ? 'border-emerald-500' : 'border-transparent'
                                                    bgClass = isSelected ? 'bg-emerald-500/10' : 'bg-dark-700 hover:bg-dark-600'
                                                    textClass = isSelected ? 'text-emerald-400' : 'text-light-100'
                                                    iconClass = isSelected ? 'text-emerald-400' : 'text-light-200'
                                                } else if (config.color === 'red') {
                                                    borderClass = isSelected ? 'border-red-500' : 'border-transparent'
                                                    bgClass = isSelected ? 'bg-red-500/10' : 'bg-dark-700 hover:bg-dark-600'
                                                    textClass = isSelected ? 'text-red-400' : 'text-light-100'
                                                    iconClass = isSelected ? 'text-red-400' : 'text-light-200'
                                                } else { // blue default
                                                    borderClass = isSelected ? 'border-brand-blue' : 'border-transparent'
                                                    bgClass = isSelected ? 'bg-brand-blue/10' : 'bg-dark-700 hover:bg-dark-600'
                                                    textClass = isSelected ? 'text-brand-blue' : 'text-light-100'
                                                    iconClass = isSelected ? 'text-brand-blue' : 'text-light-200'
                                                }

                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => setAnalysisType(type)}
                                                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${borderClass} ${bgClass}`}
                                                    >
                                                        <TypeIcon className={`w-5 h-5 mx-auto mb-1 ${iconClass}`} />
                                                        <p className={`text-xs font-medium text-center ${textClass}`}>
                                                            {config.label}
                                                        </p>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Step 3: Upload Files */}
                            <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl relative group">
                                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-brand-blue/30 to-transparent"></div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center border border-brand-blue/20">
                                        <Upload className="w-5 h-5 text-brand-blue" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-light-100 tracking-tight">Adicione os Arquivos</h2>
                                        <p className="text-dark-500 text-xs mt-0.5">Envie imagens ou PDFs para extração instantânea</p>
                                    </div>
                                </div>

                                <div
                                    onDragOver={!isAnalyzing && !hasAnalyzed ? handleDragOver : undefined}
                                    onDragLeave={!isAnalyzing && !hasAnalyzed ? handleDragLeave : undefined}
                                    onDrop={!isAnalyzing && !hasAnalyzed ? handleDrop : undefined}
                                    onClick={() => !isAnalyzing && !hasAnalyzed && document.getElementById('fileInput').click()}
                                    className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${isAnalyzing || hasAnalyzed
                                        ? 'border-dark-600 bg-dark-700/30 cursor-not-allowed opacity-50'
                                        : isDragging
                                            ? 'border-brand-blue bg-brand-blue/5 cursor-pointer'
                                            : 'border-dark-500 hover:border-brand-blue/50 cursor-pointer'
                                        }`}
                                >
                                    <input id="fileInput" type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" disabled={isAnalyzing || hasAnalyzed} />
                                    <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging && !isAnalyzing && !hasAnalyzed ? 'text-brand-blue' : 'text-dark-500'}`} />
                                    <p className="text-base text-light-100 mb-1">
                                        {hasAnalyzed ? 'Análise concluída' : isAnalyzing ? 'Analisando...' : 'Arraste arquivos ou clique aqui'}
                                    </p>
                                    <p className="text-xs text-dark-500">
                                        {hasAnalyzed ? 'Clique em "Nova Análise" para recomeçar' : 'JPG, PNG, PDF até 20MB'}
                                    </p>
                                </div>

                                {files.length > 0 && (
                                    <div className="mt-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm text-light-100">{files.length} arquivo(s)</span>
                                            <button onClick={clearFiles} className="text-xs text-red-400 hover:text-red-300">Limpar</button>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {files.map((file, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-dark-700 rounded-lg p-3">
                                                    {file.type === 'application/pdf' ? <FileType className="w-4 h-4 text-red-400" /> : <FileImage className="w-4 h-4 text-brand-blue" />}
                                                    <span className="text-sm text-light-100 truncate flex-1">{file.name}</span>
                                                    <button onClick={() => removeFile(i)} className="text-dark-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>



                            {/* Results */}
                            {results.length > 0 && (
                                <section className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-semibold text-light-100">Resultados</h2>
                                        <div className="flex items-center gap-3">
                                            <button onClick={downloadAllAsZip} className="text-sm text-emerald-400 flex items-center gap-1 hover:underline">
                                                <Download className="w-4 h-4" /> Baixar ZIP
                                            </button>
                                            <button onClick={copyAllResults} className="text-sm text-brand-blue flex items-center gap-1 hover:underline">
                                                <Copy className="w-4 h-4" /> Copiar todos
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {results.map((r, i) => (
                                            <div key={r.id} className={`p-4 rounded-lg flex items-center justify-between ${r.error ? 'bg-red-500/10' : 'bg-dark-700'}`}>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-dark-500">{r.fileName}</p>
                                                    <p className={`font-mono text-lg ${r.error ? 'text-red-400' : 'text-light-100'}`}>{r.result}</p>
                                                </div>
                                                {!r.error && (
                                                    <button onClick={() => copyResult(r.result)} className="p-2 text-dark-500 hover:text-brand-blue"><Copy className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right: Analyze Button + Usage + History */}
                        <aside className="lg:col-span-4 space-y-6">
                            {/* Usage Card */}
                            <div className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-blue/10 transition-colors"></div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center border border-brand-blue/20">
                                            <BarChart3 className="w-4 h-4 text-brand-blue" />
                                        </div>
                                        <h2 className="text-sm font-bold text-light-100 uppercase tracking-widest">Uso Mensal</h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-light-100">{usageStats.count}</span>
                                            <span className="text-dark-500 text-xs font-bold"> / {usageStats.limit}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`h-3 bg-dark-700 rounded-full overflow-hidden mb-3 p-0.5 border ${usageStats.remaining === 0 ? 'border-red-500/50' : 'border-dark-600'}`}>
                                    <motion.div
                                        className={`h-full rounded-full ${usageStats.remaining === 0
                                            ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse'
                                            : (usageStats.percent || 0) > 90
                                                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                                : 'bg-gradient-to-r from-brand-blue to-brand-blue-dark shadow-[0_0_15px_rgba(43,153,255,0.4)]'
                                            }`}
                                        initial={false}
                                        animate={{ width: `${Math.min(usageStats.percent || 0, 100)}%` }}
                                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                </div>
                                <p className={`text-[10px] font-medium uppercase tracking-tighter ${usageStats.remaining === 0 ? 'text-red-400' : 'text-dark-500'}`}>
                                    {usageStats.remaining <= 0
                                        ? '⚠️ Limite atingido. Entre em contato para upgrade.'
                                        : `Você ainda possui ${usageStats.remaining} créditos disponíveis`}
                                </p>
                            </div>

                            {/* Analyze Button */}
                            <div className="sticky top-6 space-y-3">
                                {hasAnalyzed ? (
                                    <>
                                        {/* Download Button - Primary action after analysis */}
                                        <button
                                            onClick={downloadAllAsZip}
                                            className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                                        >
                                            <Download className="w-6 h-6" />
                                            Baixar Renomeados
                                        </button>

                                        {/* New Analysis Button - Secondary action */}
                                        <button
                                            onClick={startNewAnalysis}
                                            className="w-full py-4 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-light-100 text-base font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                            Nova Análise
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={analyzeFiles}
                                            disabled={files.length === 0 || isAnalyzing || usageStats.remaining === 0}
                                            className={`w-full py-5 text-white text-lg font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 ${usageStats.remaining === 0
                                                ? 'bg-red-500/20 border-2 border-red-500/50 text-red-400 cursor-not-allowed'
                                                : 'bg-brand-blue hover:bg-brand-blue-dark disabled:bg-dark-600 disabled:text-dark-500 shadow-glow'
                                                }`}
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="w-6 h-6 animate-spin" />
                                                    {progress.current}/{progress.total}
                                                </>
                                            ) : usageStats.remaining === 0 ? (
                                                <>
                                                    <X className="w-6 h-6" />
                                                    Limite Atingido
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-6 h-6" />
                                                    Analisar
                                                    {files.length > 0 && <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{files.length}</span>}
                                                </>
                                            )}
                                        </button>
                                        {isAnalyzing && (
                                            <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                                                <motion.div className="h-full bg-brand-blue" initial={{ width: 0 }} animate={{ width: `${(progress.current / progress.total) * 100}%` }} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* History */}
                            <div className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl relative overflow-hidden group">
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -ml-16 -mb-16"></div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center border border-dark-600">
                                            <History className="w-4 h-4 text-light-200" />
                                        </div>
                                        <h2 className="text-sm font-bold text-light-100 uppercase tracking-widest">Histórico Recente</h2>
                                    </div>
                                    {history.length > 0 && (
                                        <button
                                            onClick={() => { setHistory([]); localStorage.removeItem('analysisHistory'); toast.success('Histórico limpo!') }}
                                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Limpar
                                        </button>
                                    )}
                                </div>
                                {history.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-dark-700 rounded-2xl">
                                        <History className="w-8 h-8 text-dark-600 mx-auto mb-3 opacity-20" />
                                        <p className="text-dark-500 text-xs font-medium">Nenhuma análise registrada</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar">
                                        {history.slice(0, 30).map((item) => (
                                            <HistoryItem
                                                key={item.id}
                                                item={item}
                                                onCopy={copyResult}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>
                </main>
            </div>

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowConfirmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="bg-dark-800 border border-dark-600 rounded-2xl p-8 max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                                    <RefreshCw className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-light-100">Nova Análise</h3>
                                    <p className="text-dark-400 text-sm">Confirmação necessária</p>
                                </div>
                            </div>

                            <p className="text-light-200 mb-8 leading-relaxed">
                                Deseja iniciar uma nova análise? Os resultados atuais serão <span className="text-amber-400 font-semibold">limpos permanentemente</span>.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 px-4 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-light-100 font-medium rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmNewAnalysis}
                                    className="flex-1 py-3 px-4 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Limit Exceeded Modal */}
            <AnimatePresence>
                {showLimitModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowLimitModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="bg-dark-800 border border-dark-600 rounded-2xl p-8 max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${usageStats.remaining > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                    <BarChart3 className={`w-6 h-6 ${usageStats.remaining > 0 ? 'text-amber-400' : 'text-red-400'}`} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-light-100">
                                        {usageStats.remaining > 0 ? 'Créditos Insuficientes' : 'Limite Atingido'}
                                    </h3>
                                    <p className="text-dark-400 text-sm">
                                        {usageStats.remaining > 0 ? 'Você não tem créditos para todos os arquivos' : 'Sem créditos disponíveis'}
                                    </p>
                                </div>
                            </div>

                            <div className={`border rounded-xl p-4 mb-6 ${usageStats.remaining > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-light-200">Créditos disponíveis:</span>
                                    <span className={`text-lg font-bold ${usageStats.remaining > 0 ? 'text-amber-400' : 'text-red-400'}`}>{usageStats.remaining}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-light-200">Arquivos selecionados:</span>
                                    <span className="text-lg font-bold text-light-100">{files.length}</span>
                                </div>
                            </div>

                            {usageStats.remaining > 0 ? (
                                <>
                                    <p className="text-light-200 mb-6 leading-relaxed text-sm">
                                        Você pode analisar até <span className="text-amber-400 font-semibold">{usageStats.remaining} {usageStats.remaining === 1 ? 'arquivo' : 'arquivos'}</span> com seus créditos restantes.
                                        Deseja analisar apenas {usageStats.remaining === 1 ? 'o primeiro arquivo' : `os primeiros ${usageStats.remaining} arquivos`}?
                                    </p>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowLimitModal(false)}
                                            className="flex-1 py-3 px-4 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-light-100 font-medium rounded-xl transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowLimitModal(false);
                                                // Keep only the files that fit in remaining credits
                                                setFiles(prev => prev.slice(0, usageStats.remaining));
                                                toast.success(`Mantidos ${usageStats.remaining} arquivo(s). Clique em Analisar.`);
                                            }}
                                            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-4 h-4" />
                                            Analisar {usageStats.remaining}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-light-200 mb-6 leading-relaxed text-sm">
                                        Você atingiu o limite mensal de <span className="text-red-400 font-semibold">{usageStats.limit} documentos</span>.
                                        Para continuar utilizando o serviço, entre em contato para fazer um upgrade do seu plano.
                                    </p>

                                    <div className="bg-dark-700 border border-dark-600 rounded-xl p-4 mb-6">
                                        <p className="text-xs text-dark-400 uppercase font-bold tracking-wider mb-2">Contato para Upgrade</p>
                                        <p className="text-light-100 font-medium">suporte@leitordobpo.com.br</p>
                                    </div>

                                    <button
                                        onClick={() => setShowLimitModal(false)}
                                        className="w-full py-3 px-4 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-light-100 font-medium rounded-xl transition-all"
                                    >
                                        Entendi
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
