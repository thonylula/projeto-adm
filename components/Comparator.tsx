
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
    const [analysisType, setAnalysisType] = useState<'nf' | 'spreadsheet'>('nf');
    const [result, setResult] = useState<any>(null);
    const [history, setHistory] = useState<ComparisonRecord[]>([]);
    const [queuedDivergences, setQueuedDivergences] = useState<any[]>([]);
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

        const prompt = analysisType === 'nf' ? `
      Você é um assistente de auditoria especialista em encontrar divergências.
      Sua tarefa é comparar a fonte "${sourceA.label}" e a fonte "${sourceB.label}" e listar TODAS as discrepâncias encontradas.
      
      Fontes fornecidas:
      ${sourceA.label}: ${sourceA.file ? '[Arquivo Anexo]' : 'Texto abaixo'}
      ${sourceB.label}: ${sourceB.file ? '[Arquivo Anexo]' : 'Texto abaixo'}
      
      Conteúdo de Texto (se houver):
      Texto de ${sourceA.label}: ${sourceA.text}
      Texto de ${sourceB.label}: ${sourceB.text}

      Analise detalhadamente:
      1. Identifique Documentos Ausentes em uma das fontes (Divergência Crítica).
      2. Identifique Documentos Presentes em ambas as fontes.
      3. Valores numéricos, impostos e datas.
      4. Itens cancelados ou inutilizados.

      Responda EXCLUSIVAMENTE em formato JSON:
      {
        "status": "divergent" | "equal",
        "summary": "Resumo",
        "divergences": [{ 
            "documentNumber": "NF", "cnpj": "CNPJ", "companyName": "Empresa",
            "statusSourceA": "PRESENTE" | "AUSENTE", "statusSourceB": "PRESENTE" | "AUSENTE",
            "severity": "high" | "medium" | "low", "date": "ISO", "isCancelled": boolean,
            "isNFSe": boolean, "isMissing": boolean 
        }],
        "observations": "Comentários"
      }
    ` : `
      ### PROTOCOLO DE RECONCILIAÇÃO "ZERO DÚVIDA" (AUDITORIA 100% ACERTIVA) ###
      Você é um Auditor Sênior de Elite. Seu objetivo é o ERRO ZERO. 
      Siga rigorosamente estas fases para comparar ${sourceA.label} e ${sourceB.label}:

      FASE 1: INDEXAÇÃO INDIVIDUAL (SCAN COMPULSÓRIO)
      - Liste mentalmente cada linha da Planilha e cada linha das Notas Fiscais.
      - Não pule nenhuma linha, mesmo que pareçam repetidas.
      - Atribua um ID temporário em sua memória para cada registro extraído.

      FASE 2: TRAVA MATEMÁTICA E NORMALIZAÇÃO
      - Toda linha da Planilha DEVE satisfazer: Prod(kg) * Preço = Valor R$.
      - Tolerância máxima para arredondamento: 0.5%.
      - Se Valor Planilha != (Prod * Preço), aplique a flag "inconsistencia_valor".
      - Normalize Datas (DD/MM/AAAA) e Nomes (Remova "LTDA", "EPP", etc).

      FASE 3: IDENTIDADE SEMÂNTICA E MANDATO DE CONSOLIDAÇÃO (ANTI-FRAGMENTAÇÃO)
      - CRITÉRIO DE PESO: Prioridade Máxima ao [VALOR R$], seguido pela [DATA].
      - MANDATO DE CONSOLIDAÇÃO: Se encontrar uma linha na Planilha e uma linha no Sistema com o MESMO VALOR e MESMA DATA, você deve OBRIGATORIAMENTE tentar consolidá-las como o mesmo registro.
      - DETECÇÃO DE PARENTESCO AGRESSIVA: "BAIANO" (A) e "JOSÉ JURANDI DOS SANTOS-BAIANO" (B) são 100% o MESMO registro se Valor e Data baterem. 
      - PROIBIÇÃO DE FRAGMENTAÇÃO: Nunca gere duas entradas separadas (uma como AUSENTE em A e outra como AUSENTE em B) para a mesma transação financeira. Se os valores batem, faça o merge e use o nome mais completo disponível.

      FASE 4: VARREDURA FINAL E PROVA REAL
      - STATUS "equal": Use apenas se Data, Cliente (ou Parentesco), e Valor baterem 100% e a conta Peso x Preço fechar.
      - STATUS "divergent": Use para registros órfãos (realmente não encontrados no outro lado) ou com erro na conta matemática.
      - Ao consolidar por Parentesco, sature a confiança em 1.0 se o Valor for exato.
      - Flags obrigatórias:
        * "inconsistencia_valor": Erro na conta Peso x Preço.
        * "biometria_fora_faixa": Se Biometria(g) < 8 ou > 30.
        * "baixo_conf": Ambiguidade no OCR ou rasuras.

      Responda EXCLUSIVAMENTE em formato JSON:
      {
        "status": "divergent" | "equal",
        "summary": "Relatório Executivo detalhando o volume auditado (ex: X linhas conferidas, Y divergências)",
        "divergences": [{ 
            "documentNumber": "Data do Lançamento (Ex: 03/Nov)", 
            "cnpj": "Cliente/Pessoa (Nome Normalizado)", 
            "companyName": "Valor R$",
            "statusSourceA": "PRESENTE" | "AUSENTE", 
            "statusSourceB": "PRESENTE" | "AUSENTE",
            "severity": "high" | "medium" | "low", 
            "date": "Data ISO (YYYY-MM-DD)", 
            "isMissing": boolean,
            "confidence": 0.0 a 1.0,
            "flags": ["inconsistencia_valor", "baixo_conf", "biometria_fora_faixa", etc]
        }],
        "observations": "Lista detalhada de cada inconsistência e prova matemática do erro se houver."
      }
    `;

        const analysis = await processFiles(files, prompt, 'gemini-3-pro');
        if (analysis) {
            // Ordenar divergências por data (cronologicamente)
            if (analysis.divergences && Array.isArray(analysis.divergences)) {
                analysis.divergences.sort((a: any, b: any) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return a.date.localeCompare(b.date);
                });
            }

            setResult(analysis);
            await SupabaseService.saveComparison({
                source_a_label: sourceA.label,
                source_b_label: sourceB.label,
                analysis_result: { ...analysis, analysis_type: analysisType }
            });
            loadHistory();
        }
    };

    const clear = () => {
        setSourceA({ text: '', file: null, label: 'Origem A' });
        setSourceB({ text: '', file: null, label: 'Origem B' });
        setResult(null);
    };

    const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Deseja excluir esta análise do histórico?")) {
            const success = await SupabaseService.deleteComparison(id);
            if (success) {
                loadHistory();
            }
        }
    };

    const handleRenameHistory = async (record: ComparisonRecord, e: React.MouseEvent) => {
        e.stopPropagation();
        const newA = window.prompt("Novo nome para a Origem A:", record.source_a_label);
        const newB = window.prompt("Novo nome para a Origem B:", record.source_b_label);

        if (newA || newB) {
            const success = await SupabaseService.updateComparison(record.id, {
                source_a_label: newA || record.source_a_label,
                source_b_label: newB || record.source_b_label
            });
            if (success) {
                loadHistory();
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent, side: 'A' | 'B') => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const file = new File([blob], `screenshot_${side}_${Date.now()}.png`, { type: blob.type });
                    if (side === 'A') {
                        setSourceA({ ...sourceA, file, label: file.name });
                    } else {
                        setSourceB({ ...sourceB, file, label: file.name });
                    }
                }
            }
        }
    };

    const addToQueue = (div: any) => {
        setQueuedDivergences(prev => [...prev, { ...div, timestamp: new Date().toISOString() }]);
    };

    const removeFromQueue = (index: number) => {
        setQueuedDivergences(prev => prev.filter((_, i) => i !== index));
    };

    const exportHTML = () => {
        const content = `
            <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { bg-color: #f8f9fa; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .tag { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Divergências Consolidadas</h1>
                        <p>Total de itens: ${queuedDivergences.length}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Data/ID</th>
                                <th>Cliente/Pessoa</th>
                                <th>Divergência / Flags</th>
                                <th>Status A</th>
                                <th>Status B</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${queuedDivergences.map(d => `
                                <tr>
                                    <td>${d.documentNumber || 'N/A'}</td>
                                    <td>${d.cnpj || 'N/A'}</td>
                                    <td>${d.companyName || 'N/A'} ${d.flags ? d.flags.join(', ') : ''}</td>
                                    <td>${d.statusSourceA}</td>
                                    <td>${d.statusSourceB}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;
        const blob = new Blob([content], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `divergencias_${Date.now()}.html`;
        link.click();
    };

    const exportPDF = () => {
        const element = document.getElementById('divergence-report');
        if (element && (window as any).html2pdf) {
            const opt = {
                margin: 10,
                filename: `relatorio_divergencias_${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            (window as any).html2pdf().from(element).set(opt).save();
        } else {
            alert('Biblioteca de exportação não carregada.');
        }
    };

    const exportPNG = () => {
        const element = document.getElementById('divergence-report');
        if (element && (window as any).html2canvas) {
            (window as any).html2canvas(element).then((canvas: any) => {
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `divergencias_${Date.now()}.png`;
                link.click();
            });
        } else {
            alert('Biblioteca de captura não carregada.');
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Comparador Inteligente</h1>
                <p className="text-slate-500">Compare PDFs, Imagens ou Textos para encontrar divergências automaticamente.</p>
            </header>

            <div className="flex justify-center mb-8">
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setAnalysisType('nf')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${analysisType === 'nf' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Analisar Nota Fiscal
                    </button>
                    <button
                        onClick={() => setAnalysisType('spreadsheet')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${analysisType === 'spreadsheet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Analisar Planilha
                    </button>
                </div>
            </div>

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
                        placeholder="Cole o texto ou PRINTE uma imagem aqui..."
                        value={sourceA.text}
                        onChange={(e) => setSourceA({ ...sourceA, text: e.target.value })}
                        onPaste={(e) => handlePaste(e, 'A')}
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
                        placeholder="Cole o texto ou PRINTE uma imagem aqui..."
                        value={sourceB.text}
                        onChange={(e) => setSourceB({ ...sourceB, text: e.target.value })}
                        onPaste={(e) => handlePaste(e, 'B')}
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
                        {/* DIVERGÊNCIAS CRÍTICAS (DOCUMENTOS AUSENTES) */}
                        <div className="mb-10">
                            <h4 className="text-sm font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                                Divergências Críticas (Documentos Ausentes)
                            </h4>
                            {result.divergences && result.divergences.filter((d: any) => d.isMissing && !d.isCancelled && !d.isNFSe).length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-black uppercase tracking-widest border-b border-slate-200">
                                                <th className="pb-4">{analysisType === 'nf' ? 'Nº Nota Fiscal' : 'Data'}</th>
                                                <th className="pb-4">{analysisType === 'nf' ? 'CNPJ' : 'Cliente / Pessoa'}</th>
                                                <th className="pb-4">{analysisType === 'nf' ? 'Nome da Empresa' : 'Divergência / Flags'}</th>
                                                <th className="pb-4 text-center">{sourceA.label}</th>
                                                <th className="pb-4 text-center">{sourceB.label}</th>
                                                <th className="pb-4 text-right">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {result.divergences.filter((d: any) => d.isMissing && !d.isCancelled && !d.isNFSe).map((div: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                                    <td className="py-4 font-bold text-black">{div.documentNumber || 'N/A'}</td>
                                                    <td className="py-4 text-xs text-black">{div.cnpj || 'N/A'}</td>
                                                    <td className="py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-black font-medium">{div.companyName || 'N/A'}</span>
                                                            {div.flags && div.flags.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {div.flags.map((f: string) => (
                                                                        <span key={f} className="bg-red-50 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-100 uppercase">
                                                                            {f}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${div.statusSourceA === 'PRESENTE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                {div.statusSourceA}
                                                            </span>
                                                            {div.confidence !== undefined && (
                                                                <span className="text-[8px] mt-1 font-bold text-slate-400">{(div.confidence * 100).toFixed(0)}%</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${div.statusSourceB === 'PRESENTE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                {div.statusSourceB}
                                                            </span>
                                                            {div.confidence !== undefined && (
                                                                <span className="text-[8px] mt-1 font-bold text-slate-400">{(div.confidence * 100).toFixed(0)}%</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <button
                                                            onClick={() => addToQueue(div)}
                                                            className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-black transition-colors"
                                                        >
                                                            + Adicionar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm italic">Nenhum documento ausente identificado.</p>
                            )}
                        </div>

                        {/* DOCUMENTOS CONFERIDOS (OK - PRESENTES EM AMBOS) */}
                        {result.divergences && result.divergences.some((d: any) => !d.isMissing && !d.isCancelled && !d.isNFSe) && (
                            <div className="mt-12 pt-8 border-t border-slate-100 mb-10">
                                <h4 className="text-sm font-black text-green-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    {analysisType === 'nf' ? 'Documentos Conferidos (OK / Presentes em Ambos)' : 'Registros Conferidos (OK / Presentes em Ambos)'}
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-black uppercase tracking-widest border-b border-slate-200">
                                                <th className="pb-4">{analysisType === 'nf' ? 'Nº Nota Fiscal' : 'Data'}</th>
                                                <th className="pb-4">{analysisType === 'nf' ? 'CNPJ' : 'Cliente / Pessoa'}</th>
                                                <th className="pb-4">{analysisType === 'nf' ? 'Nome da Empresa' : 'Valor'}</th>
                                                <th className="pb-4 text-center">Status</th>
                                                <th className="pb-4 text-center">Origem A</th>
                                                <th className="pb-4 text-center">Origem B</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {result.divergences.filter((d: any) => !d.isMissing && !d.isCancelled && !d.isNFSe).map((div: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                                                    <td className="py-3 text-xs font-bold text-black">{div.documentNumber || 'N/A'}</td>
                                                    <td className="py-3 text-xs text-black">{div.cnpj || 'N/A'}</td>
                                                    <td className="py-3 text-xs text-black font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{div.companyName || 'N/A'}</span>
                                                            {div.confidence !== undefined && (
                                                                <span className="text-[8px] font-black text-green-500 uppercase mt-0.5">CONFIANÇA: {(div.confidence * 100).toFixed(0)}%</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-green-100 text-green-600">
                                                            CONFERIDO
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <span className="text-[10px] text-green-600 font-bold">✓ PRESENTE</span>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <span className="text-[10px] text-green-600 font-bold">✓ PRESENTE</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* NOTAS DE SERVIÇO (NFSe) */}
                        {result.divergences && result.divergences.some((d: any) => d.isNFSe && !d.isCancelled) && (
                            <div className="mt-12 pt-8 border-t border-slate-100 mb-10">
                                <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    Notas Fiscais de Serviço (NFSe)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {result.divergences.filter((d: any) => d.isNFSe && !d.isCancelled).map((div: any, idx: number) => (
                                        <div key={idx} className="bg-indigo-50/30 border border-indigo-100 p-4 rounded-2xl">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Nº Nota Fiscal</p>
                                                    <p className="text-sm font-bold text-indigo-900">{div.documentNumber || 'N/A'}</p>
                                                </div>
                                                <span className="text-[9px] font-black text-indigo-400 uppercase bg-white border border-indigo-200 px-2 py-0.5 rounded">NFSe</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                <div>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">CNPJ</p>
                                                    <p className="text-xs text-black font-medium">{div.cnpj || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Empresa</p>
                                                    <p className="text-xs text-black font-medium">{div.companyName || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-indigo-100">
                                                <div>
                                                    <p className="text-[10px] text-black font-bold uppercase mb-1">{sourceA.label}</p>
                                                    <p className="text-xs text-black font-medium">{div.statusSourceA || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-black font-bold uppercase mb-1">{sourceB.label}</p>
                                                    <p className="text-xs text-black font-medium">{div.statusSourceB || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* NOTAS CANCELADAS / EXCLUÍDAS */}
                        {result.divergences && result.divergences.some((d: any) => d.isCancelled) && (
                            <div className="mt-12 pt-8 border-t border-slate-100">
                                <h4 className="text-sm font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                    Notas Canceladas / Excluídas ou Ausentes em uma das partes
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {result.divergences.filter((d: any) => d.isCancelled).map((div: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Nº Nota Fiscal</p>
                                                    <p className="text-sm font-bold text-slate-700">{div.documentNumber || 'N/A'}</p>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded">Cancelada/Invisível</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                <div>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">CNPJ</p>
                                                    <p className="text-xs text-black font-medium">{div.cnpj || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Empresa</p>
                                                    <p className="text-xs text-black font-medium">{div.companyName || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{sourceA.label}</p>
                                                    <p className={`text-xs font-medium ${div.statusSourceA === 'AUSENTE' ? 'text-red-600 italic' : 'text-black'}`}>
                                                        {div.statusSourceA || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{sourceB.label}</p>
                                                    <p className={`text-xs font-medium ${div.statusSourceB === 'AUSENTE' ? 'text-red-600 italic' : 'text-black'}`}>
                                                        {div.statusSourceB || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.observations && (
                            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="block text-[10px] font-black text-slate-500 uppercase mb-2">Observações da IA</span>
                                <p className="text-sm text-black font-medium leading-relaxed italic">{result.observations}</p>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* FILA DE DIVERGÊNCIAS PARA EXPORTAÇÃO */}
            {queuedDivergences.length > 0 && (
                <div className="mt-12 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in mb-20" id="divergence-section">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold uppercase tracking-widest">Relatório Consolidado de Divergências</h3>
                            <p className="text-slate-400 text-xs mt-1">Acumulando {queuedDivergences.length} divergências para exportação</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all shadow-lg">PDF</button>
                            <button onClick={exportPNG} className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all shadow-lg">PNG</button>
                            <button onClick={exportHTML} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all shadow-lg">HTML</button>
                        </div>
                    </div>

                    <div className="p-8" id="divergence-report">
                        <div className="mb-6 pb-6 border-b border-slate-100">
                            <h2 className="text-2xl font-black text-slate-900 uppercase">Relatório de Auditoria</h2>
                            <p className="text-slate-500 text-sm">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                        </div>

                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="pb-4">Data/Referência</th>
                                    <th className="pb-4">Cliente / Pessoa</th>
                                    <th className="pb-4">Detalhamento da Divergência</th>
                                    <th className="pb-4 text-center">Situação Final</th>
                                    <th className="pb-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {queuedDivergences.map((div, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 font-bold text-slate-900 text-sm">{div.documentNumber}</td>
                                        <td className="py-4 text-xs text-slate-600">{div.cnpj}</td>
                                        <td className="py-4">
                                            <p className="text-xs font-medium text-slate-800">{div.companyName}</p>
                                            {div.flags && div.flags.map((f: string) => (
                                                <span key={f} className="inline-block bg-red-50 text-red-600 text-[7px] font-black px-1 py-0.5 rounded border border-red-100 uppercase mr-1 mt-1">
                                                    {f}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase rounded">DIVERGENTE</span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <button onClick={() => removeFromQueue(idx)} className="text-red-400 hover:text-red-700 p-2 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center opacity-50">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Sistema de Auditoria Inteligente v2.0</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Total: {queuedDivergences.length} Divergências</p>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTÓRICO RECENTE */}
            {
                history.length > 0 && (
                    <section className="mt-12">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Análises Recentes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {history.map((h) => (
                                <div
                                    key={h.id}
                                    onClick={() => {
                                        setResult(h.analysis_result);
                                        if (h.analysis_result.analysis_type) {
                                            setAnalysisType(h.analysis_result.analysis_type);
                                        }
                                    }}
                                    className="bg-white p-4 rounded-2xl border border-slate-200 text-left hover:border-orange-500 hover:shadow-md transition-all group relative cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${h.analysis_result.status === 'equal' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {h.analysis_result.status}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => handleRenameHistory(h, e)}
                                                className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                                title="Renomear"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteHistory(h.id, e)}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                title="Excluir"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{h.source_a_label} vs {h.source_b_label}</p>
                                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{h.analysis_result.summary}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
        </div>
    );
};
