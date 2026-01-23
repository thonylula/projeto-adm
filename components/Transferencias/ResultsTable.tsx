import React from 'react';
import type { ProcessedData, ExtractedData } from '../../types';

interface ResultsTableProps {
    data: ProcessedData[];
    editingIndex?: number | null;
    onEditStart?: (index: number) => void;
    onEditSave?: (index: number, updatedData: Partial<ExtractedData>) => void;
    onEditCancel?: () => void;
    onRemove?: (index: number) => void;
    clients?: any[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
    data,
    editingIndex,
    onEditStart,
    onEditSave,
    onEditCancel,
    onRemove,
    clients = []
}) => {
    return (
        <div className="overflow-hidden border-t-2 border-gray-100">
            <table className="w-full text-xs text-left text-gray-500 border-collapse">
                <thead className="text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50">
                    <tr>
                        <th className="px-5 py-5">Origem</th>
                        <th className="px-5 py-5">Data</th>
                        <th className="px-5 py-5">Povoamento</th>
                        <th className="px-5 py-5 text-right">Estocagem</th>
                        <th className="px-5 py-5 text-right">PL/g</th>
                        <th className="px-5 py-5 text-right">Peso Médio (g)</th>
                        <th className="px-5 py-5 text-right">Qtd (kg)</th>
                        <th className="px-5 py-5 text-right">Densidade</th>
                        <th className="px-5 py-5">Destino</th>
                        <th className="px-5 py-5 text-center">Tipo</th>
                        {(onEditStart || onRemove) && <th className="px-5 py-5 text-center text-orange-600">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {data.map((item, index) => {
                        const isEditing = editingIndex === index;
                        return (
                            <tr key={index} className={`transition-colors ${isEditing ? 'bg-orange-50/50' : 'bg-white hover:bg-orange-50/10'}`}>
                                {isEditing ? (
                                    <>
                                        <td className="px-5 py-5"><input type="text" defaultValue={item.local} onBlur={(e) => onEditSave?.(index, { local: e.target.value })} className="w-full p-2 border rounded font-black text-gray-900 text-[13px]" /></td>
                                        <td className="px-5 py-5"><input type="text" defaultValue={item.data} onBlur={(e) => onEditSave?.(index, { data: e.target.value })} className="w-full p-2 border rounded text-gray-400" /></td>
                                        <td className="px-5 py-5"><input type="text" defaultValue={item.dataPovoamento} onBlur={(e) => onEditSave?.(index, { dataPovoamento: e.target.value })} className="w-full p-2 border rounded text-gray-400" /></td>
                                        <td className="px-5 py-5"><input type="number" defaultValue={item.estocagem} onBlur={(e) => onEditSave?.(index, { estocagem: Number(e.target.value) })} className="w-full p-2 border rounded text-right" /></td>
                                        <td className="px-5 py-5"><input type="number" defaultValue={item.plPorGrama} onBlur={(e) => onEditSave?.(index, { plPorGrama: Number(e.target.value) })} className="w-full p-2 border rounded text-right" /></td>
                                        <td className="px-5 py-5 text-right font-medium text-gray-400">{(item.pesoMedioCalculado || 0).toFixed(4)}g</td>
                                        <td className="px-5 py-5 text-right font-bold text-gray-700">{(item.pesoTotalCalculado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                                        <td className="px-5 py-5">
                                            <input
                                                type="text"
                                                defaultValue={item.densidade}
                                                onBlur={(e) => onEditSave?.(index, { densidade: e.target.value })}
                                                className="w-full p-2 border rounded text-right text-gray-700"
                                            />
                                        </td>
                                        <td className="px-5 py-5">
                                            {item.tipo === 'VENDA' ? (
                                                <select
                                                    value={item.clienteId || ''}
                                                    onChange={(e) => {
                                                        const client = clients.find(c => c.id === e.target.value);
                                                        onEditSave?.(index, {
                                                            clienteId: e.target.value,
                                                            clienteNome: client?.name || '',
                                                            viveiroDestino: client?.name || ''
                                                        });
                                                    }}
                                                    className="w-full p-2 border rounded font-black text-gray-900 text-[13px] bg-white shadow-sm"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {clients.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input type="text" defaultValue={item.viveiroDestino} onBlur={(e) => onEditSave?.(index, { viveiroDestino: e.target.value })} className="w-full p-2 border rounded font-black text-gray-900 text-[13px]" />
                                            )}
                                        </td>
                                        <td className="px-5 py-5 text-center">
                                            <div className="flex flex-col gap-1">
                                                <select
                                                    value={item.tipo || 'TRANSFERENCIA'}
                                                    onChange={(e) => onEditSave?.(index, { tipo: e.target.value as 'TRANSFERENCIA' | 'VENDA' })}
                                                    className="text-[9px] font-black uppercase p-1 border rounded"
                                                >
                                                    <option value="TRANSFERENCIA">Transf</option>
                                                    <option value="VENDA">Venda</option>
                                                </select>
                                                <button
                                                    onClick={() => onEditSave?.(index, { isParcial: !item.isParcial })}
                                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.isParcial ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}
                                                >
                                                    {item.isParcial ? 'Parcial' : 'Total'}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                                            <button onClick={() => onEditCancel?.()} className="p-2 bg-green-500 text-white rounded shadow-sm hover:bg-green-600 transition-all font-black" title="Concluir">
                                                ✓
                                            </button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-5 py-5 font-black text-gray-900 text-[13px]">{item.local}</td>
                                        <td className="px-5 py-5 font-medium text-gray-400">{item.data || '-'}</td>
                                        <td className="px-5 py-5 font-medium text-gray-400">{item.dataPovoamento || '-'}</td>
                                        <td className="px-5 py-5 text-right font-medium text-gray-400">{(item.estocagem || 0).toLocaleString('pt-BR')}</td>
                                        <td className="px-5 py-5 text-right font-medium text-gray-400">{item.plPorGrama}</td>
                                        <td className="px-5 py-5 text-right font-medium text-gray-400">{(item.pesoMedioCalculado || 0).toFixed(4)}g</td>
                                        <td className="px-5 py-5 text-right font-bold text-gray-700">{(item.pesoTotalCalculado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                                        <td className="px-5 py-5 text-right font-medium text-gray-400">{item.densidade || '-'}</td>
                                        <td className="px-5 py-5 font-black text-gray-900 text-[13px]">
                                            {item.viveiroDestino}
                                            {item.tipo === 'VENDA' && item.clienteNome && (
                                                <div className="text-[10px] text-orange-600 uppercase font-black">Cliente: {item.clienteNome}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-5 text-center">
                                            <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest 
                                                ${item.tipo === 'VENDA'
                                                    ? 'bg-orange-100 text-orange-600'
                                                    : item.isParcial ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                                {item.tipo === 'VENDA' ? 'Venda' : ''} {item.isParcial ? 'Parcial' : 'Total'}
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
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
