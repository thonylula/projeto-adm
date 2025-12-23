import React from 'react';
import type { InvoiceData, ItemAllocationConfig } from '../types';

interface PantryListProps {
    data: InvoiceData;
    employeeNames: string[];
    motivationalMessages?: string[];
    sloganImage?: string | null;
    companyName: string;
    recipientCnpj?: string;
    companyLogo?: string | null;
    selectedNonDrinkers?: number[];
    itemAllocation?: Record<string, ItemAllocationConfig>;
    appMode?: 'BASIC' | 'CHRISTMAS' | null;
}

export const PantryList: React.FC<PantryListProps> = ({
    data,
    employeeNames,
    motivationalMessages = [],
    companyName,
    recipientCnpj,
    companyLogo,
    sloganImage,
    selectedNonDrinkers = [],
    itemAllocation = {},
    appMode = 'BASIC'
}) => {
    const formatQty = (qty: number) => qty.toLocaleString('pt-BR', { minimumFractionDigits: 3 });

    const totalEmployees = employeeNames.length;
    const nonDrinkerCount = selectedNonDrinkers.length;
    const drinkerCount = totalEmployees - nonDrinkerCount;

    return (
        <div className="space-y-8 print:space-y-4 print:grid print:grid-cols-1">
            {employeeNames.map((name, index) => {
                const isNonDrinker = selectedNonDrinkers.includes(index);

                // Filter items based on allocation
                const visibleItems = data.items.filter(item => {
                    const config = itemAllocation[item.id] || { mode: 'ALL' };
                    if (config.mode === 'ALL' || config.mode === 'CUSTOM') return true;
                    if (isNonDrinker && config.mode === 'NON_DRINKER') return true;
                    if (!isNonDrinker && config.mode === 'DRINKER') return true;
                    return false;
                });

                return (
                    <div
                        key={index}
                        className="bg-white rounded-sm shadow-sm overflow-hidden font-sans text-[#444] print:shadow-none print:mb-2 print:break-inside-avoid flex flex-col relative christmas-card overflow-visible"
                        style={{ border: '4px solid #f97316', minHeight: '150px' }}
                    >
                        {appMode === 'CHRISTMAS' && (
                            <div className="w-full text-center py-2 border-b border-red-200 hidden print:block">
                                <span className="text-lg">🎄</span>
                                <span className="ml-2 text-xs font-black text-red-600 uppercase tracking-tighter">
                                    Boas Festas 2025-2026
                                </span>
                            </div>
                        )}

                        {/* Tag for special basket */}
                        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[7px] font-black uppercase text-white ${isNonDrinker ? 'bg-indigo-600' : 'bg-orange-500'} print:hidden`}>
                            {isNonDrinker ? 'ABSTÊMIO' : 'CESTA PADRÃO'}
                        </div>

                        {/* Header */}
                        <div className="p-2 border-b-2 flex justify-between items-center" style={{ borderColor: '#f97316' }}>
                            <div className="space-y-0.5 text-left">
                                <h1 className="text-lg font-black uppercase text-slate-900 leading-none">{companyName}</h1>
                                <p className="text-xs text-slate-600 font-extrabold">CNPJ: {recipientCnpj || '---'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-800">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>

                        <div className="h-1 w-full" style={{ backgroundColor: '#f97316' }} />

                        {/* Motivational Message */}
                        <div className="p-1 px-4 text-center">
                            <p className="text-indigo-600 font-black italic text-[11px] leading-tight">
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
                                    {visibleItems.map((item, idx) => {
                                        const config = itemAllocation[item.id] || { mode: 'ALL' };
                                        let qtyPerEmployee = 0;

                                        if (config.mode === 'CUSTOM') {
                                            qtyPerEmployee = isNonDrinker
                                                ? (config.customQtyNonDrinker || 0)
                                                : (config.customQtyDrinker || 0);
                                        } else if (config.mode === 'ALL') {
                                            qtyPerEmployee = item.quantity / totalEmployees;
                                        } else if (config.mode === 'NON_DRINKER' && isNonDrinker) {
                                            qtyPerEmployee = item.quantity / (nonDrinkerCount || 1);
                                        } else if (config.mode === 'DRINKER' && !isNonDrinker) {
                                            qtyPerEmployee = item.quantity / (drinkerCount || 1);
                                        }

                                        return (
                                            <tr key={idx}>
                                                <td className="py-2 text-[11px] font-bold text-slate-800 uppercase leading-snug">{item.description}</td>
                                                <td className="py-2 text-[11px] text-right text-slate-600 font-bold">
                                                    {formatQty(qtyPerEmployee)} {item.unit}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {visibleItems.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum item alocado para este grupo</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Divider */}
                        <div className="h-0.5 w-full border-t-2 border-dashed border-orange-500 mt-auto" />

                        {/* Dummy Duplicate Header for visual reference like in image */}
                        <div className="p-3 bg-slate-50/50 flex justify-between items-center opacity-60">
                            <div className="space-y-0.5 flex-1">
                                <h1 className="text-[9px] font-bold uppercase text-slate-800">{companyName}</h1>
                                <p className="text-[8px] text-slate-500 font-medium">
                                    Portador: <span className="font-black underline">{name}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-700 flex items-center justify-end gap-1">
                                    {isNonDrinker ? '🥤 CESTA ESPECIAL' : '🍺 CESTA PADRÃO'}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}


        </div>
    );
};
