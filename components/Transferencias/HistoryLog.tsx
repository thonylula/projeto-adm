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
                            <p className="font-bold text-gray-700">{entry.timestamp}</p>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                                {entry.data.length} transferências detectadas
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onView(entry.id)}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
                            >
                                💾 Ver Dados
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
