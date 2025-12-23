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
        <div
            className="bg-white rounded-sm overflow-hidden font-sans text-[#444] print:shadow-none"
            style={{
                border: '6px solid #f97316',
                margin: '2px',
                WebkitPrintColorAdjust: 'exact'
            }}
        >
            {/* Top Bar with Header Meta */}
            <div className="p-1 px-2 border-b-2 flex justify-between items-center" style={{ borderColor: '#f97316', borderBottom: '2px solid #f97316' }}>
                <div className="space-y-0">
                    <h1 className="text-[11px] font-black uppercase text-slate-800 leading-tight">{companyName || data.recipientName}</h1>
                    <p className="text-[8px] text-slate-500 font-bold leading-tight">CNPJ: {data.recipientCnpj || '---'}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-700 leading-tight">Data: {data.issueDate || '---'}</p>
                </div>
            </div>

            {/* Meta Info Grid - Using Flex for better PDF compatibility */}
            <div
                className="flex flex-wrap p-2 text-xs border-b-2"
                style={{ borderColor: '#f97316', borderBottom: '2px solid #f97316' }}
            >
                {[
                    { label: 'Emitente', value: data.issuerName || '---' },
                    { label: 'Destinatário', value: data.recipientName || '---' },
                    { label: 'Número da Nota', value: data.invoiceNumber || '---' },
                    { label: 'Série', value: data.series || '1' },
                    { label: 'Emissão', value: data.issueDate || '---' },
                    { label: 'Valor Total', value: formatCurrency(data.totalValue), isPrice: true }
                ].map((info, i) => (
                    <div key={i} style={{ width: '33.33%', padding: '1px 2px', marginBottom: '4px' }}>
                        <p className="text-[#999] font-black mb-0 uppercase tracking-tighter text-[7px] leading-tight">{info.label}</p>
                        <p className={`font-black uppercase text-slate-800 leading-tight ${info.isPrice ? 'text-sm text-green-600' : 'text-[9px]'}`}>{info.value}</p>
                    </div>
                ))}
            </div>

            {/* Items Section */}
            <div className="p-1 px-2">
                <div className="flex justify-between items-end mb-0.5">
                    <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                        Itens da Nota
                    </h2>
                    <span className="text-[8px] font-bold text-slate-400">Qtd: {data.items.length}</span>
                </div>
                <div className="h-1 w-full bg-orange-500 mb-1 rounded-none" style={{ backgroundColor: '#f97316' }} />

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-orange-500">
                                <th className="px-2 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Código</th>
                                <th className="px-2 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                                <th className="px-2 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Quantidade</th>
                                <th className="px-2 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Preço Unit.</th>
                                <th className="px-2 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-200">
                            {data.items.map((item, index) => (
                                <tr key={item.id || index} className="hover:bg-orange-50/50 transition-all duration-200 group">
                                    <td className="px-2 py-1.5 text-[10px] font-bold text-slate-400 font-mono tracking-tighter group-hover:text-orange-500">{item.code || '---'}</td>
                                    <td className="px-2 py-1.5 text-[10px] font-extrabold text-slate-800 uppercase leading-snug tracking-tight max-w-md">{item.description}</td>
                                    <td className="px-2 py-1.5 text-[10px] text-right text-slate-700 font-bold bg-slate-50/50">
                                        {item.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} {item.unit}
                                    </td>
                                    <td className="px-2 py-1.5 text-[10px] text-right text-slate-600 font-medium">
                                        {formatCurrency(item.price)}
                                    </td>
                                    <td className="px-2 py-1.5 text-[10px] text-right font-black text-slate-900 bg-orange-50/20">
                                        {formatCurrency(item.total)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t-2 bg-orange-50" style={{ borderTop: '2px solid #f97316' }}>
                                <td colSpan={4} className="px-2 py-1 text-right text-[10px] font-black text-slate-800 uppercase tracking-wide">Total Geral:</td>
                                <td className="px-2 py-1 text-right text-sm font-black text-green-600">
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
