import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGeminiParser } from '../hooks/useGeminiParser';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SupabaseService } from '../services/supabaseService';

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

// --- Styles constants (Tone on Tone Orange) ---
const COLORS = {
    primary: '#f26522',    // Orange
    secondary: '#ff9d6c',  // Light Orange
    dark: '#d95213',       // Dark Orange
    soft: '#fff5f0',       // Very Light Orange
    text: '#3a3a3a'
};

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

export const DeliveryOrder: React.FC = () => {
    const [view, setView] = useState<'INPUT' | 'DASHBOARD'>('INPUT');
    const [inputText, setInputText] = useState('');
    const [data, setData] = useState<HarvestData[]>(INITIAL_HARVEST_DATA);
    const [logo, setLogo] = useState<string | null>(null);

    // --- PERSISTÊNCIA AUTOMÁTICA (SUPABASE) ---
    useEffect(() => {
        const load = async () => {
            const { data, logo } = await SupabaseService.getDeliveryOrders();
            if (data.length > 0) setData(data);
            if (logo) setLogo(logo);
        };
        load();
    }, []);

    useEffect(() => {
        if (data.length > 0 || logo) {
            SupabaseService.saveDeliveryOrders(data, logo);
        }
    }, [data, logo]);

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
        
        ### REGRAS CRÍTICAS DE FORMATAÇÃO:
        1. **Números e Milhar (BRASIL)**: No contexto brasileiro, o ponto (.) é separador de MILHAR. 
           - Exemplo: "3.728" deve ser interpretado como 3728 (três mil setecentos e vinte e oito).
           - "3 kg" é 3.
           - Certifique-se de remover pontos de milhar antes de retornar o número.
        2. **Múltiplos Clientes**: Se uma entrada/venda citar mais de um cliente (ex: "Victor, Henrique" ou "Victor e Henrique"), você **DEVE** gerar um objeto JSON separado para cada um.
           - Se houver apenas um peso total para ambos, divida a produção proporcionalmente ou conforme indicado. Se não houver indicação, divida por 2.
           - A sobrevivência, FCA, Dias de Cultivo e outros parâmetros técnicos devem ser os mesmos para ambos os registros.
        
        Retorne um JSON estrito contendo APENAS uma lista (array) de objetos.
        Cada objeto deve ter as chaves (USE SEMPRE STRING para os valores numéricos para preservar a formatação original):
        {
            "data": "DD/MM/AAAA",
            "viveiro": "Nome do Viveiro",
            "cliente": "Nome do Cliente",
            "producao": "string (ex: '3.675' ou '3728')",
            "preco": "string (ex: '22,00')",
            "pesoMedio": "string",
            "sobrevivencia": "string com %",
            "fca": "string",
            "diasCultivo": "string",
            "laboratorio": "Nome",
            "notas": "Obs"
        }
    `;

    // --- Actions ---
    const handleProcess = async () => {
        if (!inputText.trim()) return;

        try {
            // Limpa dados anteriores explicitamente para evitar acúmulo
            setData([]);

            const results = await processText(HARVEST_PROMPT, inputText);

            if (results) {
                const newItems: HarvestData[] = (Array.isArray(results) ? results : [results]).map((item: any) => ({
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

                setData(newItems);
                setInputText('');
                setView('DASHBOARD');
            }
        } catch (error) {
            console.error("Text Processing Error", error);
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

    const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        try {
            setData([]); // Limpa antes de processar novo arquivo
            const results = await processFile(file, HARVEST_PROMPT);

            if (results) {
                const newItems: HarvestData[] = (Array.isArray(results) ? results : [results]).map((item: any) => ({
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

                setData(newItems);
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

        const systemPrompt = "Você é um assistente de faturamento da Carapitanga, uma empresa de aquicultura (criação de camarão). Seu tom é profissional, amigável e conciso. Gere apenas o corpo do e-mail, sem a saudação ('Prezado...') e sem a assinatura final (como 'Atenciosamente'). O e-mail deve ser em Português do Brasil.";

        const userQuery = `
            Gere um breve e-mail de faturamento para o cliente ${cliente}.
            
            Detalhes da Fatura:
            - Cliente: ${cliente}
            - Biomassa Total (Faturada): ${formatNumber(clientSummary.biomass, ' kg')}
            - Valor Total: ${formatCurrency(clientSummary.value)}
            - Preço Médio Ponderado: ${formatCurrency(mediaPreco)}/kg
            - Gramatura Média: ${formatGrams(mediaGramatura)}
            - Prazo de Pagamento: ${info.prazo}
            
            O e-mail deve:
            1. Informar o fechamento do faturamento referente às últimas entregas.
            2. Listar os totais de forma clara (Biomassa Total e Valor Total).
            3. Mencionar que o prazo de pagamento é de ${info.prazo}.
            4. Manter um tom cordial e profissional.
        `;

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

                            <label className="w-full py-3 px-6 bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
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
            <header className="bg-gradient-to-r from-[#f26522] to-[#ff9d6c] p-8 rounded-2xl shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    {logo && (
                        <div className="w-24 h-24 bg-white p-2 rounded-xl shadow-inner flex items-center justify-center overflow-hidden">
                            <img src={logo} alt="Empresa Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight">Resumo de Faturamento</h2>
                        <p className="text-orange-100 font-medium">Carapitanga 0019 (Ocean) — Dezembro/2025</p>
                    </div>
                </div>
                <button
                    onClick={() => setView('INPUT')}
                    className="px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-white font-bold transition-all border border-white/30"
                >
                    Nova Importação
                </button>
            </header>

            <section className="bg-white rounded-2xl shadow-xl shadow-orange-100/50 overflow-hidden border border-orange-50">
                <div className="overflow-x-auto" ref={reportRef}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#f26522] text-white">
                                <th className="p-5 text-center w-16" data-html2canvas-ignore></th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Data</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Viveiro</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Cliente</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Produção</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">P. Médio</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Preço</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Total</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Sobrev.</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">FCA</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Ciclo</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider">Laborat.</th>
                                <th className="p-5 text-left font-bold uppercase text-xs tracking-wider last:rounded-tr-2xl">Obs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-50">
                            {data.map((row) => (
                                <tr key={row.id} className={`transition-colors h-16 ${row.visible ? 'bg-white hover:bg-orange-50/30' : 'bg-gray-50/50 opacity-50'}`}>
                                    <td className="p-4 text-center" data-html2canvas-ignore>
                                        <input
                                            type="checkbox"
                                            checked={row.visible}
                                            onChange={() => toggleRow(row.id)}
                                            className="h-5 w-5 rounded-md text-[#f26522] focus:ring-[#f26522] border-orange-200 cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-5 text-sm font-semibold text-gray-500">{row.data}</td>
                                    <td className="p-5 text-sm font-bold text-gray-700">{row.viveiro}</td>
                                    <td className="p-5 text-sm font-extrabold text-[#f26522]">{row.cliente}</td>
                                    <td className="p-5 text-sm font-black text-gray-900">{formatNumber(row.producao, ' kg')}</td>
                                    <td className="p-5 text-sm text-gray-600 font-medium">{formatGrams(row.pesoMedio)}</td>
                                    <td className="p-5 text-sm text-gray-600 font-medium">{formatCurrency(row.preco)}</td>
                                    <td className="p-5 text-sm font-black text-green-600 bg-green-50/30">{formatCurrency(row.producao * row.preco)}</td>
                                    <td className="p-5 text-sm text-gray-600">{row.sobrevivencia}</td>
                                    <td className="p-5 text-sm text-gray-600">{row.fca}</td>
                                    <td className="p-5 text-sm text-gray-600">{row.diasCultivo} d</td>
                                    <td className="p-5 text-sm text-gray-600 font-semibold">{row.laboratorio}</td>
                                    <td className="p-5 text-xs text-red-500 font-bold max-w-[120px] truncate">{row.notas}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-orange-50/50 font-black text-[#3a3a3a] border-t-2 border-[#f26522]">
                            <tr>
                                <td colSpan={4} className="p-6 text-right text-sm uppercase tracking-widest text-gray-500">Total Selecionado</td>
                                <td className="p-6 text-2xl text-[#f26522]">{formatNumber(grandTotals.biomass, ' kg')}</td>
                                <td colSpan={2}></td>
                                <td className="p-6 text-2xl text-green-600">{formatCurrency(grandTotals.value)}</td>
                                <td colSpan={5}></td>
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
        </div>
    );
};

const SummaryItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className="text-base text-gray-900 font-bold">{value}</span>
    </div>
);
