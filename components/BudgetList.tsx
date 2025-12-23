import React from 'react';
import { InvoiceItem } from '../types';

interface BudgetListProps {
    items: InvoiceItem[];
    companyName: string;
}

export const BudgetList: React.FC<BudgetListProps> = ({ items, companyName }) => {
    const totalSum = items.reduce((sum, item) => sum + item.total, 0);
    const currentDate = new Date().toLocaleDateString('pt-BR');

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div id="budget-list" className="bg-white p-1 min-h-[500px]" style={{ border: '6px solid #f97316' }}>
            {/* Header */}
            <div className="p-4 border-b-2 mb-4" style={{ borderColor: '#f97316' }}>
                <h1 className="text-xl font-black uppercase text-slate-800 text-center leading-tight">
                    LISTA DE PRODUTOS PARA CESTAS BÁSICAS - {companyName || 'OCEAN'}
                </h1>
                <p className="text-sm font-black text-slate-600 text-center mt-1 uppercase">
                    (PESQUISADO NO APP PREÇO DA HORA) - {currentDate}
                </p>
            </div>

            {/* Table */}
            <div className="px-4">
                <table className="w-full text-left border-collapse border-2" style={{ borderColor: '#f97316' }}>
                    <thead>
                        <tr className="bg-orange-50" style={{ borderBottom: '2px solid #f97316' }}>
                            <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-700" style={{ borderColor: '#f97316' }}>Quant.</th>
                            <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-700" style={{ borderColor: '#f97316' }}>Uni. de Medida</th>
                            <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-700" style={{ borderColor: '#f97316' }}>Produto</th>
                            <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-700" style={{ borderColor: '#f97316' }}>Preço Unit.</th>
                            <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-700" style={{ borderColor: '#f97316' }}>Valor Total</th>
                            <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-700" style={{ borderColor: '#f97316' }}>Estabelecimento</th>
                            <th className="p-2 text-[10px] font-black uppercase text-slate-700">Endereço</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2" style={{ borderColor: '#f97316' }}>
                        {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2 border-r-2 text-[10px] font-bold text-slate-800" style={{ borderColor: '#f97316' }}>
                                    {item.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-2 border-r-2 text-[10px] font-bold text-slate-800" style={{ borderColor: '#f97316' }}>
                                    {item.unit}
                                </td>
                                <td className="p-2 border-r-2 text-[10px] font-black text-slate-900 uppercase" style={{ borderColor: '#f97316' }}>
                                    {item.description}
                                </td>
                                <td className="p-2 border-r-2 text-[10px] font-bold text-slate-800" style={{ borderColor: '#f97316' }}>
                                    {formatCurrency(item.price)}
                                </td>
                                <td className="p-2 border-r-2 text-[10px] font-black text-indigo-700" style={{ borderColor: '#f97316' }}>
                                    {formatCurrency(item.total)}
                                </td>
                                <td className="p-2 border-r-2 text-[10px] font-bold text-slate-700 uppercase" style={{ borderColor: '#f97316' }}>
                                    {item.issuerName || '---'}
                                </td>
                                <td className="p-2 text-[9px] font-medium text-slate-500 uppercase leading-tight">
                                    {item.issuerAddress || '---'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 border-t-4" style={{ borderColor: '#f97316' }}>
                            <td colSpan={4} className="p-3 text-right text-[11px] font-black uppercase text-slate-700 border-r-2" style={{ borderColor: '#f97316' }}>
                                SOMA TOTAL:
                            </td>
                            <td className="p-3 text-[12px] font-black text-indigo-800" colSpan={3}>
                                {formatCurrency(totalSum)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Footer space */}
            <div className="p-8 text-center mt-12 opacity-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projeto ADM - Gestão de Cestas Básicas</p>
            </div>
        </div>
    );
};
