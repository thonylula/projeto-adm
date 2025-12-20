import React from 'react';
import type { InvoiceData } from '../types';

interface PantryListProps {
    data: InvoiceData;
    employeeNames: string[];
    sloganImage?: string | null;
    companyName: string;
    recipientCnpj?: string;
    companyLogo?: string | null;
}

export const PantryList: React.FC<PantryListProps> = ({ data, employeeNames, companyName, sloganImage, companyLogo }) => {
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg print:shadow-none print:p-0">
            <div className="flex justify-between items-center mb-8 border-b-2 border-slate-900 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{companyName}</h1>
                    <h2 className="text-xl font-bold text-indigo-600 mt-1">Conferência de Cestas Básicas</h2>
                </div>
                {companyLogo && <img src={companyLogo} alt="Logo" className="h-16 w-auto" />}
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total de Funcionários</p>
                    <p className="text-2xl font-black text-slate-900">{employeeNames.length}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Total da Nota Fiscal</p>
                    <p className="text-2xl font-black text-indigo-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalValue)}
                    </p>
                </div>
            </div>

            <div className="mb-10">
                <h3 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wide">Itens para Distribuição</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="px-4 py-3 text-xs font-bold uppercase">Item</th>
                                <th className="px-4 py-3 text-xs font-bold uppercase text-center">NF Total</th>
                                <th className="px-4 py-3 text-xs font-bold uppercase text-center">Por Cesta</th>
                                <th className="px-4 py-3 text-xs font-bold uppercase text-center">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item, index) => {
                                const qtyPerEmployee = Math.floor(item.quantity / employeeNames.length);
                                const remainder = item.quantity % employeeNames.length;
                                return (
                                    <tr key={index} className="border-b border-slate-100">
                                        <td className="px-4 py-4 text-sm font-bold text-slate-700">{item.description}</td>
                                        <td className="px-4 py-4 text-sm text-center font-mono">{item.quantity} {item.unit}</td>
                                        <td className="px-4 py-4 text-sm text-center bg-indigo-50/50 font-black text-indigo-700">
                                            {qtyPerEmployee > 0 ? `${qtyPerEmployee} ${item.unit}` : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-center text-slate-400">
                                            {remainder > 0 ? `Sobra: ${remainder}` : 'Exato'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-auto pt-8 border-t flex justify-between items-center text-xs text-slate-400 italic font-medium">
                <span>* Tabela gerada automaticamente para apoio logístico.</span>
                {sloganImage && <img src={sloganImage} alt="Slogan" className="h-8 w-auto opacity-50 grayscale" />}
            </div>

            <div className="mt-8 text-center print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
                >
                    Imprimir Lista de Conferência
                </button>
            </div>
        </div>
    );
};
