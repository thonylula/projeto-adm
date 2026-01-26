import React from 'react';
import type { ProcessedData } from '../../types';

interface SummaryCardProps {
    data: ProcessedData;
    onEdit?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ data, onEdit }) => {
    return (
        <div className="group relative p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            {onEdit && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="absolute top-2 right-2 p-2 bg-[#C5A059]/10 text-[#C5A059] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#C5A059]/20 z-10"
                    title="Editar lançamento"
                >
                    ✏️
                </button>
            )}
            <div className="flex justify-between items-start mb-2 pr-8">
                <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">{data.local} → {data.viveiroDestino}</h4>
                    <p className="text-xl font-bold text-gray-800">{(data.estocagem || 0).toLocaleString('pt-BR')} PLs</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${data.isParcial ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                    {data.isParcial ? 'Parcial' : 'Total'}
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-2 text-[10px] text-gray-500 font-bold uppercase">
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
                <div className="mt-3 pt-3 border-t border-slate-50">
                    <p className="text-[10px] font-black text-[#C5A059] uppercase tracking-[0.15em]">Cliente: {data.clienteNome}</p>
                </div>
            )}
        </div>
    );
};
