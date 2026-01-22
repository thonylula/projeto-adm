import React, { useState, useCallback, useEffect, useRef } from 'react';
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

    useEffect(() => {
        const loadInitialConfig = async () => {
            const savedLogo = await SupabaseService.getConfig('app_logo');
            if (savedLogo) setCompanyLogo(savedLogo);
        };
        loadInitialConfig();

        try {
            const savedHistory = localStorage.getItem('aquacultureHistory');
            if (savedHistory) setHistory(JSON.parse(savedHistory));
        } catch (error) { }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('aquacultureHistory', JSON.stringify(history));
        } catch (error) { }
    }, [history]);

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
            if (initialStockings[groupName]) {
                const initialStocking = initialStockings[groupName];
                const totalTransferred = dataEntries.reduce((sum, entry) => sum + entry.estocagem, 0);
                const survivalRate = initialStocking > 0 ? (totalTransferred / initialStocking) * 100 : 0;
                const hasAnyParcial = dataEntries.some(e => e.isParcial);

                survivalResults[groupName] = {
                    initialStocking: initialStocking,
                    totalTransferred: totalTransferred,
                    survivalRate: survivalRate,
                    isParcial: hasAnyParcial
                };
            } else {
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
            setProcessedData((prevData) => [...prevData, ...newData]);

            // Save to history
            const newEntry: HistoryEntry = {
                id: Date.now().toString(),
                timestamp: new Date().toLocaleString(),
                data: newData
            };
            setHistory(prev => [newEntry, ...prev]);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [inputText, inputFile, inputMode, viewingHistoryId]);

    const handleUpdateItem = (index: number, updatedData: Partial<ExtractedData>) => {
        setProcessedData(prev => {
            const newProcessed = [...prev];
            const mergedExtracted: ExtractedData = { ...newProcessed[index], ...updatedData };
            newProcessed[index] = calculateProcessedItem(mergedExtracted);
            return newProcessed;
        });
        setEditingIndex(null);
    };

    const handleRemoveItem = (index: number) => {
        if (window.confirm("Remover?")) setProcessedData(prev => prev.filter((_, i) => i !== index));
    };

    const handleClear = () => {
        setInputText(''); setInputFile(null); setProcessedData([]); setError(null);
        setInitialStockings({}); setNurseryStockingQueue([]); setNurserySurvivalData({});
        setEditingIndex(null); setViewingHistoryId(null);
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

            <div className="non-printable min-h-screen font-sans">
                <div className="max-w-7xl mx-auto">
                    <header className="text-center mb-8">
                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 tracking-tight">Relatório de Transferência</h1>
                    </header>

                    <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-orange-200">
                            <InputArea
                                inputText={inputText} setInputText={setInputText}
                                inputFile={inputFile} setInputFile={setInputFile}
                                isLoading={isLoading} onProcess={handleProcess}
                                onClear={handleClear} onRefresh={handleRefresh}
                                inputMode={inputMode} setInputMode={setInputMode}
                            />
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-orange-200 lg:col-span-1 min-h-[400px] flex flex-col">
                            <div className="flex justify-between items-center mb-4 text-slate-800">
                                <h2 className="text-2xl font-semibold">Resultados Processados</h2>
                                {processedData.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsDownloadDropdownOpen(prev => !prev)}
                                                disabled={isGeneratingReport}
                                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300"
                                            >
                                                <DownloadIcon className="w-4 h-4" />
                                                {isGeneratingReport ? 'Gerando...' : 'Download Relatório'}
                                                <svg className={`w-4 h-4 transition-transform ${isDownloadDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </button>
                                            {isDownloadDropdownOpen && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                                    <ul className="py-1">
                                                        <li>
                                                            <a
                                                                href="#"
                                                                onClick={(e) => { e.preventDefault(); handleDownloadRequest('pdf'); }}
                                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50"
                                                            >
                                                                Baixar como PDF
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a
                                                                href="#"
                                                                onClick={(e) => { e.preventDefault(); handleDownloadRequest('png'); }}
                                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50"
                                                            >
                                                                Baixar como PNG
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {missingAreas.length > 0 && (
                                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold animate-pulse">
                                    ⚠️ Áreas não encontradas para: {missingAreas.join(', ')}.
                                    A densidade não pôde ser calculada. Forneça os valores para correção.
                                </div>
                            )}

                            {isLoading ? (
                                <Spinner />
                            ) : processedData.length > 0 ? (
                                <div className="flex flex-col gap-6">
                                    {Object.keys(nurserySurvivalData).length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-orange-500 pl-3">Resumo do Berçário</h3>
                                            <div className="space-y-3">
                                                {Object.entries(nurserySurvivalData).map(([name, data]) => (
                                                    <NurserySurvivalCard key={name} nurseryName={name} data={data} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-3 border-l-4 border-orange-500 pl-3">Resumos de Transferência</h3>
                                        <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                                            {processedData.map((item, index) => (
                                                <SummaryCard key={index} data={item} />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-3 border-l-4 border-orange-500 pl-3">Detalhes</h3>
                                        <ResultsTable
                                            data={processedData}
                                            editingIndex={editingIndex}
                                            onEditStart={setEditingIndex}
                                            onEditSave={handleUpdateItem}
                                            onEditCancel={() => setEditingIndex(null)}
                                            onRemove={handleRemoveItem}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                                    <p>Os resultados aparecerão aqui.</p>
                                </div>
                            )}
                        </div>
                    </main>
                    <HistoryLog
                        history={history}
                        onView={(id) => {
                            const entry = history.find(e => e.id === id);
                            if (entry) {
                                setProcessedData(entry.data);
                                setViewingHistoryId(id);
                            }
                        }}
                        onDelete={(id) => setHistory(prev => prev.filter(e => e.id !== id))}
                        onClearAll={() => setHistory([])}
                        currentViewId={viewingHistoryId}
                    />
                </div>
            </div>

            <div id="printable-report" ref={reportRef} className="hidden printable-report p-10 bg-white font-sans text-gray-800">
                <header className="mb-10 pb-8 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        {companyLogo && <img src={companyLogo} alt="Logo" className="h-20 w-auto object-contain" />}
                        <div className="border-l-4 border-orange-500 pl-8">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">{companyName}</h1>
                            <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest space-y-0.5">
                                {managerName && <p>Gerente Responsável: <span className="text-gray-600">{managerName}</span></p>}
                                {generatedBy && <p>Relatório Gerado por: <span className="text-gray-600">{generatedBy}</span></p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Data de Emissão</p>
                        <p className="text-lg font-black text-gray-800">{new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </header>

                <section className="space-y-14">
                    {Object.keys(nurserySurvivalData).length > 0 && (
                        <div>
                            <div className="mb-8">
                                <h2 className="inline-block text-xl font-black text-gray-900 uppercase tracking-tighter border-b-[6px] border-orange-500 pb-1">Resumo do Berçário</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                {Object.entries(nurserySurvivalData).map(([name, data]) => (
                                    <NurserySurvivalCard key={`print-${name}`} nurseryName={name} data={data} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <div className="mb-8">
                            <h2 className="inline-block text-xl font-black text-gray-900 uppercase tracking-tighter border-b-[6px] border-orange-500 pb-1">Detalhes</h2>
                        </div>
                        <ResultsTable data={processedData} />
                    </div>
                </section>

                <footer className="mt-20 pt-8 border-t border-gray-50 flex justify-center items-center">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">Documento Oficial de Monitoramento Técnico</p>
                </footer>
            </div>
        </>
    );
};
