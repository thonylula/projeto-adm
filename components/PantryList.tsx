import React from 'react';
import type { InvoiceData } from '../types';

interface PantryListProps {
    data: InvoiceData;
    employeeNames: string[];
    motivationalMessages?: string[];
    sloganImage?: string | null;
    companyName: string;
    recipientCnpj?: string;
    companyLogo?: string | null;
}

export const PantryList: React.FC<PantryListProps> = ({
    data,
    employeeNames,
    motivationalMessages = [],
    companyName,
    recipientCnpj,
    companyLogo,
    sloganImage
}) => {
    const formatQty = (qty: number) => qty.toLocaleString('pt-BR', { minimumFractionDigits: 3 });

    return (
        <div className="space-y-8 print:space-y-0">
            {employeeNames.map((name, index) => (
                <div key={index} className="bg-white border-2 border-orange-500 rounded-sm shadow-sm overflow-hidden font-sans text-[#444] print:shadow-none print:border-2 print:mb-0 print:break-after-page min-h-[400px] flex flex-col">
                    {/* Header */}
                    <div className="p-3 border-b border-orange-500 flex justify-between items-center">
                        <div className="space-y-0.5">
                            <h1 className="text-xs font-bold uppercase text-slate-800">{companyName}</h1>
                            <p className="text-[9px] text-slate-500 font-medium">CNPJ: {recipientCnpj || '---'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-700">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="h-1 w-full bg-orange-500" />

                    {/* Motivational Message */}
                    <div className="p-4 text-center">
                        <p className="text-indigo-600 font-bold italic text-sm">
                            "{motivationalMessages[index] || "Sua dedicação é a força que impulsiona nosso sucesso. Obrigado!"}"
                        </p>
                    </div>

                    {/* Table */}
                    <div className="flex-1 px-4 pb-4">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-orange-500">
                                    <th className="py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">DESCRIÇÃO DO PRODUTO</th>
                                    <th className="py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">QUANTIDADE NA CESTA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100">
                                {data.items.map((item, idx) => {
                                    const qtyPerEmployee = item.quantity / employeeNames.length;
                                    return (
                                        <tr key={idx}>
                                            <td className="py-2 text-[11px] font-bold text-slate-800 uppercase leading-snug">{item.description}</td>
                                            <td className="py-2 text-[11px] text-right text-slate-600 font-bold">
                                                {formatQty(qtyPerEmployee)} {item.unit}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Divider */}
                    <div className="h-0.5 w-full border-t-2 border-dashed border-orange-500 mt-auto" />

                    {/* Dummy Duplicate Header for visual reference like in image */}
                    <div className="p-3 bg-slate-50/50 flex justify-between items-center opacity-60">
                        <div className="space-y-0.5">
                            <h1 className="text-[9px] font-bold uppercase text-slate-800">{companyName}</h1>
                            <p className="text-[8px] text-slate-500 font-medium">Portador: {name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-700">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
            ))}

            <div className="mt-8 text-center print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-sm font-black uppercase text-sm hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                >
                    Imprimir Cupons de Entrega (14)
                </button>
            </div>
        </div>
    );
};
