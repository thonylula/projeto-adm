// [AI-LOCK: CLOSED]
import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SupabaseService } from '../services/supabaseService';
import { getOrchestrator } from '../services/agentService';

// --- Interfaces based on User Data ---
interface HarvestData {
    id: string;
    data: string;
    viveiro: string;
    cliente: string;
    producao: number;
    preco: number;
    pesoMedio: number;
    sobrevivencia: string;
    fca: string;
    diasCultivo: number;
    laboratorio: string;
    notas: string;
    visible: boolean; // For filtering/checkbox logic
}

interface ClientInfo {
    codigo: string;
    prazo: string;
}

interface DeliveryOrderProps {
    isPublic?: boolean;
    initialView?: 'INPUT' | 'DASHBOARD' | 'HISTORY' | 'SHOWCASE';
}

// --- Hardcoded Data (Ported from User Source) ---
const INITIAL_HARVEST_DATA: HarvestData[] = [];

const CLIENT_INFO: Record<string, ClientInfo> = {
    "CEAGESP": { codigo: "8410", prazo: "28 dias" },
    "Funelli": { codigo: "946", prazo: "18 dias" },
    "Victor": { codigo: "---", prazo: "---" },
    "Henrique": { codigo: "---", prazo: "---" }
};

// --- Styles constants (Tone on Tone Orange) ---
const COLORS = {
    primary: '#f26522',    // Orange
    secondary: '#ff9d6c',  // Light Orange
    dark: '#d95213',       // Dark Orange
    soft: '#fff5f0',       // Very Light Orange
    text: '#3a3a3a'
};

// --- Formatters ---
const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (val: number, unit = '') => val.toLocaleString('pt-BR') + unit;
const formatGrams = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' g';

// --- Helper for AI Numeric Parsing ---
const safeParseNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;

    // If it's already a number, but has 3 decimal places (e.g. 3.675), 
    // it's highly likely it was a "thousands" dot that got treated as decimal
    if (typeof val === 'number') {
        const strVal = val.toString();
        if (strVal.includes('.') && strVal.split('.')[1].length === 3) {
            return val * 1000;
        }
        return val;
    }

    if (typeof val === 'string') {
        // Remove units and spaces
        let clean = val.replace(/[^\d,.-]/g, '');

        // Handle Brazilian thousands separator: "3.728" or "3.000"
        if (clean.includes('.') && !clean.includes(',')) {
            const parts = clean.split('.');
            // If the last part has exactly 3 digits, it's likely a thousands separator
            if (parts.length > 1 && parts[parts.length - 1].length === 3) {
                clean = clean.replace(/\./g, '');
            }
        }

        // Final swap: comma to dot for parseFloat
        clean = clean.replace(',', '.');
        return parseFloat(clean) || 0;
    }
    return 0;
};

