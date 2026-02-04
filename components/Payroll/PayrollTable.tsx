
import React from 'react';
import { PayrollHistoryItem } from '../../types';

interface PayrollTableProps {
    history: PayrollHistoryItem[];
    isPublic: boolean;
    onEdit: (e: React.MouseEvent, item: PayrollHistoryItem) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onCopySummary: (e: React.MouseEvent, summary: string, id: string) => void;
    onReceipt: (item: PayrollHistoryItem) => void;
    onIAHolerite: (item: PayrollHistoryItem) => void;
    formatCurrency: (val: number) => string;
    generateSmartSummary: (item: PayrollHistoryItem) => string;
    copiedId: string | null;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({
    history, isPublic, onEdit, onDelete, onCopySummary, onReceipt, onIAHolerite, formatCurrency, generateSmartSummary, copiedId
}) => {
    const totalCost = history.reduce((acc, item) => acc + (item.result?.grossSalary || 0), 0);

    return (
        <div className="overflow-x-auto print:overflow-visible scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-gray-200 print:bg-slate-200 print:text-black">
                    <tr>
                        <th className="px-3 py-2 min-w-[120px]">Nome/Ref</th>
                        <th className="px-2 py-2 text-right">Base/Integral</th>
                        <th className="px-2 py-2 text-right bg-indigo-50/50 print:bg-transparent">Extras</th>
                        <th className="px-2 py-2 text-right bg-indigo-50/50 print:bg-transparent">DSR</th>
                        <th className="px-2 py-2 text-right">Noturno</th>
                        <th className="px-2 py-2 text-right">Peric.</th>
                        <th className="px-2 py-2 text-right bg-blue-50/50">Sal.Fam.</th>
                        <th className="px-2 py-2 text-right bg-blue-50/50">Aj.Custo</th>
                        <th className="px-2 py-2 text-right bg-orange-50/50">Prod.</th>
                        <th className="px-2 py-2 text-right bg-orange-50/50">Visitas</th>
                        <th className="px-2 py-2 text-right bg-red-50/50">Empréstimo</th>
                        <th className="px-3 py-2 text-right bg-slate-200 text-slate-900 font-bold print:bg-slate-300">TOTAL BRUTO</th>
                        {!isPublic && <th className="px-2 py-2 text-center print:hidden export-ignore">Opções</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {history.map((item) => (
                        <tr key={item.id} className={`hover:bg-blue-50 transition-colors group print:hover:bg-transparent ${item.input.calculationMode === '13TH' ? 'bg-red-50/30' : ''}`}>
                            <td className="px-3 py-2 font-medium text-slate-900">
                                {item.input.employeeName}
                                <span className="block text-[10px] text-slate-400 font-normal">
                                    {item.input.calculationMode === '13TH'
                                        ? (item.input.thirteenthCalculationType === 'CLT'
                                            ? <span className="text-red-600 font-bold">[13º CLT] {(item.result.thirteenthTotalAvos || 0)}/12</span>
                                            : <span className="text-blue-600 font-bold">[13º Avulso] {(item.result.thirteenthTotalDays || 0)} dias</span>)
                                        : item.input.calculationMode === 'TERMINATION'
                                            ? <span className="text-orange-600 font-bold">[RESCISÃO] {item.input.terminationDate ? new Date(item.input.terminationDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</span>
                                            : `Ref: ${item.input.referenceMonth}/${item.input.referenceYear}`
                                    }
                                </span>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-600">{formatCurrency(item.result.proportionalSalary)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-600 bg-indigo-50/20">{formatCurrency(item.result.overtimeValue)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-indigo-50/20">{formatCurrency(item.result.dsrOvertimeValue + item.result.dsrNightShiftValue)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-600">{formatCurrency(item.result.nightShiftValue)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-600">{formatCurrency(item.result.hazardPayValue)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-blue-50/20">{formatCurrency(item.input.familyAllowance || 0)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-blue-50/20">{formatCurrency(item.input.costAllowance)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-orange-50/20">{formatCurrency(item.input.productionBonus)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-orange-50/20">{formatCurrency(item.result.visitsTotalValue)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-red-500 bg-red-50/20">{item.result.loanDiscountValue > 0 ? `-${formatCurrency(item.result.loanDiscountValue)}` : '-'}</td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-700 bg-slate-50 border-l border-slate-100 tabular-nums print:bg-slate-100 print:text-black">{formatCurrency(item.result.grossSalary)}</td>
                            {!isPublic && (
                                <td className="px-2 py-2 text-center print:hidden export-ignore">
                                    <div className="flex justify-center gap-1 items-center">
                                        <button type="button" onClick={(e) => onCopySummary(e, generateSmartSummary(item), item.id)} className={`p-1 rounded shadow-sm transition-all duration-300 ${copiedId === item.id ? 'bg-emerald-600' : 'bg-slate-600'} text-white shadow-xl`} title="Copiar Resumo">
                                            {copiedId === item.id ? '✓' : '💬'}
                                        </button>
                                        <button type="button" onClick={() => onIAHolerite(item)} className="p-1 bg-indigo-600 text-white rounded text-[10px] font-bold shadow-md">IA</button>
                                        <button type="button" onClick={() => onReceipt(item)} className="p-1 bg-orange-600 text-white rounded text-[10px] font-bold shadow-md">RECIBO</button>
                                        <button type="button" onClick={(e) => onEdit(e, item)} className="p-1 text-amber-500">✎</button>
                                        <button type="button" onClick={(e) => onDelete(e, item.id)} className="p-1 text-red-400">✖</button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white print:bg-slate-800">
                    <tr>
                        <td colSpan={11} className="px-4 py-4 text-right font-bold uppercase text-xs">Total Geral</td>
                        <td className="px-3 py-4 text-right font-bold text-base text-emerald-400 bg-slate-800 tabular-nums print:text-black print:bg-slate-300">{formatCurrency(totalCost)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};
