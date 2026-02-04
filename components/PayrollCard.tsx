
import React, { useState, useRef, useCallback } from 'react';
import { PayrollHistoryItem, Company } from '../types';
import { usePayroll } from '../hooks/usePayroll';
import { PayrollTable } from './Payroll/PayrollTable';
import { PayrollReceipt } from './Payroll/PayrollReceipt';
import { PayrollPeriodSelector } from './Payroll/PayrollPeriodSelector';

interface PayrollCardProps {
  activeCompany: Company;
  activeYear?: number | null;
  activeMonth?: number | null;
  onBack: () => void;
  onAddEmployee: (newItem: PayrollHistoryItem) => void;
  onUpdateEmployee: (updatedItem: PayrollHistoryItem) => void;
  onDeleteEmployee: (itemId: string) => void;
  onBulkUpdateEmployees: (newEmployees: PayrollHistoryItem[]) => void;
  onSaveBulk: (newEmployees: PayrollHistoryItem[]) => void;
  isPublic?: boolean;
}

export const PayrollCard: React.FC<PayrollCardProps> = ({
  activeCompany, activeYear, activeMonth, onBack, onAddEmployee, onUpdateEmployee, onDeleteEmployee, onBulkUpdateEmployees, onSaveBulk, isPublic = false
}) => {
  const {
    formState, setFormState, result, setResult, editingId, setEditingId,
    registeredEmployees, handleInputChange, calculate, history,
    viewedYear, viewedMonth, setViewedYear, setViewedMonth
  } = usePayroll(activeCompany, activeYear, activeMonth);

  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const [receiptItem, setReceiptItem] = useState<PayrollHistoryItem | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = calculate();
    const newItem: PayrollHistoryItem = {
      id: editingId || crypto.randomUUID(),
      timestamp: new Date().toLocaleString('pt-BR'),
      rawDate: new Date().toISOString(),
      input: { ...formState },
      result: res
    };
    if (editingId) onUpdateEmployee(newItem); else onAddEmployee(newItem);
    setEditingId(null);
    setResult(null);
  };

  const generateSmartSummary = useCallback((item: PayrollHistoryItem): string => {
    const { input, result } = item;
    const parts = [`${input.employeeName}: ${formatCurrency(result.grossSalary)}`];
    if (result.overtimeValue > 0) parts.push(`HE: ${formatCurrency(result.overtimeValue)}`);
    return parts.join(' | ').toUpperCase();
  }, []);

  if (receiptItem) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8 overflow-y-auto backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-[32px] w-full max-w-4xl p-10 shadow-2xl relative">
          <button
            onClick={() => setReceiptItem(null)}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <PayrollReceipt
            item={receiptItem}
            activeCompany={activeCompany}
            registeredEmployees={registeredEmployees}
            formatCurrency={formatCurrency}
            generateSmartSummary={generateSmartSummary}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {!isPublic && (
        <div className="bg-white rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] p-10 border border-slate-100/50">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div className="space-y-1">
              <button onClick={onBack} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1 transition-all mb-2 group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> trocar empresa
              </button>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{activeCompany.name}</h1>
            </div>

            <PayrollPeriodSelector
              year={viewedYear}
              month={viewedMonth}
              onChangeYear={setViewedYear}
              onChangeMonth={setViewedMonth}
            />
          </header>

          <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Funcionário</label>
                <input type="text" value={formState.employeeName} onChange={e => handleInputChange('employeeName', e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-50/50 transition-all placeholder:text-slate-300" required placeholder="Ex: João Silva" />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Salário Base (R$)</label>
                <input type="number" value={formState.baseSalary || ''} onChange={e => handleInputChange('baseSalary', parseFloat(e.target.value))} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-50/50 transition-all placeholder:text-slate-300" required step="0.01" placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">H. Extras</label>
                  <input type="number" value={formState.overtimeHours || ''} onChange={e => handleInputChange('overtimeHours', parseFloat(e.target.value))} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-50/50 transition-all placeholder:text-slate-300" step="0.1" placeholder="0.0" />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ad. Noturno (H)</label>
                  <input type="number" value={formState.nightHours || ''} onChange={e => handleInputChange('nightHours', parseFloat(e.target.value))} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-50/50 transition-all placeholder:text-slate-300" step="0.1" placeholder="0.0" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black text-lg rounded-[20px] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-tighter">
                {editingId ? 'Salvar Alterações' : 'Calcular e Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {history.length > 0 && (
        <div ref={reportRef} className="bg-white rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100/50 mb-20 animate-in fade-in zoom-in-95 duration-500 delay-200">
          <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">Folha Analítica</h2>
              <div className="px-3 py-1 bg-indigo-100/50 text-indigo-700 text-[10px] font-black uppercase rounded-full inline-block">
                {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(viewedYear, viewedMonth - 1)).toUpperCase()}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => window.print()} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Imprimir Espelho
              </button>
            </div>
          </div>
          <PayrollTable
            history={history}
            isPublic={isPublic}
            onEdit={(e, item) => { setFormState(item.input); setEditingId(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onDelete={(e, id) => onDeleteEmployee(id)}
            onCopySummary={(e, summary, id) => { navigator.clipboard.writeText(summary); setCopiedSummaryId(id); setTimeout(() => setCopiedSummaryId(null), 2000); }}
            onReceipt={setReceiptItem}
            onIAHolerite={() => alert('Recurso IA em desenvolvimento para esta versão modular.')}
            formatCurrency={formatCurrency}
            generateSmartSummary={generateSmartSummary}
            copiedId={copiedSummaryId}
          />
        </div>
      )}
    </div>
  );
};
