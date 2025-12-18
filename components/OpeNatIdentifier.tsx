
import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useApiKey } from '../hooks/useApiKey';
import { ApiKeyConfig } from './ApiKeyConfig';

interface OpeNatItem {
    code: string;
    desc: string;
    base: string;
}

interface AIResult {
    code: string;
    description: string;
    reasoning: string;
    items: string[];
}

// --- MANCHETES DE NOTÍCIAS (Carcinicultura) ---
const NEWS_HEADLINES = [
    "🦐 Brasil amplia exportações de camarão para o mercado asiático em 2025.",
    "📈 Mercado global de camarão deve atingir US$ 60 bilhões até 2026.",
    "🌊 Tecnologia de Bioflocos aumenta produtividade no Nordeste em 15%.",
    "🧬 Pesquisadores desenvolvem linhagens mais resistentes a mancha branca.",
    "🇧🇷 Ceará e Rio Grande do Norte lideram produção nacional de carcinicultura.",
    "💰 Preço do camarão vannamei se estabiliza no mercado interno brasileiro.",
    "🌱 Sustentabilidade: Novas práticas reduzem impacto ambiental nas fazendas.",
    "🤝 FENACAM promete trazer inovações tecnológicas para o setor este ano.",
    "🤖 Inteligência Artificial começa a ser usada para monitorar qualidade da água.",
    "🌍 Demanda por frutos do mar cresce na Europa e impulsiona setor.",
    "📊 Exportações de pescado do Brasil crescem 10% no primeiro trimestre.",
    "🧪 Probióticos na ração melhoram conversão alimentar em viveiros intensivos."
];

// --- BANCO DE DADOS OPE / NAT (Mantido apenas para contexto da IA) ---
const OPE_NAT_DB: OpeNatItem[] = [
    { code: '1', desc: 'COMPRA PARA INDUSTRIALIZAÇÃO 1101-2101', base: 'A' },
    { code: '3', desc: 'COMPRA DE MATERIAL PARA USO E CONSUMO 1556-2556', base: 'A' },
];

