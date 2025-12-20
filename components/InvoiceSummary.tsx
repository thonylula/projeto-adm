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
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-500 print:shadow-none print:border">
            <div className="p-6">
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{companyName || 'Empresa'}</h2>
                        {data.recipientCnpj && <p className="text-sm text-gray-500">CNPJ: {data.recipientCnpj}</p>}
                    </div>
                    {companyLogo && <img src={companyLogo} alt="Logo" className="h-16 w-auto object-contain" />}
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Total da Nota</p>
                        <p className="text-2xl font-black text-indigo-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalValue)}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Total de Itens</p>
                        <p className="text-2xl font-black text-slate-900">{data.items.length}</p>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        Itens Identificados
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Qtd</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Un</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Descrição</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Preço Unit.</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item, index) => (
                                    <tr key={item.id || index} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">{item.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.description}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-indigo-600 font-bold text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {sloganImage && (
                    <div className="mt-8 flex justify-center border-t pt-6">
                        <img src={sloganImage} alt="Slogan" className="h-12 w-auto opacity-70" />
                    </div>
                )}
            </div>
        </div>
    );
};