export const DeliveryOrder: React.FC<DeliveryOrderProps> = ({ isPublic = false, initialView }) => {
    const [view, setView] = useState<'INPUT' | 'DASHBOARD' | 'HISTORY' | 'SHOWCASE'>(initialView || 'INPUT');
    const [inputText, setInputText] = useState('');
    const [data, setData] = useState<HarvestData[]>(INITIAL_HARVEST_DATA);
    const [logo, setLogo] = useState<string | null>(null);

    // --- DETECT SHOWCASE MODE ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('showcase') === 'true') {
            setView('SHOWCASE');
        }
    }, []);

    // --- PERSISTÊNCIA AUTOMÁTICA (AGENT STORAGE) ---
    useEffect(() => {
        const load = async () => {
            const orchestrator = getOrchestrator();
            const result = await orchestrator.routeToAgent('delivery-storage', { operation: 'load' });

            if (result && result.data && result.data.length > 0) {
                const uniqueData = removeDuplicates(result.data);
                setData(uniqueData);
                if (result.logo) setLogo(result.logo);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (data.length > 0 || logo) {
            const orchestrator = getOrchestrator();
            orchestrator.routeToAgent('delivery-storage', {
                operation: 'save',
                data,
                logo
            });
        }
    }, [data, logo]);

    // Dynamic document title
    useEffect(() => {
        if (view === 'SHOWCASE') {
            document.title = "Faturamento";
        } else if (view === 'HISTORY') {
            document.title = "Histórico Financeiro | Carapitanga";
        } else {
            document.title = "Acompanhamento de Faturamento | Carapitanga";
        }
    }, [view]);

    const reportRef = useRef<HTMLDivElement>(null);

    // Derived state for summary logic
    const activeData = data.filter(d => d.visible);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState(false);
    const [generatedEmail, setGeneratedEmail] = useState('');

    // --- Deduplication Helper ---
    const getRecordFingerprint = (item: HarvestData) => {
        // Unique key based on business fields, normalized to avoid subtle duplicates
        const date = item.data?.trim() || "";
        const client = item.cliente?.trim().toLowerCase() || "";
        const tank = item.viveiro?.trim().toLowerCase() || "";
        const prod = Number(item.producao) || 0;
        const price = Number(item.preco) || 0;

        return `${date}-${client}-${tank}-${prod}-${price}`;
    };

    const removeDuplicates = (items: HarvestData[]) => {
        const seen = new Set();
        return items.filter(item => {
            const fingerprint = getRecordFingerprint(item);
            if (seen.has(fingerprint)) return false;
            seen.add(fingerprint);
            return true;
        });
    };

    // --- AGENT SMART UPLOAD ---
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleProcess = async () => {
        if (!inputText.trim()) return;
        setIsAnalyzing(true);

        try {
            const orchestrator = getOrchestrator();
            const results = await orchestrator.routeToAgent('delivery-order', { text: inputText });

            if (results && Array.isArray(results)) {
                const newItems: HarvestData[] = results.map((item: any) => ({
                    id: Date.now() + Math.random(),
                    data: item.data || new Date().toLocaleDateString(),
                    viveiro: item.viveiro || "---",
                    cliente: item.cliente || "Desconhecido",
                    producao: safeParseNumber(item.producao),
                    preco: safeParseNumber(item.preco),
                    pesoMedio: safeParseNumber(item.pesoMedio),
                    sobrevivencia: item.sobrevivencia || "---",
                    fca: item.fca || "---",
                    diasCultivo: safeParseNumber(item.diasCultivo),
                    laboratorio: item.laboratorio || "---",
                    notas: item.notas || "",
                    visible: true
                }));

                setData(prev => {
                    const existingFingerprints = new Set(prev.map(getRecordFingerprint));
                    const uniqueNewItems = newItems.filter(item => !existingFingerprints.has(getRecordFingerprint(item)));
                    return [...prev, ...uniqueNewItems];
                });
                setInputText('');
                setView('DASHBOARD');
            }
        } catch (error) {
            console.error("Agent Processing Error", error);
            alert("Erro ao processar dados com IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setLogo(ev.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const clearAllData = () => {
        if (window.confirm("Tem certeza que deseja apagar todos os dados e começar de novo?")) {
            setData([]);
            SupabaseService.saveDeliveryOrders([], null);
        }
    };

    const toggleRow = (id: number) => {
        setData(prev => prev.map(item =>
            item.id === id ? { ...item, visible: !item.visible } : item
        ));
    };

    // --- EDIT & DELETE ACTIONS ---
    const [editingItem, setEditingItem] = useState<HarvestData | null>(null);

    const handleDelete = (id: number) => {
        if (window.confirm("Tem certeza que deseja excluir este registro?")) {
            setData(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleEditClick = (item: HarvestData) => {
        setEditingItem({ ...item }); // Copy to avoid direct mutation
    };

    const handleSaveEdit = () => {
        if (!editingItem) return;

        // Check for duplicate BEFORE saving edit
        const fingerprint = getRecordFingerprint(editingItem);
        const isDuplicate = data.some(item =>
            item.id !== editingItem.id && getRecordFingerprint(item) === fingerprint
        );

        if (isDuplicate) {
            alert("Erro: Esta alteração criaria um registro duplicado (Mesma data, cliente, viveiro, produção e preço).");
            return;
        }

        setData(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));
        setEditingItem(null);
    };

    const handleEditChange = (field: keyof HarvestData, value: string | number) => {
        if (editingItem) {
            setEditingItem({ ...editingItem, [field]: value });
        }
    };

    const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setIsAnalyzing(true);

        try {
            const orchestrator = getOrchestrator();

            // Helper to convert file to base64
            const toBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(f);
                reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
                reader.onerror = error => reject(error);
            });

            const base64 = await toBase64(file);
            const results = await orchestrator.routeToAgent('delivery-order', {
                image: base64,
                mimeType: file.type
            });

            if (results && Array.isArray(results)) {
                const newItems: HarvestData[] = results.map((item: any) => ({
                    id: Date.now() + Math.random(),
                    data: item.data || new Date().toLocaleDateString(),
                    viveiro: item.viveiro || "---",
                    cliente: item.cliente || "Desconhecido",
                    producao: safeParseNumber(item.producao),
                    preco: safeParseNumber(item.preco),
                    pesoMedio: safeParseNumber(item.pesoMedio),
                    sobrevivencia: item.sobrevivencia || "---",
                    fca: item.fca || "---",
                    diasCultivo: safeParseNumber(item.diasCultivo),
                    laboratorio: item.laboratorio || "---",
                    notas: item.notas || "",
                    visible: true
                }));

                setData(prev => {
                    const existingFingerprints = new Set(prev.map(getRecordFingerprint));
                    const uniqueNewItems = newItems.filter(item => !existingFingerprints.has(getRecordFingerprint(item)));
                    return [...prev, ...uniqueNewItems];
                });
                setView('DASHBOARD');
            }
        } catch (error) {
            console.error("Smart Upload Error", error);
            alert("Erro ao processar arquivo com IA.");
        } finally {
            setIsAnalyzing(false);
            e.target.value = '';
        }
    };

    // --- Calculation for Totals (Footer & KPIs) ---
    const grandTotals = activeData.reduce((acc, curr) => {
        const sobrevValue = parseFloat(curr.sobrevivencia.replace('%', '').replace(',', '.')) || 0;
        const fcaValue = parseFloat(curr.fca.replace(',', '.')) || 0;

        return {
            biomass: acc.biomass + curr.producao,
            value: acc.value + (curr.producao * curr.preco),
            sobrevSum: acc.sobrevSum + sobrevValue,
            fcaSum: acc.fcaSum + fcaValue,
            count: acc.count + 1
        };
    }, { biomass: 0, value: 0, sobrevSum: 0, fcaSum: 0, count: 0 });

    // --- Calculation for Summary Cards (Grouping) ---
    const summaryByClient = useMemo(() => {
        const summary: Record<string, {
            biomass: number;
            value: number;
            gramaturas: number[];
            precos: number[];
            count: number;
        }> = {};

        // Use ALL visible data for summary? Or should summary ignore 'Ocultar'?
        // User HTML logic: "handleCheckboxChange... Recalcula os totais gerais (nova funcionalidade) document.getElementById('total-biomassa')"
        // It seems the "Ocultar" checkbox affects the 'visible' state visually. 
        // The user logic for summary cards ("Agrega dados para o resumo... harvestData.forEach") RUNS ONCE on load in the HTML.
        // However, standard React patterns suggest summaries should reflect current state. 
        // Let's make summary cards reflect ALL loaded data, but the TABLE footer reflect CHECKED rows.
        // User HTML: "Checked boxes... Recalcula os totais gerais... soma os valores".
        // BUT "Ocultar/Show" logic implies those rows are removed from calculation?
        // In the HTML script: "toggleRow" HIDES the tds. "updateGrandTotals" sums only CHECKED boxes.
        // So yes, unchecked = excluded from total.

        // IMPORTANT: The HTML summary cards generation (lines 485+) iterates over `harvestData` which is the FULL LIST.
        // It DOES NOT seem to react to the checkboxes.
        // So Summary Cards = All Data. Table Footer = Checked Data.

        data.forEach(row => {
            const valorTotal = row.producao * row.preco;

            if (!summary[row.cliente]) {
                summary[row.cliente] = { biomass: 0, value: 0, gramaturas: [], precos: [], count: 0 };
            }

            summary[row.cliente].biomass += row.producao;
            summary[row.cliente].value += valorTotal;
            summary[row.cliente].gramaturas.push(row.pesoMedio);
            summary[row.cliente].precos.push(row.preco);
            summary[row.cliente].count++;
        });

        return summary;
    }, [data]);

    // --- Gemini API Logic ---
    const generateEmail = async (cliente: string) => {
        setModalOpen(true);
        setModalLoading(true);
        setModalError(false);
        setGeneratedEmail('');

        const clientSummary = summaryByClient[cliente];
        const info = CLIENT_INFO[cliente] || { codigo: "---", prazo: "---" };

        if (!clientSummary) {
            setModalError(true);
            setModalLoading(false);
            setGeneratedEmail('Erro: Dados do resumo do cliente não encontrados.');
            return;
        }

        try {
            const orchestrator = getOrchestrator();
            const result = await orchestrator.routeToAgent('delivery-document', {
                type: 'email',
                client: cliente,
                data: clientSummary,
                paymentTerms: info.prazo
            });

            if (result && result.content) {
                setGeneratedEmail(result.content);
            } else {
                throw new Error("Resposta do Agente inválida.");
            }
        } catch (e) {
            console.error(e);
            setModalError(true);
        } finally {
            setModalLoading(false);
        }
    };

    // --- EXPORT & BACKUP ACTIONS ---
    const handleBackup = () => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_ordem_entrega_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);
                if (Array.isArray(parsed)) {
                    setData(parsed);
                    alert("Backup restaurado com sucesso!");
                }
            } catch (err) {
                alert("Erro ao ler arquivo de backup.");
            }
        };
        reader.readAsText(file);
    };

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Ordem_Entrega_${new Date().toLocaleDateString('pt-BR')}.pdf`);
    };

    const handleExportPNG = async () => {
        if (!reportRef.current) return;
        const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `Ordem_Entrega_${new Date().toLocaleDateString('pt-BR')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const handleExportHTML = () => {
        if (!reportRef.current) return;
        navigator.clipboard.writeText(reportRef.current.outerHTML).then(() => {
            alert("HTML copiado para a área de transferência!");
        });
    };

    const handleShareShowcase = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('showcase', 'true');
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert("Link do Mostruário copiado! Você pode enviar este link para outras pessoas visualizarem.");
        });
    };

    // --- MANUAL SAVE ---
    const [isSaving, setIsSaving] = useState(false);

    const handleManualSave = async () => {
        if (data.length === 0) {
            alert("Não há dados para salvar.");
            return;
        }

        setIsSaving(true);
        try {
            const success = await SupabaseService.saveDeliveryOrders(data, logo);
            if (success) {
                alert("Dados salvos no banco de dados com sucesso!");
            } else {
                alert("Erro ao salvar no banco. Verifique o console.");
            }
        } catch (error) {
            console.error("Manual save error:", error);
            alert("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- HISTORY VIEW ---
    const [historyFilters, setHistoryFilters] = useState({
        startDate: '',
        endDate: '',
        cliente: ''
    });

    // Helper to process history
    const historyData = useMemo(() => {
        // 1. Filter Data
        let filtered = data;

        if (historyFilters.startDate) {
            const start = new Date(historyFilters.startDate);
            filtered = filtered.filter(d => {
                const [day, month, year] = d.data.split('/');
                return new Date(Number(year), Number(month) - 1, Number(day)) >= start;
            });
        }

        if (historyFilters.endDate) {
            const end = new Date(historyFilters.endDate);
            filtered = filtered.filter(d => {
                const [day, month, year] = d.data.split('/');
                return new Date(Number(year), Number(month) - 1, Number(day)) <= end;
            });
        }

        if (historyFilters.cliente) {
            filtered = filtered.filter(d => d.cliente === historyFilters.cliente);
        }

        // 2. Grouping Logic
        const months: Record<string, { biomass: number, value: number }> = {};
        const quarters: Record<string, { biomass: number, value: number }> = {};
        const semesters: Record<string, { biomass: number, value: number }> = {};
        const years: Record<string, { biomass: number, value: number }> = {};

        filtered.forEach(item => {
            const [day, mStr, yStr] = item.data.split('/');
            const m = Number(mStr);
            const y = Number(yStr);
            const valor = item.producao * item.preco;

            // Month
            const monthKey = `${mStr}/${yStr}`;
            if (!months[monthKey]) months[monthKey] = { biomass: 0, value: 0 };
            months[monthKey].biomass += item.producao;
            months[monthKey].value += valor;

            // Quarter
            const q = Math.ceil(m / 3);
            const qKey = `${q}º Trim/${y}`;
            if (!quarters[qKey]) quarters[qKey] = { biomass: 0, value: 0 };
            quarters[qKey].biomass += item.producao;
            quarters[qKey].value += valor;

            // Semester
            const s = Math.ceil(m / 6);
            const sKey = `${s}º Sem/${y}`;
            if (!semesters[sKey]) semesters[sKey] = { biomass: 0, value: 0 };
            semesters[sKey].biomass += item.producao;
            semesters[sKey].value += valor;

            // Year
            const yKey = `${y}`;
            if (!years[yKey]) years[yKey] = { biomass: 0, value: 0 };
            years[yKey].biomass += item.producao;
            years[yKey].value += valor;
        });

        return { months, quarters, semesters, years, filteredCount: filtered.length };
    }, [data, historyFilters]);

    // Unique clients for filter
    const uniqueClients = useMemo(() => Array.from(new Set(data.map(d => d.cliente))), [data]);

    // --- Views ---

    if (view === 'INPUT') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-white rounded-lg shadow-sm">
                <div className="w-full max-w-2xl space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Importar Ordem de Entrega</h2>
                        <p className="text-gray-500">Cole o código ou texto com os dados da despesca abaixo para gerar o resumo.</p>
                    </div>

                    <div className="space-y-4">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Cole os dados aqui..."
                            className="w-full h-48 p-4 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all font-mono text-sm resize-none"
                        />

                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                                    <p className="text-xs text-gray-500">
                                        {isAnalyzing ? 'PROCESSANDO COM AGENTE...' : 'Imagem ou PDF (Agente Logístico)'}
                                    </p>
                                </div>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={handleSmartUpload}
                                    accept="image/*,application/pdf"
                                    disabled={isAnalyzing}
                                />
                            </label>
                        </div>

                        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={handleProcess}
                                className="w-full py-3 px-6 bg-[#f26522] hover:bg-[#d95213] text-white font-bold rounded-xl shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 group"
                            >
                                <span>Processar Dados</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </button>

                            <button
                                onClick={() => setView('DASHBOARD')}
                                className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:shadow-slate-200 transition-all flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                </svg>
                                <span>Ver Lançamentos Realizados</span>
                            </button>
                        </div>

                        <div className="flex justify-center">
                            <label className="max-w-xs w-full py-2 px-6 bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                                {logo ? 'Alterar Logo' : 'Adicionar Logo'}
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                        </div>

                        {data.length > 0 && (
                            <button
                                onClick={clearAllData}
                                className="w-full py-2 text-sm text-gray-400 hover:text-red-500 transition-colors underline"
                            >
                                Limpar Base de Dados Atual
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // DASHBOARD VIEW
    return (
        <div className="space-y-8 font-inter animate-fadeIn pb-20">
            <header className="bg-gradient-to-r from-[#f26522] to-[#ff9d6c] p-10 rounded-3xl shadow-2xl text-white flex flex-col md:flex-row justify-between items-center md:items-start gap-8 text-left">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {logo && (
                        <div className="w-64 h-32 bg-white p-4 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden border-2 border-orange-100 shrink-0">
                            <img src={logo} alt="Empresa Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    <div className="flex flex-col items-center md:items-start">
                        <h2 className="text-5xl font-black tracking-tight mb-2">
                            {view === 'SHOWCASE' ? 'Faturamento' : view === 'HISTORY' ? 'Histórico Financeiro' : 'Resumo de Faturamento'}
                        </h2>
                        <p className="text-orange-50/90 font-bold text-xl">Carapitanga 0019 (Ocean)</p>
                        <p className="text-orange-100/70 text-base font-medium">Gestão Inteligente</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center justify-center md:justify-end" data-html2canvas-ignore>
                    {/* Navigation Pills (Glassmorphism) - Hidden for visitors unless they have history */}
                    {!isPublic && (
                        <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/20 gap-1 shadow-inner">
                            <button
                                onClick={() => setView('DASHBOARD')}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${view === 'DASHBOARD' ? 'bg-white text-orange-600 shadow-md' : 'text-white hover:bg-white/10'}`}
                            >
                                Tabela
                            </button>
                            <button
                                onClick={() => setView('HISTORY')}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${view === 'HISTORY' ? 'bg-white text-orange-600 shadow-md' : 'text-white hover:bg-white/10'}`}
                            >
                                Histórico
                            </button>
                        </div>
                    )}

                    {/* Action Group */}
                    <div className="flex items-center gap-3">
                        {!isPublic && (
                            <button
                                onClick={() => setView('INPUT')}
                                className="px-6 py-2.5 rounded-2xl bg-white text-orange-600 font-bold hover:bg-orange-50 transition-all shadow-xl flex items-center gap-2 text-sm border-2 border-transparent hover:border-orange-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Nova Importação
                            </button>
                        )}

                        {view === 'SHOWCASE' && !isPublic && (
                            <button
                                onClick={handleShareShowcase}
                                className="px-6 py-2.5 rounded-2xl bg-[#f26522] text-white font-bold hover:bg-[#d95213] transition-all shadow-xl flex items-center gap-2 text-sm border border-white/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                </svg>
                                Compartilhar
                            </button>
                        )}

                        {view === 'SHOWCASE' && !isPublic && (
                            <button
                                onClick={() => {
                                    const url = new URL(window.location.href);
                                    url.searchParams.delete('showcase');
                                    window.history.replaceState({}, '', url.toString());
                                    setView('DASHBOARD');
                                }}
                                className="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold transition-all border border-white/20 text-sm shadow-md"
                            >
                                Voltar ao Painel
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {view === 'HISTORY' ? (
                <div className="space-y-8">
                    {/* FILTERS */}
                    <section className="bg-white p-6 rounded-2xl shadow-lg border border-orange-50 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Data Início</label>
                            <input
                                type="date"
                                value={historyFilters.startDate}
                                onChange={e => setHistoryFilters({ ...historyFilters, startDate: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-[#f26522] focus:border-[#f26522]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Data Fim</label>
                            <input
                                type="date"
                                value={historyFilters.endDate}
                                onChange={e => setHistoryFilters({ ...historyFilters, endDate: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-[#f26522] focus:border-[#f26522]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Cliente</label>
                            <select
                                value={historyFilters.cliente}
                                onChange={e => setHistoryFilters({ ...historyFilters, cliente: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-[#f26522] focus:border-[#f26522]"
                            >
                                <option value="">Todos</option>
                                {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center pb-2 text-gray-500 font-medium">
                            {historyData.filteredCount} registros encontrados
                        </div>
                    </section>

                    {/* HISTORY GRIDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <HistoryCard title="Balancete Mensal" data={historyData.months} color="blue" />
                        <HistoryCard title="Balancete Trimestral" data={historyData.quarters} color="purple" />
                        <HistoryCard title="Balancete Semestral" data={historyData.semesters} color="emerald" />
                        <HistoryCard title="Balancete Anual" data={historyData.years} color="amber" />
                    </div>
                </div>
            ) : (
                <>
                    {view === 'SHOWCASE' && (
                        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8 animate-fadeIn">
                            {/* Biomassa Total */}
                            <div className="bg-white p-5 rounded-2xl shadow-lg border-t-4 border-[#f26522] flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                    </svg>
                                </div>
                                <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest">Biomassa Total</p>
                                <h4 className="text-xl font-black text-gray-900">{formatNumber(grandTotals.biomass, ' kg')}</h4>
                            </div>

                            {/* Valor Gerado */}
                            <div className="bg-white p-5 rounded-2xl shadow-lg border-t-4 border-green-500 flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 5V5m0 16c-1.11 0-2.08-.402-2.599-1M12 21V11m0 10c-1.11 0-2.08-.402-2.599-1M12 21V11" />
                                    </svg>
                                </div>
                                <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest">Valor Gerado</p>
                                <h4 className="text-xl font-black text-green-600">{formatCurrency(grandTotals.value)}</h4>
                            </div>

                            {/* Preço Médio Global */}
                            <div className="bg-white p-5 rounded-2xl shadow-lg border-t-4 border-blue-500 flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest">Preço Médio Global</p>
                                <h4 className="text-xl font-black text-blue-600">{formatCurrency(grandTotals.value / (grandTotals.biomass || 1))}/kg</h4>
                            </div>

                            {/* Sobrevivência Média */}
                            <div className="bg-white p-5 rounded-2xl shadow-lg border-t-4 border-indigo-500 flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest">Sobrevivência Média</p>
                                <h4 className="text-xl font-black text-indigo-600">{(grandTotals.sobrevSum / (grandTotals.count || 1)).toFixed(1)}%</h4>
                            </div>

                            {/* FCA Médio */}
                            <div className="bg-white p-5 rounded-2xl shadow-lg border-t-4 border-amber-500 flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest">FCA Médio</p>
                                <h4 className="text-xl font-black text-amber-600">{(grandTotals.fcaSum / (grandTotals.count || 1)).toFixed(2)}</h4>
                            </div>
                        </section>
                    )}

                    <section className="bg-white rounded-2xl shadow-xl shadow-orange-100/50 overflow-hidden border border-orange-50">
                        <div className="overflow-x-auto" ref={reportRef}>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#f26522] text-white">
                                        {view !== 'SHOWCASE' && <th className="p-2 text-center w-12" data-html2canvas-ignore></th>}
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Data</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Viveiro</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Cliente</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Produção</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">P. Médio</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Preço</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Total</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Sobrev.</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">FCA</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Ciclo</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Laborat.</th>
                                        <th className="p-2 text-left font-bold uppercase text-[0.70rem] tracking-wider">Obs</th>
                                        {view !== 'SHOWCASE' && <th className="p-2 text-center font-bold uppercase text-[0.70rem] tracking-wider last:rounded-tr-2xl" data-html2canvas-ignore>Ações</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-50">
                                    {data.filter(row => view === 'SHOWCASE' ? row.visible : true).map((row) => (
                                        <tr key={row.id} className={`transition-colors h-10 ${row.visible ? 'bg-white hover:bg-orange-50/30' : 'bg-gray-50/50 opacity-50'}`}>
                                            {view !== 'SHOWCASE' && (
                                                <td className="p-2 text-center" data-html2canvas-ignore>
                                                    <input
                                                        type="checkbox"
                                                        checked={row.visible}
                                                        onChange={() => toggleRow(row.id)}
                                                        className="h-4 w-4 rounded-md text-[#f26522] focus:ring-[#f26522] border-orange-200 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            <td className="p-2 text-xs font-semibold text-gray-500">{row.data}</td>
                                            <td className="p-2 text-xs font-bold text-gray-700">{row.viveiro}</td>
                                            <td className="p-2 text-xs font-extrabold text-[#f26522]">{row.cliente}</td>
                                            <td className="p-2 text-xs font-black text-gray-900">{formatNumber(row.producao, ' kg')}</td>
                                            <td className="p-2 text-xs text-gray-600 font-medium">{formatGrams(row.pesoMedio)}</td>
                                            <td className="p-2 text-xs text-gray-600 font-medium">{formatCurrency(row.preco)}</td>
                                            <td className="p-2 text-xs font-black text-green-600 bg-green-50/30">{formatCurrency(row.producao * row.preco)}</td>
                                            <td className="p-2 text-xs text-gray-600">{row.sobrevivencia}</td>
                                            <td className="p-2 text-xs text-gray-600">{row.fca}</td>
                                            <td className="p-2 text-xs text-gray-600">{row.diasCultivo} d</td>
                                            <td className="p-2 text-xs text-gray-600 font-semibold">{row.laboratorio}</td>
                                            <td className="p-2 text-[0.70rem] text-red-500 font-bold max-w-[100px] truncate">{row.notas}</td>
                                            {view !== 'SHOWCASE' && (
                                                <td className="p-2 text-center" data-html2canvas-ignore>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleEditClick(row)} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                        <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-orange-50/50 font-black text-[#3a3a3a] border-t-2 border-[#f26522]">
                                    <tr>
                                        <td colSpan={4} className="p-3 text-right text-xs uppercase tracking-widest text-gray-500 bg-orange-100/50">Total Selecionado</td>
                                        <td className="p-3 text-lg text-[#f26522] bg-orange-100/50">{formatNumber(grandTotals.biomass, ' kg')}</td>
                                        <td colSpan={2} className="bg-orange-100/50"></td>
                                        <td className="p-3 text-lg text-green-600 bg-orange-100/50">{formatCurrency(grandTotals.value)}</td>
                                        <td colSpan={5} className="bg-orange-100/50"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-8 w-2 bg-[#f26522] rounded-full"></div>
                            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Resumo Consolidado</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {Object.entries(summaryByClient).map(([cliente, summaryData]: [string, any]) => {
                                const info = CLIENT_INFO[cliente] || { codigo: '---', prazo: '---' };
                                const mediaGramatura = summaryData.gramaturas.reduce((a: number, b: number) => a + b, 0) / summaryData.count;
                                const mediaPreco = summaryData.value / summaryData.biomass;

                                return (
                                    <div key={cliente} className="group bg-white rounded-3xl p-8 shadow-xl shadow-orange-100/30 border border-orange-50 flex flex-col h-full transform transition-all hover:-translate-y-2 hover:shadow-orange-200/50">
                                        <div className="flex justify-between items-start mb-6">
                                            <h4 className="text-2xl font-black text-[#3a3a3a] leading-tight">{cliente}</h4>
                                            <div className="bg-orange-100 text-[#f26522] p-2 rounded-xl">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="space-y-4 flex-1">
                                            <SummaryItem label="ID Faturamento" value={info.codigo} />
                                            <SummaryItem label="Pagamento" value={info.prazo} />
                                            <SummaryItem label="Biomassa" value={formatNumber(summaryData.biomass, ' kg')} />
                                            <SummaryItem label="Média G" value={formatGrams(mediaGramatura)} />
                                            <SummaryItem label="Preço Médio" value={formatCurrency(mediaPreco)} />
                                            <div className="pt-6 mt-4 border-t-2 border-orange-50 flex flex-col gap-2">
                                                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Total a Faturar</span>
                                                <span className="text-3xl font-black text-[#f26522] drop-shadow-sm">{formatCurrency(summaryData.value)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => generateEmail(cliente)}
                                            className="mt-8 w-full py-4 bg-gray-900 hover:bg-[#f26522] text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-gray-200 group-hover:shadow-orange-200"
                                        >
                                            <span className="text-lg">✨ Gerar Rascunho</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}

            {/* EDIT MODAL */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn">
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <h4 className="text-lg font-bold text-gray-800">Editar Lançamento</h4>
                            <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                <input type="text" className="w-full p-2 border rounded" value={editingItem.data} onChange={e => handleEditChange('data', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                                <input type="text" className="w-full p-2 border rounded" value={editingItem.cliente} onChange={e => handleEditChange('cliente', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Viveiro</label>
                                <input type="text" className="w-full p-2 border rounded" value={editingItem.viveiro} onChange={e => handleEditChange('viveiro', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Produção (kg)</label>
                                <input type="number" className="w-full p-2 border rounded" value={editingItem.producao} onChange={e => handleEditChange('producao', parseFloat(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço (R$)</label>
                                <input type="number" className="w-full p-2 border rounded" value={editingItem.preco} onChange={e => handleEditChange('preco', parseFloat(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Peso Médio (g)</label>
                                <input type="number" className="w-full p-2 border rounded" value={editingItem.pesoMedio} onChange={e => handleEditChange('pesoMedio', parseFloat(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sobrevivência</label>
                                <input type="text" className="w-full p-2 border rounded" value={editingItem.sobrevivencia} onChange={e => handleEditChange('sobrevivencia', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">FCA</label>
                                <input type="text" className="w-full p-2 border rounded" value={editingItem.fca} onChange={e => handleEditChange('fca', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dias Cultivo</label>
                                <input type="number" className="w-full p-2 border rounded" value={editingItem.diasCultivo} onChange={e => handleEditChange('diasCultivo', parseFloat(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Laboratório</label>
                                <input type="text" className="w-full p-2 border rounded" value={editingItem.laboratorio} onChange={e => handleEditChange('laboratorio', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas/Obs</label>
                                <textarea className="w-full p-2 border rounded" value={editingItem.notas} onChange={e => handleEditChange('notas', e.target.value)} />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                            <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancelar</button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 bg-[#f26522] text-white font-bold rounded hover:bg-[#d95213]">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* GEMINI MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b">
                            <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span>✨</span> Assistente de E-mail Gemini
                            </h4>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {modalLoading ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="w-10 h-10 border-4 border-gray-100 border-t-[#f26522] rounded-full animate-spin mb-4"></div>
                                    <p className="text-gray-600 font-medium">Gerando rascunho com IA...</p>
                                </div>
                            ) : modalError ? (
                                <div className="text-center py-8 text-red-600">
                                    <p className="font-bold mb-2">Erro ao conectar com a IA</p>
                                    <p className="text-sm">Verifique sua chave de API ou tente novamente mais tarde.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-gray-700 font-medium">A IA gerou o seguinte rascunho:</p>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                        {generatedEmail}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FOOTER ACTIONS --- */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 border-t border-gray-200 print:hidden flex justify-center gap-4 flex-wrap">
                {view !== 'SHOWCASE' && (
                    <>
                        <button onClick={clearAllData} className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-red-500 hover:text-white text-gray-700 rounded-lg shadow font-medium transition-all text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Limpar Tudo
                        </button>
                        <div className="w-px h-8 bg-gray-300 mx-2"></div>
                    </>
                )}
                {view !== 'SHOWCASE' && (
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow font-medium transition-all text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        PDF
                    </button>
                )}
                <button onClick={handleExportPNG} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow font-medium transition-all text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    PNG
                </button>
                {view !== 'SHOWCASE' && (
                    <button onClick={handleExportHTML} className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow font-medium transition-all text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        HTML
                    </button>
                )}

                {view !== 'SHOWCASE' && (
                    <>
                        <div className="w-px h-8 bg-gray-300 mx-2"></div>

                        <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow font-medium transition-all text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Salvar Backup
                        </button>
                        <div className="relative">
                            <input type="file" id="restore-backup" className="hidden" accept=".json" onChange={handleRestore} />
                            <label htmlFor="restore-backup" className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow font-medium transition-all text-sm cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Restaurar
                            </label>
                        </div>

                        <div className="w-px h-8 bg-gray-300 mx-2"></div>

                        <button onClick={handleManualSave} disabled={isSaving} className={`flex items-center gap-2 px-4 py-2 ${isSaving ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg shadow font-medium transition-all text-sm`}>
                            {isSaving ? (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                            )}
                            {isSaving ? 'Salvando...' : 'Salvar no Banco'}
                        </button>
                    </>
                )}
            </div>
            <div className="h-24"></div> {/* Spacer for fixed footer */}
        </div>
    );
};

const SummaryItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className="text-base text-gray-900 font-bold">{value}</span>
    </div>
);

const HistoryCard = ({ title, data, color }: { title: string, data: Record<string, { biomass: number, value: number }>, color: string }) => {
    // Basic color mapping
    const colorClasses: Record<string, { border: string, header: string, text: string }> = {
        blue: { border: 'border-blue-500', header: 'bg-blue-600', text: 'text-blue-900' },
        purple: { border: 'border-purple-500', header: 'bg-purple-600', text: 'text-purple-900' },
        emerald: { border: 'border-emerald-500', header: 'bg-emerald-600', text: 'text-emerald-900' },
        amber: { border: 'border-amber-500', header: 'bg-amber-600', text: 'text-amber-900' }
    };

    const c = colorClasses[color] || colorClasses.blue;
    const entries = Object.entries(data).sort((a, b) => {
        // Custom sort for periods if needed, currently alphabetical/lexicographical
        return a[0].localeCompare(b[0]);
    });

    return (
        <div className={`bg-white rounded-lg shadow-sm border-l-4 ${c.border} overflow-hidden`}>
            <div className={`p-4 ${c.header} text-white font-bold text-lg`}>
                {title}
            </div>
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase">Período</th>
                        <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase">Biomassa</th>
                        <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase">Faturamento</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {entries.map(([key, val]) => (
                        <tr key={key} className="hover:bg-gray-50">
                            <td className={`p-3 font-medium ${c.text}`}>{key}</td>
                            <td className="p-3 text-right text-gray-600">{formatNumber(val.biomass, ' kg')}</td>
                            <td className="p-3 text-right font-bold text-gray-800">
                                {formatCurrency(val.value)}
                            </td>
                        </tr>
                    ))}
                    {entries.length === 0 && (
                        <tr><td colSpan={3} className="p-4 text-center text-gray-400 italic">Sem dados</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
