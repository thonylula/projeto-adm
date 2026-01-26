import React from 'react';
import type { HistoryEntry } from '../../types';

interface HistoryLogProps {
    history: HistoryEntry[];
    onView: (id: string) => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
    currentViewId: string | null;
    isPublic?: boolean;
    generalSurvival?: number;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({
    history, onView, onDelete, onClearAll, currentViewId, isPublic = false, generalSurvival = 0
}) => {
    const formatEntryLabel = (entry: HistoryEntry) => {
        if (!entry.data || entry.data.length === 0) return { title: entry.timestamp, subtitle: '', isSale: false };

        const first = entry.data[0];
        const datePart = first.data ? first.data.split('/').slice(0, 2).join('/') : '--/--';
        const isSale = first.tipo === 'VENDA';
        const typePart = isSale ? 'Venda' : 'Transferência';
        const originPart = first.local.substring(0, 15);

        // Priority for destination: clientNome (if sale), then viveiroDestino, then '?'
        const rawDestination = isSale ? (first.clienteNome || first.viveiroDestino) : first.viveiroDestino;
        const destinationPart = (rawDestination || '?').substring(0, 15);

        return {
            title: `${originPart} → ${destinationPart}`,
            subtitle: `${typePart} em ${datePart}`,
            isSale
        };
    };

    if (history.length === 0) return null;

    return (
        <div className="mt-12 bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gray-50/30">
                <div className="flex-grow">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <span className="text-3xl">📜</span> Histórico de Movimentações
                    </h2>
                    <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-widest">Relatórios e Processamentos Anteriores</p>
                </div>

                <div className="flex items-center gap-8 pr-4">
                    <div className="flex flex-col items-center md:items-end">
                        <p className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.2em] mb-1">Sobr. Média Geral</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-[#F97316] tracking-tighter">
                                {generalSurvival.toFixed(1)}
                            </span>
                            <span className="text-xl font-black text-[#F97316]/40">%</span>
                        </div>
                    </div>

                    {!isPublic && (
                        <button
                            onClick={() => { if (window.confirm("Limpar todo o histórico?")) onClearAll(); }}
                            className="px-4 py-2 text-[10px] font-black text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest border border-red-100"
                        >
                            Limpar Tudo
                        </button>
                    )}
                </div>
            </div>

            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                {history.map((entry) => {
                    const label = formatEntryLabel(entry);
                    const totalPLs = entry.data.reduce((acc, curr) => acc + (curr.estocagem || 0), 0);
                    const totalKg = entry.data.reduce((acc, curr) => acc + (curr.pesoTotalCalculado || 0), 0);

                    return (
                        <div
                            key={entry.id}
                            className={`p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-all ${currentViewId === entry.id ? 'bg-[#F97316]/5 border-l-4 border-[#F97316]' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${label.isSale ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-green-100 text-green-600'}`}>
                                    {label.isSale ? '💰' : '🔄'}
                                </div>
                                <div>
                                    <p className="font-black text-gray-900 text-lg leading-tight">{label.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${label.isSale ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-green-100 text-green-600'}`}>
                                            {label.subtitle}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            {entry.timestamp.split(',')[1]}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto">
                                <div className="hidden md:flex flex-col items-end gap-0.5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Consolidado</p>
                                    <p className="text-sm font-black text-gray-700">
                                        {totalPLs.toLocaleString('pt-BR')} PLs • {totalKg.toFixed(2)}kg
                                    </p>
                                </div>

                                <div className="flex gap-2 ml-auto sm:ml-0">
                                    <button
                                        onClick={() => onView(entry.id)}
                                        className="px-5 py-2.5 bg-white border-2 border-slate-100 text-slate-700 rounded-xl text-xs font-black hover:border-[#F97316]/20 hover:text-[#F97316] transition-all shadow-sm flex items-center gap-2 uppercase tracking-[0.1em]"
                                    >
                                        {isPublic ? '📊 Ver Detalhes' : '✏️ Ver / Editar'}
                                    </button>
                                    {!isPublic && (
                                        <button
                                            onClick={() => onDelete(entry.id)}
                                            className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Deletar"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
