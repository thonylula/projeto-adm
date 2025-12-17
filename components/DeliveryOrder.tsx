import React, { useState, useEffect, useMemo } from 'react';

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
const INITIAL_HARVEST_DATA: HarvestData[] = [
    { id: 1, data: "31/10/2025", viveiro: "OC - 002", cliente: "CEAGESP", producao: 765, preco: 23.00, pesoMedio: 12.5, sobrevivencia: "19%", fca: "1,1", diasCultivo: 38, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 2, data: "31/10/2025", viveiro: "OC - P09", cliente: "CEAGESP", producao: 675, preco: 22.00, pesoMedio: 10, sobrevivencia: "15%", fca: "3,8", diasCultivo: 168, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 3, data: "31/10/2025", viveiro: "OC - 016", cliente: "CEAGESP", producao: 3450, preco: 22.00, pesoMedio: 11, sobrevivencia: "50%", fca: "2.2", diasCultivo: 93, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 4, data: "31/10/2025", viveiro: "OC - 005", cliente: "CEAGESP", producao: 1513, preco: 22.00, pesoMedio: 10, sobrevivencia: "-- %", fca: "--", diasCultivo: 102, laboratorio: "AQUASUL", notas: "Despesca PARCIAL", visible: true },
    { id: 5, data: "31/10/2025", viveiro: "OC - 013", cliente: "CEAGESP", producao: 3285, preco: 22.00, pesoMedio: 11, sobrevivencia: "47%", fca: "2,0", diasCultivo: 93, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 6, data: "26/10/2025", viveiro: "OC - 018", cliente: "Funelli", producao: 3616, preco: 22.50, pesoMedio: 10.5, sobrevivencia: "59%", fca: "1,30", diasCultivo: 83, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 7, data: "26/10/2025", viveiro: "OC - 011", cliente: "Funelli", producao: 4624, preco: 22.50, pesoMedio: 10.5, sobrevivencia: "51%", fca: "1,55", diasCultivo: 93, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 8, data: "10/11/2025", viveiro: "OC - 020", cliente: "CEAGESP", producao: 2140, preco: 23.00, pesoMedio: 12, sobrevivencia: "59%", fca: "0.60", diasCultivo: 46, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 9, data: "10/11/2025", viveiro: "OC - 005", cliente: "CEAGESP", producao: 2235, preco: 22.00, pesoMedio: 10, sobrevivencia: "52%", fca: "2,00", diasCultivo: 111, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 10, data: "14/12/2025", viveiro: "OC - 003", cliente: "Victor", producao: 2595, preco: 23.00, pesoMedio: 11.5, sobrevivencia: "81%", fca: "0.93", diasCultivo: 72, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 11, data: "14/12/2025", viveiro: "OC - 003", cliente: "Henrique", producao: 1133, preco: 23.00, pesoMedio: 11.5, sobrevivencia: "81%", fca: "0.93", diasCultivo: 72, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 12, data: "13/12/2025", viveiro: "OC - 015", cliente: "Victor", producao: 3000, preco: 23.00, pesoMedio: 11, sobrevivencia: "83%", fca: "0.96", diasCultivo: 71, laboratorio: "AQUASUL", notas: "", visible: true },
    { id: 13, data: "13/12/2025", viveiro: "OC - 014", cliente: "Victor", producao: 3675, preco: 22.00, pesoMedio: 9.1, sobrevivencia: "76%", fca: "1", diasCultivo: 72, laboratorio: "AQUASUL", notas: "", visible: true }
];

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
    const [data, setData] = useState<HarvestData[]>(INITIAL_HARVEST_DATA);

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

    // --- Actions ---
    const handleProcess = () => {
        // In a real scenario, we would parse 'inputText'. 
        // For now, we just switch views as requested by the "code example" logic.
        setView('DASHBOARD');
    };

    const toggleRow = (id: number) => {
        setData(prev => prev.map(item =>
            item.id === id ? { ...item, visible: !item.visible } : item
        ));
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

        INITIAL_HARVEST_DATA.forEach(row => { // Using initial data to match HTML behavior of static summary
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
    }, []); // Empty dependency array as it processes static INITIAL_DATA for now

    // --- Gemini API Logic ---
    const generateEmail = async (cliente: string) => {
        setModalOpen(true);
        setModalLoading(true);
        setModalError(false);
        setGeneratedEmail('');

        const clientSummary = summaryByClient[cliente];
        const info = CLIENT_INFO[cliente];

        if (!clientSummary || !info) {
            setModalError(true);
            setModalLoading(false);
            setGeneratedEmail('Erro: Dados do cliente não encontrados.');
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
            const rawApiKey = process.env.GEMINI_API_KEY || '';
            const apiKey = rawApiKey.trim();
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userQuery }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                })
            });

            if (!response.ok) throw new Error('API Error');

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                setGeneratedEmail(text);
            } else {
                throw new Error('No content');
            }
        } catch (e) {
            console.error(e);
            setModalError(true);
        } finally {
            setModalLoading(false);
        }
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
                                    <p className="text-xs text-gray-500">TXT, CSV ou JSON (Máx. 10MB)</p>
                                </div>
                                <input id="file-upload" type="file" className="hidden" />
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
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#f26522] text-white">
                            <tr>
                                <th className="p-4 text-center w-16 first:rounded-tl-lg">Ocultar</th>
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
                                    <td className="p-4 text-center">
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
        </div>
    );
};

const SummaryItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className="text-base text-gray-900 font-bold">{value}</span>
    </div>
);
