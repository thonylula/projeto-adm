import React from 'react';
import type { ProcessedData, ExtractedData } from '../../types';

interface ResultsTableProps {
    data: ProcessedData[];
    editingIndex?: number | null;
    onEditStart?: (index: number) => void;
    onEditSave?: (index: number, updatedData: Partial<ExtractedData>) => void;
    onEditCancel?: () => void;
    onRemove?: (index: number) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
    data,
    editingIndex,
    onEditStart,
    onEditSave,
    onEditCancel,
    onRemove
}) => {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-xs text-left text-gray-500">
                <thead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <tr>
                        <th className="px-4 py-4">Origem</th>
                        <th className="px-4 py-4 text-right">Estocagem</th>
                        <th className="px-4 py-4 text-right">PL/g</th>
                        <th className="px-4 py-4 text-right">Peso Médio (g)</th>
                        <th className="px-4 py-4 text-right">Densidade</th>
                        <th className="px-4 py-4">Destino</th>
                        <th className="px-4 py-4 text-center">Tipo</th>
                        {(onEditStart || onRemove) && <th className="px-4 py-4 text-center text-orange-600">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {data.map((item, index) => (
                        <tr key={index} className="bg-white hover:bg-orange-50/10 transition-colors">
                            <td className="px-4 py-4 font-black text-gray-900">{item.local}</td>
                            <td className="px-4 py-4 text-right text-gray-400">{(item.estocagem || 0).toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-4 text-right text-gray-400">{item.plPorGrama}</td>
                            <td className="px-4 py-4 text-right text-gray-400">{(item.pesoMedioCalculado || 0).toFixed(4)}g</td>
                            <td className="px-4 py-4 text-right text-gray-400">{item.densidade || '-'}</td>
                            <td className="px-4 py-4 font-black text-gray-900">{item.viveiroDestino}</td>
                            <td className="px-4 py-4 text-center">
                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.isParcial ? 'bg-amber-100/50 text-amber-600' : 'bg-green-100/50 text-green-600'}`}>
                                    {item.isParcial ? 'Parcial' : 'Total'}
                                </span>
                            </td>
                            {(onEditStart || onRemove) && (
                                <td className="px-4 py-3 text-center flex justify-center gap-2">
                                    {onEditStart && (
                                        <button onClick={() => onEditStart(index)} className="p-1 hover:bg-orange-100 rounded text-gray-400 hover:text-orange-600 transition-colors" title="Editar">
                                            ✏️
                                        </button>
                                    )}
                                    {onRemove && (
                                        <button onClick={() => onRemove(index)} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 transition-colors" title="Remover">
                                            🗑️
                                        </button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
