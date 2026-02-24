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
    onConsolidateSave?: (ids: string[]) => void;
    onUpdate?: (id: string, newOrigin: string, newDestination: string) => void;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({
    history, onView, onDelete, onClearAll, currentViewId, isPublic = false, generalSurvival = 0, onConsolidateSave, onUpdate
}) => {
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editOrigin, setEditOrigin] = React.useState('');
    const [editDestination, setEditDestination] = React.useState('');
    const [originalOrigin, setOriginalOrigin] = React.useState('');
    const [originalDestination, setOriginalDestination] = React.useState('');

    const startEditing = (entry: HistoryEntry) => {
        // Extract raw values instead of formatted label
        if (entry.data && entry.data.length > 0) {
            const first = entry.data[0];
            const origin = first.local;
            const destination = first.tipo === 'VENDA' ? (first.clienteNome || first.viveiroDestino || '') : (first.viveiroDestino || '');

            setEditOrigin(origin);
            setEditDestination(destination);
            setOriginalOrigin(origin);
            setOriginalDestination(destination);
            setEditingId(entry.id);
        }
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditOrigin('');
        setEditDestination('');
    };

    const saveEditing = (id: string) => {
        if (onUpdate) {
            onUpdate(id, editOrigin, editDestination);
        }
        setEditingId(null);
    };

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

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleProcessSelected = () => {
        if (selectedIds.length === 0) return;
        // Trigger a virtual ID or special handling to signal consolidation of multiple entries
        onView(`CONSOLIDATED:${selectedIds.join(',')}`);
    };

    if (history.length === 0) return null;

    return (
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-gray-100 dark:shadow-black/20 border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-8 border-b border-gray-50 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gray-50/30 dark:bg-slate-800/50">
                <div className="flex-grow">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-3xl">📜</span> Histórico de Movimentações
                    </h2>
                    <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-widest dark:text-gray-500">Relatórios e Processamentos Anteriores</p>
                </div>

                <div className="flex items-center gap-6">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in zoom-in">
                            <button
                                onClick={handleProcessSelected}
                                className="px-6 py-3 bg-white border-2 border-[#F97316] text-[#F97316] text-[10px] font-black rounded-2xl hover:bg-[#F97316]/5 transition-all uppercase tracking-widest shadow-lg shadow-[#F97316]/10 flex items-center gap-2"
                            >
                                <span>🚀</span> Jointer ({selectedIds.length})
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm(`Deseja mesclar permanentemente estes ${selectedIds.length} registros em um único relatório?`)) {
                                        onConsolidateSave?.(selectedIds);
                                        setSelectedIds([]);
                                    }
                                }}
                                className="px-6 py-3 bg-[#F97316] text-white text-[10px] font-black rounded-2xl hover:bg-[#EA580C] transition-all uppercase tracking-widest shadow-lg shadow-[#F97316]/20 flex items-center gap-2"
                            >
                                <span>📦</span> Fixar Permanente
                            </button>
                        </div>
                    )}

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
            </div>

            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                {history.map((entry) => {
                    const label = formatEntryLabel(entry);
                    const totalPLs = entry.data.reduce((acc, curr) => acc + (curr.estocagem || 0), 0);
                    const totalKg = entry.data.reduce((acc, curr) => acc + (curr.pesoTotalCalculado || 0), 0);
                    const isSelected = selectedIds.includes(entry.id);
                    const isEditing = editingId === entry.id;

                    return (
                        <div
                            key={entry.id}
                            className={`p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${currentViewId === entry.id || isSelected ? 'bg-[#F97316]/5 border-l-4 border-[#F97316] dark:bg-[#F97316]/10' : ''}`}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                {!isPublic && (
                                    <div
                                        onClick={() => handleToggleSelect(entry.id)}
                                        className={`w-6 h-6 rounded-md border-2 cursor-pointer transition-all flex items-center justify-center ${isSelected ? 'bg-[#F97316] border-[#F97316]' : 'border-slate-200 bg-white hover:border-[#F97316]/50 dark:bg-slate-700 dark:border-slate-600'}`}
                                    >
                                        {isSelected && <span className="text-white text-[10px]">✔</span>}
                                    </div>
                                )}
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${label.isSale ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                    {label.isSale ? '💰' : '🔄'}
                                </div>
                                <div className="flex-1">
                                    {isEditing ? (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 animate-in fade-in">
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <input
                                                    type="text"
                                                    value={editOrigin}
                                                    onChange={(e) => setEditOrigin(e.target.value)}
                                                    className="px-2 py-1 text-lg font-black text-gray-900 border-b-2 border-[#F97316] outline-none bg-transparent w-full sm:w-32 placeholder:text-gray-300"
                                                    placeholder="Origem"
                                                    autoFocus
                                                />
                                                <span className="text-gray-300 font-bold">→</span>
                                                <input
                                                    type="text"
                                                    value={editDestination}
                                                    onChange={(e) => setEditDestination(e.target.value)}
                                                    className="px-2 py-1 text-lg font-black text-gray-900 border-b-2 border-[#F97316] outline-none bg-transparent w-full sm:w-32 placeholder:text-gray-300"
                                                    placeholder="Destino"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 mt-2 sm:mt-0">
                                                <button
                                                    onClick={() => saveEditing(entry.id)}
                                                    className="p-1.5 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                                                    title="Salvar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            <p className="font-black text-gray-900 dark:text-white text-lg leading-tight group-hover:text-[#F97316] transition-colors cursor-default">{label.title}</p>
                                            {!isPublic && onUpdate && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startEditing(entry); }}
                                                    className="opacity-0 group-hover:opacity-100 transition-all p-1.5 text-slate-300 hover:text-[#F97316] hover:bg-[#F97316]/10 rounded-lg"
                                                    title="Editar Rótulo"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${label.isSale ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                            {label.subtitle}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider dark:text-gray-500">
                                            {entry.timestamp.split(',')[1]}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto">
                                <div className="hidden md:flex flex-col items-end gap-0.5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest dark:text-gray-500">Consolidado</p>
                                    <p className="text-sm font-black text-gray-700 dark:text-gray-200">
                                        {totalPLs.toLocaleString('pt-BR')} PLs • {totalKg.toFixed(2)}kg
                                    </p>
                                </div>

                                <div className="flex gap-2 ml-auto sm:ml-0">
                                    <button
                                        onClick={() => onView(entry.id)}
                                        className="px-5 py-2.5 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black hover:border-[#F97316]/20 hover:text-[#F97316] transition-all shadow-sm flex items-center gap-2 uppercase tracking-[0.1em]"
                                    >
                                        {isPublic ? '📊 Ver Detalhes' : '✏️ Ver / Editar'}
                                    </button>
                                    {!isPublic && (
                                        <button
                                            onClick={() => onDelete(entry.id)}
                                            className="p-2.5 text-gray-300 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
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
