import React from 'react';
import type { InvoiceData } from '../types';

interface InvoiceSummaryProps {
    data: InvoiceData;
    companyName: string;
    recipientCnpj?: string;
    sloganImage?: string | null;
    companyLogo?: string | null;
}

export const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({ data, companyName, sloganImage, companyLogo }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="bg-white border-2 border-orange-500 rounded-sm shadow-sm overflow-hidden animate-in fade-in duration-500 font-sans text-[#444] print:shadow-none print:border-2">
            {/* Top Bar with Header Meta */}
            <div className="p-4 border-b border-orange-500 flex justify-between items-center">
                <div className="space-y-0.5">
                    <h1 className="text-sm font-bold uppercase text-slate-800">{companyName || data.recipientName}</h1>
                    <p className="text-[10px] text-slate-500 font-medium">CNPJ: {data.recipientCnpj || '---'}</p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-bold text-slate-700">Data de Emissão: {data.issueDate || '---'}</p>
                </div>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 md:gap-y-8 p-6 text-xs border-b border-orange-500">
                <div>
                    <p className="text-[#999] font-semibold mb-1.5 uppercase tracking-tighter text-[10px]">Emitente</p>
                    <p className="font-extrabold uppercase text-slate-800 leading-tight text-sm">{data.issuerName || '---'}</p>
                </div>
                <div>
                    <p className="text-[#999] font-semibold mb-1.5 uppercase tracking-tighter text-[10px]">Destinatário</p>
                    <p className="font-extrabold uppercase text-slate-800 leading-tight text-sm">{data.recipientName || '---'}</p>
                </div>
                <div>
                    <p className="text-[#999] font-semibold mb-1.5 uppercase tracking-tighter text-[10px]">Número da Nota</p>
                    <p className="font-extrabold text-slate-800 text-sm">{data.invoiceNumber || '---'}</p>
                </div>
                <div>
                    <p className="text-[#999] font-semibold mb-1.5 uppercase tracking-tighter text-[10px]">Série</p>
                    <p className="font-extrabold text-slate-800 text-sm">{data.series || '1'}</p>
                </div>
                <div>
                    <p className="text-[#999] font-semibold mb-1.5 uppercase tracking-tighter text-[10px]">Data de Emissão</p>
                    <p className="font-extrabold text-slate-800 text-sm">{data.issueDate || '---'}</p>
                </div>
                <div>
                    <p className="text-[#999] font-semibold mb-1.5 uppercase tracking-tighter text-[10px]">Valor Total</p>
                    <p className="text-xl font-black text-green-600">{formatCurrency(data.totalValue)}</p>
                </div>
            </div>

            {/* Items Section */}
            <div className="p-6">
                <h2 className="text-2xl font-black text-slate-800 mb-1 uppercase tracking-tight">
                    Itens
                </h2>
                <div className="h-1.5 w-full bg-orange-500 mb-6 rounded-none shadow-sm" />

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-orange-500">
                                <th className="px-2 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Código</th>
                                <th className="px-2 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                                <th className="px-2 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Quantidade</th>
                                <th className="px-2 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Preço Unit.</th>
                                <th className="px-2 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-200">
                            {data.items.map((item, index) => (
                                <tr key={item.id || index} className="hover:bg-orange-50/50 transition-all duration-200 group">
                                    <td className="px-2 py-4 text-[11px] font-bold text-slate-400 font-mono tracking-tighter group-hover:text-orange-500">{item.code || '---'}</td>
                                    <td className="px-2 py-4 text-[11px] font-extrabold text-slate-800 uppercase leading-snug tracking-tight max-w-md">{item.description}</td>
                                    <td className="px-2 py-4 text-[11px] text-right text-slate-700 font-bold bg-slate-50/50">
                                        {item.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} {item.unit}
                                    </td>
                                    <td className="px-2 py-4 text-[11px] text-right text-slate-600 font-medium">
                                        {formatCurrency(item.price)}
                                    </td>
                                    <td className="px-2 py-4 text-[11px] text-right font-black text-slate-900 bg-orange-50/20">
                                        {formatCurrency(item.total)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t-2 border-orange-500 bg-orange-50">
                                <td colSpan={4} className="px-2 py-4 text-right text-sm font-black text-slate-800 uppercase tracking-wide">Total Geral:</td>
                                <td className="px-2 py-4 text-right text-lg font-black text-green-600">
                                    {formatCurrency(data.items.reduce((sum, item) => sum + item.total, 0))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 flex justify-between items-center border-t border-slate-100 bg-slate-50/30">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Resumo Automatizado do Sistema</div>
                {companyLogo && <img src={companyLogo} alt="Logo" className="h-8 w-auto opacity-40 grayscale hover:grayscale-0 transition-all" />}
            </div>
        </div>
    );
};
