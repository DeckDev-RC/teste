import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronLeft, FileText, Calendar, Building2,
    CheckCircle, AlertCircle, RefreshCw, Download,
    Copy, ExternalLink, Image as ImageIcon, File
} from 'lucide-react'
import { AuthContext } from '../App'
import { authenticatedJsonFetch } from '../utils/api'
import Header from '../components/Header'
import toast from 'react-hot-toast'

export default function AnalysisDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useContext(AuthContext)
    const [analysis, setAnalysis] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setIsLoading(true)
                const response = await authenticatedJsonFetch(`/api/user/analyses/${id}`)
                if (response.success) {
                    setAnalysis(response.data)
                } else {
                    setError(response.error || 'Análise não encontrada')
                }
            } catch (err) {
                console.error('Erro ao buscar detalhes da análise:', err)
                setError('Erro ao carregar dados da análise')
            } finally {
                setIsLoading(false)
            }
        }

        fetchAnalysis()
    }, [id])

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        toast.success('Copiado para a área de transferência')
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-900">
                <Header title="Detalhes da Análise" />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="w-12 h-12 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
                </div>
            </div>
        )
    }

    if (error || !analysis) {
        return (
            <div className="min-h-screen bg-dark-900">
                <Header title="Erro" />
                <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-light-100 mb-2">Ops! Algo deu errado</h2>
                    <p className="text-dark-500 mb-8 text-center max-w-md">{error || 'Não conseguimos encontrar os detalhes desta análise.'}</p>
                    <button
                        onClick={() => navigate('/history')}
                        className="px-6 py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-blue-dark transition-all flex items-center gap-2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Voltar para o Histórico
                    </button>
                </div>
            </div>
        )
    }

    const { analysis_json, file_type, status } = analysis
    const isImage = file_type?.startsWith('image/')
    const isPdf = file_type === 'application/pdf'

    return (
        <div className="min-h-screen bg-dark-900 pb-12">
            <Header title="Detalhes da Análise" />

            <main className="max-w-screen-xl mx-auto px-6 py-8">
                {/* Top Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 bg-dark-800 border border-dark-600 rounded-xl text-dark-300 hover:text-light-100 hover:bg-dark-700 transition-all"
                            title="Voltar"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-light-100 tracking-tight flex items-center gap-3">
                                {analysis.suggested_file_name || analysis.file_name}
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                    status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                        'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                    }`}>
                                    {status === 'completed' ? 'Sucesso' : status === 'failed' ? 'Falha' : 'Processando'}
                                </span>
                            </h1>
                            <p className="text-dark-500 text-sm font-medium flex items-center gap-2 mt-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(analysis.created_at).toLocaleString('pt-BR')}
                                <span className="text-dark-600 mx-1">•</span>
                                <Building2 className="w-4 h-4" />
                                {analysis.companies?.name || 'Empresa Pendente'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {analysis.original_file_url && (
                            <a
                                href={analysis.original_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-light-100 rounded-xl font-bold transition-all flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Baixar Original
                            </a>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Result Data */}
                    <div className="lg:col-span-7 space-y-6">
                        <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl overflow-hidden relative">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center border border-brand-blue/20">
                                        <FileText className="w-5 h-5 text-brand-blue" />
                                    </div>
                                    <h2 className="text-xl font-bold text-light-100 uppercase tracking-tight">Extração da IA</h2>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(JSON.stringify(analysis_json, null, 2))}
                                    className="p-2 text-dark-500 hover:text-brand-blue transition-colors"
                                    title="Copiar JSON"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {typeof analysis_json === 'object' && analysis_json !== null ? (
                                    Object.entries(analysis_json).map(([key, value]) => {
                                        // Skip technical fields or arrays for simple display
                                        if (key === 'text' || Array.isArray(value)) return null;

                                        return (
                                            <div key={key} className="flex flex-col md:flex-row md:items-center py-4 border-b border-dark-700/50 last:border-0 hover:bg-dark-700/30 px-2 rounded-lg transition-colors group">
                                                <span className="text-xs font-black text-dark-500 uppercase tracking-widest md:w-48 mb-1 md:mb-0 group-hover:text-dark-400 transition-colors">
                                                    {key.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-light-200 font-bold break-all flex-1">
                                                    {value?.toString() || '-'}
                                                </span>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="bg-dark-900/50 rounded-xl p-6 font-mono text-sm text-light-300 whitespace-pre-wrap border border-dark-700">
                                        {typeof analysis_json === 'string' ? analysis_json : JSON.stringify(analysis_json, null, 2)}
                                    </div>
                                )}

                                {analysis_json?.text && (
                                    <div className="mt-8">
                                        <h3 className="text-xs font-black text-dark-500 uppercase tracking-[0.3em] mb-4">Texto Bruto/Observações</h3>
                                        <div className="bg-dark-900/50 rounded-xl p-6 font-mono text-sm text-light-300 whitespace-pre-wrap border border-dark-700 max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {analysis_json.text}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Preview & Info */}
                    <aside className="lg:col-span-5 space-y-6">
                        {/* Preview Section */}
                        <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl overflow-hidden relative">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                    <File className="w-5 h-5 text-emerald-500" />
                                </div>
                                <h2 className="text-xl font-bold text-light-100 uppercase tracking-tight">Documento</h2>
                            </div>

                            <div className="aspect-square w-full bg-dark-900 rounded-2xl flex items-center justify-center overflow-hidden border border-dark-700 group relative">
                                {analysis.original_file_url ? (
                                    isImage ? (
                                        <img
                                            src={analysis.original_file_url}
                                            alt="Preview"
                                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : isPdf ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                                                <FileText className="w-10 h-10 text-red-500" />
                                            </div>
                                            <p className="text-dark-400 font-bold uppercase tracking-widest text-xs">Documento PDF</p>
                                            <a
                                                href={analysis.original_file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs font-bold text-light-100 flex items-center gap-2 transition-all"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Abrir em nova aba
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 p-8 text-center text-dark-500">
                                            <File className="w-16 h-16 opacity-20" />
                                            <p className="text-xs uppercase font-bold tracking-[0.2em]">Visualização indisponível para este tipo de arquivo</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-dark-600">
                                        <AlertCircle className="w-12 h-12 opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest">Arquivo não encontrado</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Metadata Section */}
                        <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl relative group">
                            <h3 className="text-xs font-black text-dark-500 uppercase tracking-[0.3em] mb-6">Informações Técnicas</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-dark-700/30">
                                    <span className="text-[10px] font-black text-dark-600 uppercase">ID do Registro</span>
                                    <span className="text-xs font-mono text-dark-300">{id.substring(0, 18)}...</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-dark-700/30">
                                    <span className="text-[10px] font-black text-dark-600 uppercase">Mimetype</span>
                                    <span className="text-xs font-mono text-dark-300">{file_type || 'Desconhecido'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-[10px] font-black text-dark-600 uppercase">Sincronização</span>
                                    <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Banco de Dados OK
                                    </span>
                                </div>
                            </div>
                        </section>
                    </aside>
                </div>
            </main>
        </div>
    )
}
