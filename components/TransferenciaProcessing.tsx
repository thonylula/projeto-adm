import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { InputArea } from './Transferencias/InputArea';
import { ResultsTable } from './Transferencias/ResultsTable';
import { Spinner } from './Transferencias/Spinner';
import { processAquacultureData } from '../services/geminiService';
import type { ProcessedData, ExtractedData, NurserySurvivalData, HistoryEntry } from '../types';
import { SummaryCard } from './Transferencias/SummaryCard';
import { VIVEIROS_DATA } from '../data/viveirosData';
import { InitialStockingModal } from './Transferencias/InitialStockingModal';
import { NurserySurvivalCard } from './Transferencias/NurserySurvivalCard';
import { DownloadModal } from './Transferencias/DownloadModal';
import { DownloadIcon } from './Transferencias/icons';
import { HtmlViewModal } from './Transferencias/HtmlViewModal';
import { HistoryLog } from './Transferencias/HistoryLog';
import { SupabaseService } from '../services/supabaseService';

declare const html2canvas: any;
declare const jspdf: any;

const getNurseryGroupName = (nurseryName: string): string => {
    const upperCaseName = nurseryName.trim().toUpperCase();
    if (['OC-P07', 'OC-P08', 'OC-P09'].includes(upperCaseName)) {
        return 'OC-P07/P08/P09';
    }
    return upperCaseName;
};

const calculateProcessedItem = (data: ExtractedData): ProcessedData => {
    const plPorGrama = (data.plPorGrama && data.plPorGrama > 0) ? data.plPorGrama : 1;
    const estocagem = data.estocagem || 0;
    const pesoMedioCalculado = 1 / plPorGrama;
    const pesoTotalCalculado = (data.pesoTotal !== undefined && data.pesoTotal !== null)
        ? data.pesoTotal
        : (pesoMedioCalculado * estocagem) / 1000;

    const viveiroDestinoCleaned = (data.viveiroDestino || '').replace(/\s+/g, '').toUpperCase();
    let viveiroDestinoArea = VIVEIROS_DATA[viveiroDestinoCleaned];

    if (viveiroDestinoArea === undefined && !viveiroDestinoCleaned.startsWith('OC-') && viveiroDestinoCleaned !== '') {
        const prefixedKey = `OC-${viveiroDestinoCleaned}`;
        viveiroDestinoArea = VIVEIROS_DATA[prefixedKey];
    }

    let densidadeFinal = data.densidade;
    if ((!densidadeFinal || !parseFloat(densidadeFinal)) && viveiroDestinoArea && viveiroDestinoArea > 0 && estocagem > 0) {
        const densidadeCalculada = estocagem / (viveiroDestinoArea * 10000);
        densidadeFinal = `${densidadeCalculada.toFixed(2)} cam/m²`;
    }

    return {
        ...data,
        estocagem,
        plPorGrama,
        densidade: densidadeFinal || '',
        pesoMedioCalculado,
        pesoTotalCalculado,
        viveiroDestinoArea,
        tipo: data.tipo || 'TRANSFERENCIA',
        dataPovoamento: data.dataPovoamento || ''
    };
};

