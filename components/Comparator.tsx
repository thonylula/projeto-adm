
import React, { useState, useEffect } from 'react';
import { useGeminiParser } from '../hooks/useGeminiParser';
import { SupabaseService } from '../services/supabaseService';

interface ComparisonRecord {
    id: string;
    source_a_label: string;
    source_b_label: string;
    analysis_result: any;
    timestamp: string;
}

export const Comparator: React.FC = () => {
    const [sourceA, setSourceA] = useState<{ text: string; file: File | null; label: string }>({ text: '', file: null, label: 'Origem A' });
    const [sourceB, setSourceB] = useState<{ text: string; file: File | null; label: string }>({ text: '', file: null, label: 'Origem B' });
    const [result, setResult] = useState<any>(null);
    const [history, setHistory] = useState<ComparisonRecord[]>([]);
    const { processFiles, isProcessing } = useGeminiParser();

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const data = await SupabaseService.getComparisonHistory();
        setHistory(data);
    };

    const handleCompare = async () => {
        if ((!sourceA.text && !sourceA.file) || (!sourceB.text && !sourceB.file)) {
            alert("Por favor, forneça as duas fontes para comparação.");
            return;
        }

        const files: File[] = [];
        if (sourceA.file) files.push(sourceA.file);
        if (sourceB.file) files.push(sourceB.file);

        const prompt = `
      Você é um assistente de auditoria especialista em encontrar divergências.
      Sua tarefa é comparar a fonte "${sourceA.label}" e a fonte "${sourceB.label}" e listar TODAS as discrepâncias encontradas.
      
      Fontes fornecidas:
      ${sourceA.label}: ${sourceA.file ? '[Arquivo Anexo]' : 'Texto abaixo'}
      ${sourceB.label}: ${sourceB.file ? '[Arquivo Anexo]' : 'Texto abaixo'}
      
      Conteúdo de Texto (se houver):
      Texto de ${sourceA.label}: ${sourceA.text}
      Texto de ${sourceB.label}: ${sourceB.text}

      Analise detalhadamente:
      1. Valores numéricos e financeiros.
      2. Nomes de pessoas, empresas e produtos.
      3. Datas de emissão, vencimento ou referência.
      4. Itens ausentes em uma das fontes.
      5. Erros de digitação ou divergências de impostos.

      Responda EXCLUSIVAMENTE em formato JSON estruturado como este exemplo:
      {
        "status": "divergent" | "equal",
        "summary": "Breve resumo da análise",
        "divergences": [
          { "field": "Nome do Campo", "sourceA": "Valor A", "sourceB": "Valor B", "severity": "high" | "medium" | "low" }
        ],
        "observations": "Comentários adicionais"
      }
    `;

        const analysis = await processFiles(files, prompt);
        if (analysis) {
            setResult(analysis);
            await SupabaseService.saveComparison({
                source_a_label: sourceA.label,
                source_b_label: sourceB.label,
                analysis_result: analysis
            });
            loadHistory();
        }
    };

    const clear = () => {
        setSourceA({ text: '', file: null, label: 'Origem A' });
        setSourceB({ text: '', file: null, label: 'Origem B' });
        setResult(null);
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Comparador Inteligente</h1>
                <p className="text-slate-500">Compare PDFs, Imagens ou Textos para encontrar divergências automaticamente.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* LADO A */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">A</span>
                        <input
                            type="text"
                            className="bg-transparent border-b border-orange-200 outline-none font-bold text-slate-800 focus:border-orange-500 transition-colors w-full"
                            value={sourceA.label}
                            onChange={(e) => setSourceA({ ...sourceA, label: e.target.value })}
                            placeholder="Nome da Origem A"
                        />
                    </div>
                    <textarea
                        className="w-full h-32 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none mb-4"
                        placeholder="Cole o texto aqui ou anexe um arquivo abaixo..."
                        value={sourceA.text}
                        onChange={(e) => setSourceA({ ...sourceA, text: e.target.value })}
                    />
                    <input
                        type="file"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setSourceA({ ...sourceA, file, label: file ? file.name : sourceA.label });
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    {sourceA.file && <p className="mt-2 text-[10px] text-green-600 font-bold uppercase">📎 {sourceA.file.name}</p>}
                </div>

                {/* LADO B */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">B</span>
                        <input
                            type="text"
                            className="bg-transparent border-b border-blue-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors w-full"
                            value={sourceB.label}
                            onChange={(e) => setSourceB({ ...sourceB, label: e.target.value })}
                            placeholder="Nome da Origem B"
                        />
                    </div>
                    <textarea
                        className="w-full h-32 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                        placeholder="Cole o texto aqui ou anexe um arquivo abaixo..."
                        value={sourceB.text}
                        onChange={(e) => setSourceB({ ...sourceB, text: e.target.value })}
                    />
                    <input
                        type="file"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setSourceB({ ...sourceB, file, label: file ? file.name : sourceB.label });
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {sourceB.file && <p className="mt-2 text-[10px] text-blue-600 font-bold uppercase">📎 {sourceB.file.name}</p>}
                </div>
            </div>

            <div className="flex justify-center gap-4 mb-12">
                <button
                    onClick={clear}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                    Limpar
                </button>
                <button
                    onClick={handleCompare}
                    disabled={isProcessing}
                    className={`px-10 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black active:scale-95'}`}
                >
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analisando...
                        </>
                    ) : (
                        <>
                            Analisar Divergências com IA
                        </>
                    )}
                </button>
            </div>

            {result && (
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 mb-12">
                    <div className={`p-6 ${result.status === 'equal' ? 'bg-green-600' : 'bg-orange-600'} text-white`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold uppercase tracking-tight">Resultado da Análise</h3>
                                <p className="text-white/80 text-sm mt-1">{result.summary}</p>
                            </div>
                            <div className="text-4xl font-black opacity-30">
                                {result.status === 'equal' ? 'OK' : 'DIFF'}
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        {result.divergences && result.divergences.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <th className="pb-4">Campo / Assunto</th>
                                            <th className="pb-4 truncate max-w-[150px]">{sourceA.label}</th>
                                            <th className="pb-4 truncate max-w-[150px]">{sourceB.label}</th>
                                            <th className="pb-4">Gravidade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {result.divergences.map((div: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 font-bold text-slate-800">{div.field}</td>
                                                <td className="py-4 text-slate-600">{div.sourceA}</td>
                                                <td className="py-4 text-slate-600 font-medium">{div.sourceB}</td>
                                                <td className="py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${div.severity === 'high' ? 'bg-red-100 text-red-600' :
                                                        div.severity === 'medium' ? 'bg-orange-100 text-orange-600' :
                                                            'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        {div.severity}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h4 className="font-bold text-slate-800">Nenhuma divergência encontrada</h4>
                                <p className="text-slate-500 text-sm">As duas fontes parecem estar em total conformidade.</p>
                            </div>
                        )}

                        {result.observations && (
                            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="block text-[10px] font-black text-slate-400 uppercase mb-2">Observações da IA</span>
                                <p className="text-sm text-slate-700 leading-relaxed italic">{result.observations}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* HISTÓRICO RECENTE */}
            {history.length > 0 && (
                <section className="mt-12">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Análises Recentes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {history.map((h) => (
                            <button
                                key={h.id}
                                onClick={() => setResult(h.analysis_result)}
                                className="bg-white p-4 rounded-2xl border border-slate-200 text-left hover:border-orange-500 hover:shadow-md transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${h.analysis_result.status === 'equal' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {h.analysis_result.status}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{h.source_a_label} vs {h.source_b_label}</p>
                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{h.analysis_result.summary}</p>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
