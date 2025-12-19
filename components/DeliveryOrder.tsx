import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGeminiParser } from '../hooks/useGeminiParser';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- Interfaces based on User Data ---
interface HarvestData {
    id: number;
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

// --- Hardcoded Data (Ported from User Source) ---
const INITIAL_HARVEST_DATA: HarvestData[] = [];

const CLIENT_INFO: Record<string, ClientInfo> = {
    "CEAGESP": { codigo: "8410", prazo: "28 dias" },
    "Funelli": { codigo: "946", prazo: "18 dias" },
    "Victor": { codigo: "---", prazo: "---" },
    "Henrique": { codigo: "---", prazo: "---" }
};

// --- Styles constants ---
const COLORS = {
    orange: '#f26522',
    dark: '#3a3a3a'
};

export const DeliveryOrder: React.FC = () => {
    const [view, setView] = useState<'INPUT' | 'DASHBOARD'>('INPUT');
    const [inputText, setInputText] = useState('');
    const [data, setData] = useState<HarvestData[]>(() => {
        try {
            const saved = localStorage.getItem('delivery_order_db');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error(e);
        }
        return INITIAL_HARVEST_DATA; // Use processed data as initial state
    });

    useEffect(() => {
        localStorage.setItem('delivery_order_db', JSON.stringify(data));
    }, [data]);

    const reportRef = useRef<HTMLDivElement>(null);

    // Derived state for summary logic
    const activeData = data.filter(d => d.visible);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState(false);
    const [generatedEmail, setGeneratedEmail] = useState('');

    // --- Formatters ---
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatNumber = (val: number, unit = '') => val.toLocaleString('pt-BR') + unit;
    const formatGrams = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' g';

    // --- AI SMART UPLOAD ---
    const { processFile, processText, isProcessing } = useGeminiParser({
        onError: (err) => alert(`Erro na Inteligência Artificial: ${err.message}`)
    });

    const HARVEST_PROMPT = `
        Analise este documento (Recibo de Despesca, Planilha ou Anotação Manual).
        Extraia a lista de despescas realizadas.
        Retorne um JSON estrito contendo APENAS uma lista (array) de objetos.
        Cada objeto deve ter as chaves (se disponíveis, senão null/0/"" conforme tipo):
        {
            "data": "DD/MM/AAAA",
            "viveiro": "Nome do Viveiro",
            "cliente": "Nome do Cliente",
            "producao": number (kg),
            "preco": number (R$),
            "pesoMedio": number (g),
            "sobrevivencia": "string com %",
            "fca": "string",
            "diasCultivo": number,
            "laboratorio": "Nome",
            "notas": "Obs"
        }
    `;

    // --- Actions ---
    const handleProcess = async () => {
        if (!inputText.trim()) return;

        try {
            const results = await processText(HARVEST_PROMPT, inputText);

            if (results) {
                const newItems: HarvestData[] = (Array.isArray(results) ? results : [results]).map((item: any) => ({
                    id: Date.now() + Math.random(),
                    data: item.data || new Date().toLocaleDateString(),
                    viveiro: item.viveiro || "---",
                    cliente: item.cliente || "Desconhecido",
                    producao: Number(item.producao) || 0,
                    preco: Number(item.preco) || 0,
                    pesoMedio: Number(item.pesoMedio) || 0,
                    sobrevivencia: item.sobrevivencia || "---",
                    fca: item.fca || "---",
                    diasCultivo: Number(item.diasCultivo) || 0,
                    laboratorio: item.laboratorio || "---",
                    notas: item.notas || "",
                    visible: true
                }));

                setData(prev => [...newItems, ...prev]);
                setInputText(''); // Limpa o texto após processar
                setView('DASHBOARD');
            }
        } catch (error) {
            console.error("Text Processing Error", error);
        }
    };

    const toggleRow = (id: number) => {
        setData(prev => prev.map(item =>
            item.id === id ? { ...item, visible: !item.visible } : item
        ));
    };

    const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        try {
            const results = await processFile(file, HARVEST_PROMPT);

            if (results) {
                const newItems: HarvestData[] = (Array.isArray(results) ? results : [results]).map((item: any) => ({
                    id: Date.now() + Math.random(),
                    data: item.data || new Date().toLocaleDateString(),
                    viveiro: item.viveiro || "---",
                    cliente: item.cliente || "Desconhecido",
                    producao: Number(item.producao) || 0,
                    preco: Number(item.preco) || 0,
                    pesoMedio: Number(item.pesoMedio) || 0,
                    sobrevivencia: item.sobrevivencia || "---",
                    fca: item.fca || "---",
                    diasCultivo: Number(item.diasCultivo) || 0,
                    laboratorio: item.laboratorio || "---",
                    notas: item.notas || "",
                    visible: true
                }));

                setData(prev => [...newItems, ...prev]);
                setView('DASHBOARD');
            }
        } catch (error) {
            console.error("Smart Upload Error", error);
        } finally {
            e.target.value = '';
        }
    };

