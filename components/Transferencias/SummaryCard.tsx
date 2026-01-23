import React from 'react';
import type { ProcessedData } from '../../types';

interface SummaryCardProps {
    data: ProcessedData;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ data }) => {
    return (
        <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">{data.local} → {data.viveiroDestino}</h4>
                    <p className="text-xl font-bold text-gray-800">{(data.estocagem || 0).toLocaleString('pt-BR')} PLs</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${data.isParcial ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {data.isParcial ? 'Parcial' : 'Total'}
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 font-bold uppercase">
                <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="opacity-60 mb-0.5">Peso Médio</p>
                    <p className="text-gray-900">{data.pesoMedioCalculado.toFixed(4)}g</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="opacity-60 mb-0.5">Total (kg)</p>
                    <p className="text-gray-900">{(data.pesoTotalCalculado || 0).toFixed(2)}kg</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="opacity-60 mb-0.5">Densidade</p>
                    <p className="text-gray-900">{data.densidade || '-'}</p>
                </div>
            </div>
            {data.tipo === 'VENDA' && data.clienteNome && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Cliente: {data.clienteNome}</p>
                </div>
            )}
        </div>
    );
};