export const OpeNatIdentifier: React.FC = () => {
    // AI State
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [codeListFiles, setCodeListFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiResult, setAiResult] = useState<AIResult | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // API Key State (Reusable Hook via LocalStorage)
    const { apiKey: manualApiKey, isOpen: isKeyConfigOpen, setIsOpen: setIsKeyConfigOpen, saveKey: saveApiKey } = useApiKey('FISCAL_GEMINI_KEY');

    // Context Form State
    const [showContextModal, setShowContextModal] = useState(false);
    const [userContext, setUserContext] = useState({
        category: '',
        usage: ''
    });

    // News State
    const [newsIndex, setNewsIndex] = useState(0);

    useEffect(() => {
        let interval: any;
        if (isProcessing) {
            setNewsIndex(0);
            // 5 Seconds News Rotation (synced with processing)
            interval = setInterval(() => {
                setNewsIndex((prev: number) => (prev + 1) % NEWS_HEADLINES.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    // --- SMART UPLOAD LOGIC ---
    const handleSmartUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        let files: File[] = [];


        if ((e as React.DragEvent).dataTransfer) {
            files = Array.from((e as React.DragEvent).dataTransfer.files);
        } else if ((e as React.ChangeEvent<HTMLInputElement>).target.files) {
            files = Array.from((e as React.ChangeEvent<HTMLInputElement>).target.files || []);
        }

        if (files.length === 0) return;

        // Helper to detect file types
        const isCodeList = (f: File) => /\.(csv|txt|xlsx?)$/i.test(f.name);
        // PDF or Images are typically Invoices
        const isInvoice = (f: File) => /\.(pdf|jpg|jpeg|png)$/i.test(f.name);

        let newInvoice = invoiceFile;
        const newTables: File[] = [];

        files.forEach(f => {
            if (isInvoice(f)) {
                newInvoice = f;
            } else if (isCodeList(f)) {
                newTables.push(f);
            }
        });

        if (newInvoice !== invoiceFile) {
            setInvoiceFile(newInvoice);
        }

        if (newTables.length > 0) {
            setCodeListFiles(prev => {
                const existingNames = new Set(prev.map(f => f.name));
                const uniqueNewTables = newTables.filter(f => !existingNames.has(f.name));
                return [...prev, ...uniqueNewTables];
            });
        }
    };

    const removeFile = (type: 'INVOICE' | 'CODE_LIST', index?: number) => {
        if (type === 'INVOICE') {
            setInvoiceFile(null);
        } else if (typeof index === 'number') {
            setCodeListFiles(prev => prev.filter((_, i) => i !== index));
        }
    }

    const fileToGenerativePart = async (file: File) => {
        return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve({
                    inlineData: {
                        data: base64String,
                        mimeType: file.type
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Step 1: Trigger Modal
    const handleStartAnalysis = () => {
        if (!invoiceFile) return;
        setShowContextModal(true);
    };

    // Step 2: Actually Process
    const classifyInvoice = async () => {
        if (!invoiceFile) return;

        setShowContextModal(false); // Close modal
        setIsProcessing(true);
        setAiResult(null);

        try {
            // 5 Seconds Delay (User Request)
            await new Promise(resolve => setTimeout(resolve, 5000));

            const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY;

            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
                throw new Error('Chave de API inválida ou não encontrada.');
            }

            // Prepare Parts
            const invoicePart = await fileToGenerativePart(invoiceFile);

            const codeListParts = await Promise.all(
                codeListFiles.map(file => fileToGenerativePart(file))
            );

            const prompt = `
            Você é um especialista em classificação fiscal e contábil, com foco em carcinicultura (criação de camarão).
            Analise a Nota Fiscal fornecida (imagem/PDF) e consulte as Tabelas de Códigos fornecidas (se houver).

            Contexto Adicional Fornecido pelo Usuário:
            - Categoria do Produto: ${userContext.category}
            - Uso Previsto: ${userContext.usage}

            Tarefa:
            1. Identifique os itens principais na Nota Fiscal.
            2. Com base na natureza do produto e seu uso na carcinicultura, determine o código OPE/NAT mais adequado.
            3. Se houver tabelas de códigos anexadas, tente encontrar uma correspondência exata ou aproximada.

            Responda EXCLUSIVAMENTE com um objeto JSON válido (sem blocos de código markdown) no seguinte formato:
            {
                "code": "CÓDIGO_ENCONTRADO",
                "description": "DESCRIÇÃO_DO_CÓDIGO",
                "reasoning": "Explique por que este código foi escolhido, citando o uso e a categoria.",
                "items": ["Lista", "dos", "itens", "identificados"]
            }
            `;

            const MODELS = [
                "gemini-3-pro-preview",
                "gemini-2.5-pro",
                "gemini-2.5-flash",
                "gemini-2.0-flash-lite",
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-1.5-pro"
            ];

            let lastError = null;
            let success = false;
            let saw403Forbidden = false;

            for (const modelName of MODELS) {
                try {
                    console.log(`Trying model: ${modelName}`);
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: modelName });

                    const parts: any[] = [prompt, invoicePart, ...codeListParts];

                    const result = await model.generateContent(parts);
                    const response = await result.response;
                    const resultText = response.text();

                    // Clean and Parse JSON
                    const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(jsonStr);

                    setAiResult(parsed);
                    success = true;
                    break;
                } catch (e: any) {
                    console.warn(`Model ${modelName} failed:`, e.message);
                    lastError = e;

                    if (e.message?.includes('403') || e.message?.includes('leaked') || e.message?.includes('API key')) {
                        saw403Forbidden = true;
                    }
                }
            }

            if (!success) {
                // Prioritize the 403 error if it happened at any point
                if (saw403Forbidden) {
                    setIsKeyConfigOpen(true);
                    throw new Error("Sua chave de API foi bloqueada ou vazou (Erro 403). Por favor, gere uma nova chave no Google AI Studio.");
                }
                throw lastError || new Error("Todos os modelos falharam. Verifique sua chave de API e conexão.");
            }
        } catch (error: any) {
            console.error("Erro na classificação:", error);
            alert(`Erro ao processar a nota fiscal: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const renderProcessingScreen = () => (
        <div className="flex flex-col items-center justify-center min-h-[300px] animate-in fade-in duration-500 py-8">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl pb-1">
                    🦐
                </div>
            </div>

            <div className="max-w-xl text-center px-4">
                <div className="mb-4 flex justify-center">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold tracking-wider uppercase animate-pulse border border-indigo-200">
                        Notícias do Setor
                    </span>
                </div>

                <h2 className="text-lg md:text-xl font-bold text-gray-800 leading-relaxed transition-all duration-300 min-h-[80px] flex items-center justify-center">
                    "{NEWS_HEADLINES[newsIndex]}"
                </h2>

                <div className="flex gap-2 justify-center mt-6">
                    {NEWS_HEADLINES.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-500 ${idx === newsIndex ? 'w-6 bg-indigo-500' : 'w-1.5 bg-gray-200'}`}
                        />
                    ))}
                </div>

                <p className="text-gray-400 text-xs mt-6 font-medium uppercase tracking-wide">
                    Analisando Nota Fiscal e Cruzando Dados...
                </p>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <ApiKeyConfig
                isOpen={isKeyConfigOpen}
                onClose={() => setIsKeyConfigOpen(false)}
                apiKey={manualApiKey}
                onSave={(key) => { saveApiKey(key); alert('Chave Salva!'); }}
                title="Configuração de API Key (Fiscal)"
            />

            <div className="absolute top-0 right-0">
                <button
                    onClick={() => setIsKeyConfigOpen(true)}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Configurar Chave API Manualmente"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
            </div>
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Identificador de OPE / NAT</h1>
                <p className="text-gray-500">Ferramenta de classificação automática e identificação de Natureza de Operação.</p>
                <p className="text-xs text-indigo-600 font-bold bg-indigo-50 inline-block px-2 py-1 rounded border border-indigo-100">
                    Modo: Carcinicultura (Camarão) Ativo
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-8">
                {isProcessing ? (
                    renderProcessingScreen()
                ) : (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">

                        {/* Header Section */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                            <h2 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-600">
                                    <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" />
                                    <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                                </svg>
                                Análise Inteligente de Notas
                            </h2>
                            <p className="text-sm text-indigo-700">
                                O sistema analisa os itens da nota fiscal considerando a cadeia produtiva do camarão.
                            </p>
                        </div>

                        {/* --- UNIFIED UPLOAD ZONE --- */}
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${isDragOver ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-gray-300 bg-gray-50/50 hover:bg-white hover:border-indigo-400'}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleSmartUpload}
                        >
                            <input
                                type="file"
                                multiple
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleSmartUpload}
                                accept=".pdf,.jpg,.jpeg,.png,.csv,.txt,.xls,.xlsx"
                            />

                            <div className="pointer-events-none relative z-0">
                                <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">Arraste seus arquivos aqui</h3>
                                <p className="text-gray-500 mt-2 text-sm">
                                    Arraste 1 <span className="font-bold text-gray-700">Nota Fiscal (PDF/Img)</span> e múltiplas <span className="font-bold text-gray-700">Tabelas de Códigos</span>.
                                </p>
                                <button className="mt-6 px-6 py-2 bg-white border border-gray-200 shadow-sm rounded-lg text-sm font-semibold text-gray-700 hover:text-indigo-600">
                                    Selecionar Arquivos
                                </button>
                            </div>
                        </div>

                        {/* --- FILE SLOTS DISPLAY --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Slot 1: Tabela de Códigos (Multiple) */}
                            <div className={`p-4 rounded-xl border transition-all ${codeListFiles.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 border-dashed opacity-70'}`}>
                                <div className="flex flex-col gap-2">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 block ${codeListFiles.length > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                        1. Tabelas de Códigos (Opcional - Múltiplos)
                                    </span>

                                    {codeListFiles.length > 0 ? (
                                        <div className="space-y-2">
                                            {codeListFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white/50 p-2 rounded-lg border border-green-100">
                                                    <div className="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                                            <polyline points="10 9 9 9 8 9"></polyline>
                                                        </svg>
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-800 truncate max-w-[150px]">{file.name}</p>
                                                            <p className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeFile('CODE_LIST', idx)} className="text-gray-400 hover:text-red-500 p-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-gray-400 italic">Nenhum arquivo de código</p>
                                    )}
                                </div>
                            </div>

                            {/* Slot 2: Nota Fiscal */}
                            <div className={`p-4 rounded-xl border transition-all ${invoiceFile ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 border-dashed'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 block ${invoiceFile ? 'text-green-700' : 'text-gray-400'}`}>
                                            2. Nota Fiscal (Obrigatório)
                                        </span>
                                        {invoiceFile ? (
                                            <div className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600">
                                                    <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
                                                    <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                                                </svg>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800 truncate max-w-[150px]">{invoiceFile.name}</p>
                                                    <p className="text-[10px] text-gray-500">{(invoiceFile.size / 1024).toFixed(0)} KB</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium text-red-400 italic">* Aguardando Arquivo</p>
                                        )}
                                    </div>
                                    {invoiceFile && (
                                        <button onClick={() => removeFile('INVOICE')} className="text-gray-400 hover:text-red-500 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Button - NOW TRIGGERS MODAL */}
                        <div className="text-center pt-4">
                            <button
                                onClick={handleStartAnalysis}
                                disabled={!invoiceFile}
                                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${!invoiceFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30'}`}
                            >
                                Analisar Nota Fiscal
                            </button>
                        </div>

                        {/* Results Area */}
                        {aiResult && (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                                    <h3 className="font-bold text-green-800">Resultado da Análise</h3>
                                    <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-green-200 text-green-700">
                                        Classificação Automática
                                    </span>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Código Sugerido</label>
                                            <div className="text-3xl font-black text-slate-800 font-mono">{aiResult.code}</div>
                                            <div className="text-lg text-slate-600 font-medium">{aiResult.description}</div>
                                        </div>
                                        <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Itens Identificados</label>
                                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                                {aiResult.items && aiResult.items.map((item, idx) => (
                                                    <li key={idx}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Motivo da Classificação</label>
                                        <p className="text-sm text-slate-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 leading-relaxed">
                                            {aiResult.reasoning}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- CONTEXT MODAL --- */}
            {showContextModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContextModal(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-indigo-900 border-b border-gray-100 pb-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-indigo-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Direcionamento Técnico</h3>
                                <p className="text-xs text-gray-500">Ajude a IA a ser mais precisa.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Que categoria é o produto?
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Ex: Ração, Equipamento, Material de Limpeza..."
                                    value={userContext.category}
                                    onChange={(e) => setUserContext({ ...userContext, category: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Para que será usado?
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Ex: Alimentação no viveiro, manutenção do aerador, uso no escritório..."
                                    value={userContext.usage}
                                    onChange={(e) => setUserContext({ ...userContext, usage: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-2 border-t border-gray-100">
                            <button
                                onClick={() => setShowContextModal(false)}
                                className="flex-1 py-2.5 text-gray-600 font-bold hover:bg-gray-50 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={classifyInvoice}
                                disabled={!userContext.category.trim() || !userContext.usage.trim()}
                                className={`flex-1 py-2.5 text-white font-bold rounded-lg shadow transition-colors ${!userContext.category.trim() || !userContext.usage.trim()
                                    ? 'bg-indigo-300 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                            >
                                Confirmar e Analisar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