    // --- Calculation for Totals (Footer) ---
    const grandTotals = activeData.reduce((acc, curr) => {
        return {
            biomass: acc.biomass + curr.producao,
            value: acc.value + (curr.producao * curr.preco)
        };
    }, { biomass: 0, value: 0 });

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

        const mediaPreco = clientSummary.value / clientSummary.biomass;
        const mediaGramatura = clientSummary.gramaturas.reduce((a, b) => a + b, 0) / clientSummary.count;

        try {
            const fullPrompt = `${systemPrompt}\n\n---\n\n${userQuery}`;
            const result = await processText(fullPrompt, ""); // processText(prompt, userText)

            if (typeof result === 'string') {
                setGeneratedEmail(result);
            } else if (result && result.text) {
                setGeneratedEmail(result.text);
            } else {
                throw new Error("Resposta da IA inválida.");
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
                                        {isProcessing ? 'PROCESSANDO COM IA...' : 'Imagem ou PDF (IA Integrada)'}
                                    </p>
                                </div>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={handleSmartUpload}
                                    accept="image/*,application/pdf"
                                    disabled={isProcessing}
                                />
                            </label>
                        </div>

                        <button
                            onClick={handleProcess}
                            className="w-full py-3 px-4 bg-[#f26522] hover:bg-[#d95213] text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>Processar Dados</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // DASHBOARD VIEW
    return (
        <div className="space-y-8 font-inter animate-fadeIn">
            <header className="bg-[#f26522] p-6 rounded-xl shadow-lg text-white">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Resumo de Faturamento Carapitanga 0019(Ocean) - Dezembro/2025</h2>
                    <button onClick={() => setView('INPUT')} className="text-white/80 hover:text-white underline text-sm">
                        Voltar para Importação
                    </button>
                </div>
            </header>

            <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto" ref={reportRef}>
                    <table className="w-full">
                        <thead className="bg-[#f26522] text-white">
                            <tr>
                                <th className="p-4 text-center w-16 first:rounded-tl-lg" data-html2canvas-ignore>Ocultar</th>
                                <th className="p-4 text-left">Data</th>
                                <th className="p-4 text-left">Viveiro</th>
                                <th className="p-4 text-left">Cliente</th>
                                <th className="p-4 text-left">Produção (kg)</th>
                                <th className="p-4 text-left">Peso Médio (g)</th>
                                <th className="p-4 text-left">Preço (R$)</th>
                                <th className="p-4 text-left">Valor Total (R$)</th>
                                <th className="p-4 text-left">Sobrev. (%)</th>
                                <th className="p-4 text-left">FCA</th>
                                <th className="p-4 text-left">Dias Cult.</th>
                                <th className="p-4 text-left">Laboratório</th>
                                <th className="p-4 text-left last:rounded-tr-lg">Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-center" data-html2canvas-ignore>
                                        <input
                                            type="checkbox"
                                            checked={row.visible}
                                            onChange={() => toggleRow(row.id)}
                                            className="h-5 w-5 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                                        />
                                    </td>
                                    <td className={`p-4 ${!row.visible ? 'invisible' : ''}`}>{row.data}</td>
                                    <td className={`p-4 ${!row.visible ? 'invisible' : ''}`}>{row.viveiro}</td>
                                    <td className={`p-4 font-medium text-gray-800 ${!row.visible ? 'invisible' : ''}`}>{row.cliente}</td>
                                    <td className={`p-4 font-bold text-gray-900 ${!row.visible ? 'invisible' : ''}`}>{formatNumber(row.producao, ' kg')}</td>
                                    <td className={`p-4 ${!row.visible ? 'invisible' : ''}`}>{formatGrams(row.pesoMedio)}</td>
                                    <td className={`p-4 ${!row.visible ? 'invisible' : ''}`}>{formatCurrency(row.preco)}</td>
                                    <td className={`p-4 font-bold text-green-600 ${!row.visible ? 'invisible' : ''}`}>{formatCurrency(row.producao * row.preco)}</td>
                                    <td className={`p-4 ${!row.visible ? 'invisible' : ''}`}>{row.sobrevivencia}</td>
                                    <td className={`p-4 ${!row.visible ? 'invisible' : ''}`}>{row.fca}</td>
                                    <td className={`p-4 ${!row.visible ? 'invisible' : ''}`}>{row.diasCultivo}</td>
                                    <td className={`p-4 ${!row.visible ? 'invisible' : ''}`}>{row.laboratorio}</td>
                                    <td className={`p-4 font-medium text-red-600 ${!row.visible ? 'invisible' : ''}`}>{row.notas}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold text-gray-800 border-t-2 border-slate-800">
                            <tr>
                                <td colSpan={4} className="p-4 text-right">TOTAIS (SELECIONADOS):</td>
                                <td className="p-4 text-slate-900 text-lg">{formatNumber(grandTotals.biomass, ' kg')}</td>
                                <td>-</td>
                                <td>-</td>
                                <td className="p-4 text-green-600 text-lg">{formatCurrency(grandTotals.value)}</td>
                                <td colSpan={5}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>

            <section>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Resumo por Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(summaryByClient).map(([cliente, data]: [string, any]) => {
                        const info = CLIENT_INFO[cliente] || { codigo: '---', prazo: '---' };
                        const mediaGramatura = data.gramaturas.reduce((a, b) => a + b, 0) / data.count;
                        const mediaPreco = data.value / data.biomass;

                        return (
                            <div key={cliente} className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-[#f26522] flex flex-col h-full">
                                <h4 className="text-xl font-bold text-[#3a3a3a] mb-4">{cliente}</h4>
                                <div className="space-y-3 flex-1">
                                    <SummaryItem label="Código do Cliente" value={info.codigo} />
                                    <SummaryItem label="Prazo de Pagamento" value={info.prazo} />
                                    <SummaryItem label="Biomassa Total" value={formatNumber(data.biomass, ' kg')} />
                                    <SummaryItem label="Gramatura Média" value={formatGrams(mediaGramatura)} />
                                    <SummaryItem label="Preço Unitário Médio" value={formatCurrency(mediaPreco)} />
                                    <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-gray-600 font-semibold">Valor Total:</span>
                                        <span className="text-xl font-extrabold text-[#f26522]">{formatCurrency(data.value)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => generateEmail(cliente)}
                                    className="mt-6 w-full py-2 bg-[#3a3a3a] hover:bg-[#f26522] text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>✨ Gerar E-mail</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

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
                <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow font-medium transition-all text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    PDF
                </button>
                <button onClick={handleExportPNG} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow font-medium transition-all text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    PNG
                </button>
                <button onClick={handleExportHTML} className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow font-medium transition-all text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    HTML
                </button>

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
            </div>
            <div className="h-24"></div> {/* Spacer for fixed footer */}
        </div >
    );
};

const SummaryItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className="text-base text-gray-900 font-bold">{value}</span>
    </div>
);
