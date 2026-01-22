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
        <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Origem</th>
                        <th className="px-4 py-3 text-right">Estocagem</th>
                        <th className="px-4 py-3 text-right">PL/g</th>
                        <th className="px-4 py-3 text-right">Peso Médio (g)</th>
                        <th className="px-4 py-3 text-right">Peso Total (kg)</th>
                        <th className="px-4 py-3 text-right">Densidade</th>
                        <th className="px-4 py-3">Destino</th>
                        <th className="px-4 py-3 text-center">Tipo</th>
                        {(onEditStart || onRemove) && <th className="px-4 py-3 text-center text-orange-600">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((item, index) => (
                        <tr key={index} className="bg-white hover:bg-orange-50/30 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">{item.data || '-'}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{item.local}</td>
                            <td className="px-4 py-3 text-right">{item.estocagem.toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-3 text-right">{item.plPorGrama}</td>
                            <td className="px-4 py-3 text-right">{item.pesoMedioCalculado.toFixed(4)}g</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{(item.pesoTotalCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                            <td className="px-4 py-3 text-right">{item.densidade || '-'}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{item.viveiroDestino}</td>
                            <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.isParcial ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
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
