import React from 'react';
import type { HistoryEntry } from '../../types';

interface HistoryLogProps {
    history: HistoryEntry[];
    onView: (id: string) => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
    currentViewId: string | null;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({
    history, onView, onDelete, onClearAll, currentViewId
}) => {
    const formatEntryLabel = (entry: HistoryEntry) => {
        if (!entry.data || entry.data.length === 0) return entry.timestamp;

        const first = entry.data[0];
        const datePart = first.data ? first.data.split('/').slice(0, 2).join('/') : '--/--';
        const isSale = first.tipo === 'VENDA';
        const typePart = isSale ? 'Vend' : 'Transf';
        const originPart = first.local.substring(0, 15).replace(/\s+/g, '_');

        // Priority for destination: clientNome (if sale), then viveiroDestino, then '?'
        const rawDestination = isSale ? (first.clienteNome || first.viveiroDestino) : first.viveiroDestino;
        const destinationPart = (rawDestination || '?').substring(0, 15).replace(/\s+/g, '_');

        return `${typePart}_${datePart}_${originPart}/${destinationPart}`;
    };

    if (history.length === 0) return null;

    return (
        <div className="mt-12 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    📜 Histórico de Processamentos
                </h2>
                <button
                    onClick={() => { if (window.confirm("Limpar todo o histórico?")) onClearAll(); }}
                    className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
                >
                    Limpar Tudo
                </button>
            </div>

            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {history.map((entry) => (
                    <div
                        key={entry.id}
                        className={`p-4 flex items-center justify-between hover:bg-orange-50 transition-colors ${currentViewId === entry.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}
                    >
                        <div>
                            <p className="font-bold text-gray-700">{formatEntryLabel(entry)}</p>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em] mt-1">
                                {entry.timestamp} • {entry.data.length} transferências
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onView(entry.id)}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                            >
                                ✏️ Ver / Editar
                            </button>
                            <button
                                onClick={() => onDelete(entry.id)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                title="Deletar"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