export const TransferenciaProcessing: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [inputFile, setInputFile] = useState<File | null>(null);
    const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [nurseryStockingQueue, setNurseryStockingQueue] = useState<string[]>([]);
    const [initialStockings, setInitialStockings] = useState<Record<string, number>>({});
    const [nurserySurvivalData, setNurserySurvivalData] = useState<Record<string, NurserySurvivalData>>({});
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
    const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'png' | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [companyName, setCompanyName] = useState('CARAPITANGA (OCEAN)');
    const [companyLogo, setCompanyLogo] = useState<string | null>('https://projeto-adm-five.vercel.app/logo.png');
    const [managerName, setManagerName] = useState('CLEITON MANOEL DE LIMA');
    const [generatedBy, setGeneratedBy] = useState('LUANTHONY LULA OLIVEIRA');
    const [isHtmlViewModalOpen, setIsHtmlViewModalOpen] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const reportRef = useRef<HTMLDivElement>(null);
    const [isHtmlPreviewFlow, setIsHtmlPreviewFlow] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
    const [missingAreas, setMissingAreas] = useState<string[]>([]);
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false);
    const [currentProcessingItems, setCurrentProcessingItems] = useState<ProcessedData[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
    const isPublic = new URLSearchParams(window.location.search).get('showcase') === 'true';

    useEffect(() => {
        const loadInitialConfig = async () => {
            const savedLogo = await SupabaseService.getConfig('app_logo');
            if (savedLogo) setCompanyLogo(savedLogo);

            // Load History from Supabase
            const dbHistory = await SupabaseService.getAquacultureHistory();
            if (dbHistory && dbHistory.length > 0) {
                setHistory(dbHistory);
            } else {
                // Fallback to localStorage if Supabase is empty
                try {
                    const savedHistory = localStorage.getItem('aquacultureHistory');
                    if (savedHistory) {
                        const parsed = JSON.parse(savedHistory);
                        setHistory(parsed);
                        // Optional: Migrate to Supabase
                        SupabaseService.saveAquacultureHistory(parsed);
                    }
                } catch (error) { }
            }

            // Load Initial Stockings from Supabase
            const dbStockings = await SupabaseService.getAquacultureInitialStockings();
            if (dbStockings && Object.keys(dbStockings).length > 0) {
                setInitialStockings(dbStockings);
            } else {
                // Fallback to localStorage
                try {
                    const savedStockings = localStorage.getItem('aquacultureInitialStockings');
                    if (savedStockings) {
                        const parsed = JSON.parse(savedStockings);
                        setInitialStockings(parsed);
                        // Optional: Migrate to Supabase
                        SupabaseService.saveAquacultureInitialStockings(parsed);
                    }
                } catch (error) { }
            }
        };
        loadInitialConfig();

        const loadClients = async () => {
            const data = await SupabaseService.getClients();
            setClients(data || []);
        };
        loadClients();
    }, []);

    useEffect(() => {
        if (history.length > 0) {
            try {
                localStorage.setItem('aquacultureHistory', JSON.stringify(history));
                // Also save to Supabase
                SupabaseService.saveAquacultureHistory(history);
            } catch (error) { }
        }
    }, [history]);

    useEffect(() => {
        if (Object.keys(initialStockings).length > 0) {
            try {
                localStorage.setItem('aquacultureInitialStockings', JSON.stringify(initialStockings));
                // Also save to Supabase
                SupabaseService.saveAquacultureInitialStockings(initialStockings);
            } catch (error) { }
        }
    }, [initialStockings]);

    const sortedHistory = useMemo(() => {
        return [...history].sort((a, b) => {
            const firstA = a.data[0];
            const firstB = b.data[0];

            const parseDate = (d?: string) => {
                if (!d || typeof d !== 'string') return 0;
                const parts = d.split('/');
                if (parts.length < 2) return 0;
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                if (isNaN(day) || isNaN(month)) return 0;

                const now = new Date();
                const currentYear = now.getFullYear();

                // Base assumption: current year
                let year = currentYear;

                // Check if the interpreted date (DD/MM/currentYear) is significantly in the future.
                // If today is January and the log says November, it's almost certainly from last year.
                // We use a 15-day buffer to avoid issues with slight future dates or timezones.
                const interpretedDate = new Date(currentYear, month - 1, day);
                const bufferDate = new Date(now);
                bufferDate.setDate(now.getDate() + 15);

                if (interpretedDate > bufferDate) {
                    year -= 1;
                }

                return (year * 10000) + (month * 100) + day;
            };

            const valA = parseDate(firstA?.data);
            const valB = parseDate(firstB?.data);

            if (valA !== valB) {
                return valB - valA;
            }

            // Fallback for same day: use entry ID (timestamp)
            return (b.id as any) - (a.id as any);
        });
    }, [history]);

    const generalSurvival = useMemo(() => {
        if (history.length === 0) return 0;

        let totalFinal = 0;
        let totalInitial = 0;
        const processedPonds = new Set<string>();

        history.forEach(entry => {
            entry.data.forEach(item => {
                totalFinal += (item.estocagem || 0);
                const pondName = getNurseryGroupName(item.local);
                if (!processedPonds.has(pondName)) {
                    totalInitial += (initialStockings[pondName] || 0);
                    processedPonds.add(pondName);
                }
            });
        });

        return totalInitial > 0 ? (totalFinal / totalInitial) * 100 : 0;
    }, [history, initialStockings]);

    useEffect(() => {
        if (processedData.length === 0) {
            setNurserySurvivalData({});
            return;
        }

        const nurseryGroups: Record<string, ProcessedData[]> = processedData.reduce((acc, item) => {
            const groupName = getNurseryGroupName(item.local);
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, {} as Record<string, ProcessedData[]>);

        const survivalResults: Record<string, NurserySurvivalData> = {};
        const nurseriesToAsk: string[] = [];

        Object.entries(nurseryGroups).forEach(([groupName, dataEntries]) => {
            const initialStocking = initialStockings[groupName] || 0;
            const totalTransferred = dataEntries.reduce((sum, entry) => sum + entry.estocagem, 0);
            const survivalRate = initialStocking > 0 ? (totalTransferred / initialStocking) * 100 : 0;
            const hasAnyParcial = dataEntries.some(e => e.isParcial);

            survivalResults[groupName] = {
                initialStocking: initialStocking,
                totalTransferred: totalTransferred,
                survivalRate: survivalRate,
                isParcial: hasAnyParcial
            };

            if (initialStockings[groupName] === undefined) {
                if (!nurseryStockingQueue.includes(groupName) && !viewingHistoryId) {
                    nurseriesToAsk.push(groupName);
                }
            }
        });

        setNurserySurvivalData(survivalResults);
        if (nurseriesToAsk.length > 0) {
            setNurseryStockingQueue(prev => [...new Set([...prev, ...nurseriesToAsk])]);
        }

        const missing = processedData
            .filter(item => !item.viveiroDestinoArea)
            .map(item => item.viveiroDestino);
        setMissingAreas([...new Set(missing)]);
    }, [processedData, initialStockings, nurseryStockingQueue, viewingHistoryId]);

    const generatePdf = async () => {
        // Note: html2canvas and jspdf must be loaded in index.html
        const reportElement = document.getElementById('printable-report');
        if (!reportElement || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            alert("Scripts de exportação não carregados.");
            return;
        }

        setIsGeneratingReport(true);
        reportElement.classList.remove('hidden');

        try {
            const canvas = await html2canvas(reportElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const { jsPDF } = jspdf;
            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasAspectRatio = canvas.width / canvas.height;

            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth / canvasAspectRatio;

            if (imgHeight > pdfHeight - 20) {
                imgHeight = pdfHeight - 20;
                imgWidth = imgHeight * canvasAspectRatio;
            }

            const x = (pdfWidth - imgWidth) / 2;
            const y = 10;

            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            pdf.save('relatorio-transferencia.pdf');
        } catch (err) {
            console.error("Error generating PDF:", err);
            setError("Ocorreu um erro ao gerar o PDF.");
        } finally {
            reportElement.classList.add('hidden');
            setIsGeneratingReport(false);
        }
    };

    const generatePng = async () => {
        const reportElement = document.getElementById('printable-report');
        if (!reportElement || typeof html2canvas === 'undefined') {
            alert("Scripts de exportação não carregados.");
            return;
        }

        setIsGeneratingReport(true);
        reportElement.classList.remove('hidden');

        try {
            const canvas = await html2canvas(reportElement, { scale: 3 });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'relatorio-transferencia.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error generating PNG:", err);
            setError("Ocorreu um erro ao gerar o PNG.");
        } finally {
            reportElement.classList.add('hidden');
            setIsGeneratingReport(false);
        }
    };

    const handleDownloadRequest = (format: 'pdf' | 'png') => {
        setIsHtmlPreviewFlow(false);
        setDownloadFormat(format);
        setIsDownloadModalOpen(true);
        setIsDownloadDropdownOpen(false);
    };

    const handleProcess = useCallback(async () => {
        const input = inputMode === 'text' ? inputText : inputFile;
        if (!input) return;
        setIsLoading(true);
        setError(null);
        if (viewingHistoryId) setViewingHistoryId(null);
        try {
            const extractedDataArray: ExtractedData[] = await processAquacultureData(input);
            if (!extractedDataArray || extractedDataArray.length === 0) {
                setError('Nenhum dado extraído.');
                setIsLoading(false);
                return;
            }
            const newData = extractedDataArray.map(calculateProcessedItem);
            setCurrentProcessingItems(newData);
            setProcessedData((prevData) => [...prevData, ...newData]);

            // Pergunta o tipo para a nova leva de dados
            setIsTypeSelectionOpen(true);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [inputText, inputFile, inputMode, viewingHistoryId]);

    const saveToHistory = (finalItems: ProcessedData[]) => {
        const newEntry: HistoryEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString(),
            data: finalItems
        };
        setHistory(prev => [newEntry, ...prev]);
    };

    const handleUpdateItem = (index: number, updatedData: Partial<ExtractedData>) => {
        setProcessedData(prev => {
            const newProcessed = [...prev];
            const mergedExtracted: ExtractedData = { ...newProcessed[index], ...updatedData };
            newProcessed[index] = calculateProcessedItem(mergedExtracted);

            // Sync with history if viewing a history entry
            if (viewingHistoryId) {
                setHistory(historyPrev => historyPrev.map(entry =>
                    entry.id === viewingHistoryId ? { ...entry, data: newProcessed } : entry
                ));
            }

            return newProcessed;
        });
        setEditingIndex(null);
    };

    const handleRemoveItem = (index: number) => {
        if (window.confirm("Remover?")) {
            setProcessedData(prev => {
                const newProcessed = prev.filter((_, i) => i !== index);

                // Sync with history if viewing a history entry
                if (viewingHistoryId) {
                    setHistory(historyPrev => historyPrev.map(entry =>
                        entry.id === viewingHistoryId ? { ...entry, data: newProcessed } : entry
                    ));
                }

                return newProcessed;
            });
        }
    };

    const handleClear = () => {
        setInputText(''); setInputFile(null); setProcessedData([]); setError(null);
        setInitialStockings({}); setNurseryStockingQueue([]); setNurserySurvivalData({});
        setEditingIndex(null); setViewingHistoryId(null); setCurrentStep(1);
    };

    const handleRefresh = useCallback(async () => {
        const input = inputMode === 'text' ? inputText : inputFile;
        if (!input) return;
        setProcessedData([]); setError(null); setInitialStockings({}); setNurseryStockingQueue([]);
        setNurserySurvivalData({}); setViewingHistoryId(null); setEditingIndex(null);
        await handleProcess();
    }, [handleProcess, inputMode, inputText, inputFile]);

    const handleInitialStockingSubmit = (nursery: string, stocking: number) => {
        setInitialStockings(prev => ({ ...prev, [nursery]: stocking }));
        setNurseryStockingQueue(prev => prev.filter(name => name !== nursery));
    };

    return (
        <>
            <InitialStockingModal
                isOpen={nurseryStockingQueue.length > 0}
                nurseryName={nurseryStockingQueue[0]}
                onSubmit={handleInitialStockingSubmit}
                onClose={() => setNurseryStockingQueue(q => q.slice(1))}
            />
            <DownloadModal
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                onSubmit={async (details) => {
                    setCompanyName(details.companyName);
                    if (details.companyLogo !== companyLogo) {
                        setCompanyLogo(details.companyLogo);
                        await SupabaseService.saveConfig('app_logo', details.companyLogo);
                    }
                    setManagerName(details.managerName); setGeneratedBy(details.generatedBy);
                    setIsDownloadModalOpen(false);
                    setTimeout(() => {
                        if (isHtmlPreviewFlow) {
                            if (reportRef.current) { setHtmlContent(reportRef.current.innerHTML); setIsHtmlViewModalOpen(true); }
                        } else if (downloadFormat === 'pdf') {
                            generatePdf();
                        } else if (downloadFormat === 'png') {
                            generatePng();
                        }
                    }, 100);
                }}
                isPreviewMode={isHtmlPreviewFlow}
                initialDetails={{ companyName, companyLogo, managerName, generatedBy }}
            />
            <HtmlViewModal isOpen={isHtmlViewModalOpen} onClose={() => setIsHtmlViewModalOpen(false)} htmlContent={htmlContent} />

            {/* Modal de Seleção de Tipo (Transferência vs Venda) */}
            {isTypeSelectionOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🚀</div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">O que foi processado?</h3>
                            <p className="text-gray-500 font-medium mt-2">Identificamos novos registros. Como deseja classificá-los?</p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {/* Toggle Parcial/Total */}
                            <div className="flex bg-slate-100 p-1 rounded-3xl">
                                <button
                                    onClick={() => setProcessedData(prev => prev.map(item => ({ ...item, isParcial: true })))}
                                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${processedData.some(item => item.isParcial) ? 'bg-white text-[#F97316] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    🌓 Parcial
                                </button>
                                <button
                                    onClick={() => setProcessedData(prev => prev.map(item => ({ ...item, isParcial: false })))}
                                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${processedData.every(item => !item.isParcial) ? 'bg-white text-[#10B981] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    🌕 Total
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    const classified = currentProcessingItems.map(item => ({
                                        ...item,
                                        tipo: 'TRANSFERENCIA',
                                        isParcial: processedData.some(p => p.isParcial) // Mantém a escolha feita no toggle
                                    }));
                                    setProcessedData(prev => {
                                        const base = prev.slice(0, prev.length - currentProcessingItems.length);
                                        return [...base, ...classified];
                                    });
                                    saveToHistory(classified);
                                    setIsTypeSelectionOpen(false);
                                    setCurrentStep(2);
                                }}
                                className="group p-5 border-2 border-gray-100 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all text-left"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-black text-gray-900 group-hover:text-[#F97316]">Transferência Normal</span>
                                    <span className="text-2xl">🔄</span>
                                </div>
                                <p className="text-xs text-slate-400 font-bold group-hover:text-[#F97316]/60">Movimentação interna entre viveiros.</p>
                            </button>

                            <button
                                onClick={() => {
                                    setProcessedData(prev => prev.map(item => ({ ...item, tipo: 'VENDA' })));
                                }}
                                className="group p-5 border-2 border-slate-100 rounded-2xl hover:border-[#C5A059] hover:bg-[#C5A059]/5 transition-all text-left"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-black text-gray-900 group-hover:text-[#F97316]">Venda de Pós-larva</span>
                                    <span className="text-2xl">💰</span>
                                </div>
                                <p className="text-xs text-slate-400 font-bold group-hover:text-[#F97316]/60">Venda externa para clientes.</p>
                            </button>
                        </div>

                        {processedData.some(item => item.tipo === 'VENDA') && (
                            <div className="mt-8 pt-8 border-t border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Selecione o Cliente</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 p-3 border border-gray-200 rounded-xl bg-gray-50 font-bold text-sm focus:ring-2 focus:ring-[#C5A059] outline-none"
                                            value={selectedClient || ''}
                                            onChange={(e) => {
                                                const clientId = e.target.value;
                                                const client = clients.find(c => c.id === clientId);
                                                setSelectedClient(clientId);
                                                setProcessedData(prev => prev.map((item) => ({
                                                    ...item,
                                                    clienteId: clientId,
                                                    clienteNome: client?.name || ''
                                                })));
                                            }}
                                        >
                                            <option value="">Selecione um cliente...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => {
                                                // Abre aba de cadastros com bridge
                                                if (window.confirm("Deseja ir para a aba de Cadastros para registrar um novo cliente?")) {
                                                    const navEvent = new CustomEvent('app-navigation', {
                                                        detail: { tab: 'registrations' }
                                                    });
                                                    window.dispatchEvent(navEvent);
                                                }
                                            }}
                                            className="p-3 bg-white border-2 border-slate-100 text-slate-400 rounded-xl hover:bg-slate-50 transition-all font-black text-xs uppercase"
                                            title="Cadastrar Novo Cliente"
                                        >
                                            ➕ Novo
                                        </button>
                                    </div>
                                </div>
                                <button
                                    disabled={!selectedClient}
                                    onClick={() => {
                                        const client = clients.find(c => c.id === selectedClient);
                                        const classified = currentProcessingItems.map(item => ({
                                            ...item,
                                            tipo: 'VENDA',
                                            clienteId: selectedClient!,
                                            clienteNome: client?.name || '',
                                            isParcial: processedData.some(p => p.isParcial)
                                        }));

                                        setProcessedData(prev => {
                                            const base = prev.slice(0, prev.length - currentProcessingItems.length);
                                            return [...base, ...classified];
                                        });
                                        saveToHistory(classified);

                                        setIsTypeSelectionOpen(false);
                                        setCurrentStep(2);
                                        setSelectedClient(null);
                                    }}
                                    className="w-full bg-[#F97316] text-white py-4 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-[#F97316]/20 hover:bg-[#EA580C] disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95"
                                >
                                    Confirmar Venda
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setIsTypeSelectionOpen(false)}
                            className="mt-4 w-full py-2 text-gray-400 font-bold text-xs uppercase hover:text-gray-600 transition-colors"
                        >
                            Fechar sem classificar
                        </button>
                    </div>
                </div>
            )}

            <div className={`non-printable min-h-screen font-sans ${isPublic ? 'bg-transparent' : ''}`}>
                <div className="max-w-7xl mx-auto">
                    {!isPublic && (
                        <header className="text-center mb-12">
                            <div className="flex flex-col items-center gap-4">
                                <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tighter">Relatório de Transferência</h1>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-black ${currentStep === 1 ? 'bg-[#F97316] text-white shadow-xl shadow-[#F97316]/20' : 'bg-[#10B981]/10 text-[#10B981]'}`}>
                                        {currentStep === 1 ? '1' : '✓'}
                                    </div>
                                    <div className={`h-1 w-12 rounded-full ${currentStep === 2 ? 'bg-[#10B981]/10' : 'bg-slate-100'}`} />
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-black ${currentStep === 2 ? 'bg-[#F97316] text-white shadow-xl shadow-[#F97316]/20' : 'bg-slate-100 text-slate-400'}`}>
                                        2
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    {currentStep === 1 ? 'Parte 1 - Seleção de Dados' : 'Parte 2 - Resultado'}
                                </p>
                            </div>
                        </header>
                    )}

                    <main className="max-w-5xl mx-auto">
                        {currentStep === 1 ? (
                            <>
                                {!isPublic && (
                                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="mb-8 flex items-center justify-between">
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900">Entrada de Informações</h2>
                                                <p className="text-gray-400 text-sm mt-1 font-medium">Cole o texto do log ou faça upload da imagem do biometria/transferência</p>
                                            </div>
                                            <div className="px-4 py-1.5 bg-[#F97316]/10 text-[#F97316] rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                                                Inteligência Artificial
                                            </div>
                                        </div>
                                        <InputArea
                                            inputText={inputText} setInputText={setInputText}
                                            inputFile={inputFile} setInputFile={setInputFile}
                                            isLoading={isLoading} onProcess={handleProcess}
                                            onClear={handleClear} onRefresh={handleRefresh}
                                            inputMode={inputMode} setInputMode={setInputMode}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 flex flex-col">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 text-slate-800">
                                        <div>
                                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
                                                {isPublic ? 'Detalhes da Movimentação' : 'Resultados Processados'}
                                            </h2>
                                            <p className="text-gray-400 text-sm mt-1 font-medium italic">
                                                {isPublic ? 'Relatório consolidado e verificado' : 'Dados extraídos e calculados com precisão'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    setCurrentStep(1);
                                                    setViewingHistoryId(null);
                                                    setProcessedData([]);
                                                }}
                                                className="px-6 py-2.5 text-sm font-black text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-gray-100 flex items-center gap-2"
                                            >
                                                <span>←</span> {isPublic ? 'Voltar ao Histórico' : 'Voltar'}
                                            </button>
                                            {processedData.length > 0 && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setIsDownloadDropdownOpen(prev => !prev)}
                                                        disabled={isGeneratingReport}
                                                        className="flex items-center gap-3 px-6 py-2.5 text-sm font-black text-white bg-[#F97316] rounded-xl hover:bg-[#EA580C] focus:outline-none shadow-xl shadow-[#F97316]/20 transition-all disabled:bg-slate-300"
                                                    >
                                                        <DownloadIcon className="w-4 h-4" />
                                                        {isGeneratingReport ? 'Gerando...' : 'Exportar Relatório'}
                                                        <svg className={`w-4 h-4 transition-transform ${isDownloadDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </button>
                                                    {isDownloadDropdownOpen && (
                                                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl z-20 border border-gray-50 overflow-hidden py-2 animate-in fade-in zoom-in duration-200">
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); handleDownloadRequest('pdf'); }}
                                                                className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-[#F97316]/5 hover:text-[#F97316] transition-colors flex items-center gap-3"
                                                            >
                                                                <span className="text-lg">📄</span> Baixar como PDF
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); handleDownloadRequest('png'); }}
                                                                className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-[#F97316]/5 hover:text-[#F97316] transition-colors flex items-center gap-3"
                                                            >
                                                                <span className="text-lg">🖼️</span> Baixar como PNG
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {!isPublic && missingAreas.length > 0 && (
                                        <div className="mb-8 p-4 bg-red-50/50 border-l-4 border-red-500 text-red-700 text-xs font-black rounded-r-xl">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">⚠️</span>
                                                <span className="uppercase tracking-widest">Atenção: Áreas não encontradas</span>
                                            </div>
                                            <p className="font-bold opacity-80">Não foi possível calcular a densidade para: {missingAreas.join(', ')}. Por favor, corrija os nomes dos viveiros na tabela de detalhes.</p>
                                        </div>
                                    )}

                                    {isLoading ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                                            <Spinner />
                                            <p className="text-orange-600 font-black animate-pulse uppercase tracking-[0.2em] text-[10px]">Reanalisando Dados...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-10">
                                            {Object.keys(nurserySurvivalData).length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Resumo do Berçário</h3>
                                                        <div className="h-0.5 flex-grow bg-gray-50 rounded-full" />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {Object.entries(nurserySurvivalData).map(([name, data]) => (
                                                            <div key={name} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 hover:border-[#F97316]/20 transition-all cursor-default">
                                                                <NurserySurvivalCard
                                                                    nurseryName={name}
                                                                    data={data}
                                                                    isPublic={isPublic}
                                                                    onEditInitialStocking={(val) => {
                                                                        setInitialStockings(prev => ({ ...prev, [name]: val }));
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <div className="flex items-center gap-4 mb-6">
                                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Resumos de Transferência</h3>
                                                    <div className="h-0.5 flex-grow bg-gray-50 rounded-full" />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {processedData.map((item, index) => (
                                                        <SummaryCard
                                                            key={index}
                                                            data={item}
                                                            onEdit={isPublic ? undefined : () => {
                                                                setEditingIndex(index);
                                                                // Scrolly to table
                                                                document.getElementById('detailed-report-table')?.scrollIntoView({ behavior: 'smooth' });
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div id="detailed-report-table">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Relatório Detalhado</h3>
                                                    <div className="h-0.5 flex-grow bg-gray-50 rounded-full" />
                                                </div>
                                                <ResultsTable
                                                    data={processedData}
                                                    editingIndex={editingIndex}
                                                    onEditStart={isPublic ? undefined : setEditingIndex}
                                                    onEditSave={handleUpdateItem}
                                                    onEditCancel={() => setEditingIndex(null)}
                                                    onRemove={isPublic ? undefined : handleRemoveItem}
                                                    clients={clients}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>

                    {currentStep === 1 && (
                        <div className="max-w-5xl mx-auto mt-12 animate-in fade-in duration-500 delay-150">
                            {history.length > 0 ? (
                                <HistoryLog
                                    isPublic={new URLSearchParams(window.location.search).get('showcase') === 'true'}
                                    history={sortedHistory}
                                    generalSurvival={generalSurvival}
                                    onView={(id) => {
                                        const entry = history.find(e => e.id === id);
                                        if (entry) {
                                            setProcessedData(entry.data);
                                            setViewingHistoryId(id);
                                            setCurrentStep(2);
                                        }
                                    }}
                                    onDelete={(id) => setHistory(prev => prev.filter(e => e.id !== id))}
                                    onClearAll={() => setHistory([])}
                                    currentViewId={viewingHistoryId}
                                />
                            ) : isPublic && (
                                <div className="bg-white p-12 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 text-center">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="text-4xl text-gray-300">📊</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 mb-2">Nenhum relatório encontrado</h2>
                                    <p className="text-gray-500 font-medium max-w-sm mx-auto">
                                        Não foram encontrados processamentos de transferências ou vendas no banco de dados.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div id="printable-report" ref={reportRef} className="hidden printable-report p-10 bg-white font-sans text-gray-800">
                <header className="mb-12 pb-10 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center">
                        {companyLogo && <img src={companyLogo} alt="Logo" className="h-16 w-auto object-contain" />}
                        <div className="mx-10 w-1 h-14 bg-orange-500 rounded-full" />
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-3">{companyName}</h1>
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest space-y-1">
                                {managerName && <p>Gerente Responsável: <span className="text-gray-600 font-black">{managerName}</span></p>}
                                {generatedBy && <p>Relatório Gerado por: <span className="text-gray-600 font-black">{generatedBy}</span></p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Data de Emissão</p>
                        <p className="text-xl font-black text-gray-800 leading-none">{new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </header>

                <section className="space-y-16">
                    {Object.keys(nurserySurvivalData).length > 0 && (
                        <div>
                            <div className="mb-10">
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">Resumo do Berçário</h2>
                                <div className="h-1 w-64 bg-orange-500 rounded-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-10">
                                {Object.entries(nurserySurvivalData).map(([name, data]) => (
                                    <NurserySurvivalCard key={`print-${name}`} nurseryName={name} data={data} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <div className="mb-10">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">Detalhes</h2>
                            <div className="h-1 w-32 bg-orange-500 rounded-sm" />
                        </div>
                        <ResultsTable data={processedData} />
                    </div>
                </section>

                <footer className="mt-24 pt-10 border-t border-gray-50">
                    <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.4em]">Documento Oficial de Monitoramento Técnico</p>
                </footer>
            </div>
        </>
    );
};
