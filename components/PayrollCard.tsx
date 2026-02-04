
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PayrollHistoryItem, Company } from '../types';
import { getOrchestrator } from '../services/agentService';
import { SupabaseService } from '../services/supabaseService';
import { PayrollService, safeNum } from '../services/payrollService';
import { usePayroll } from '../hooks/usePayroll';
import { PayrollTable } from './Payroll/PayrollTable';
import { PayrollReceipt } from './Payroll/PayrollReceipt';

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
    formState, setFormState, result, setResult, editingId, setEditingId, loading, setLoading,
    registeredEmployees, handleInputChange, calculate
  } = usePayroll(activeCompany, activeYear, activeMonth);

  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const [receiptItem, setReceiptItem] = useState<PayrollHistoryItem | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

  const history = (activeCompany.employees || []).filter(item => {
    if (activeYear && item.input.referenceYear !== activeYear) return false;
    if (activeMonth && item.input.referenceMonth !== activeMonth) return false;
    return true;
  });

  if (receiptItem) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-8 overflow-y-auto">
        <div className="bg-white rounded-3xl w-full max-w-4xl p-8">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Recibo</h2>
            <button onClick={() => setReceiptItem(null)} className="text-gray-400">Fechar</button>
          </div>
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
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {!isPublic && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <header className="flex justify-between items-center mb-8">
            <button onClick={onBack} className="text-xs font-bold text-slate-400">← trocar empresa</button>
            <h1 className="text-2xl font-black">{activeCompany.name}</h1>
          </header>

          <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Nome</label>
                <input type="text" value={formState.employeeName} onChange={e => handleInputChange('employeeName', e.target.value)} className="w-full p-3 border rounded-xl" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Salário Base</label>
                <input type="number" value={formState.baseSalary || ''} onChange={e => handleInputChange('baseSalary', parseFloat(e.target.value))} className="w-full p-3 border rounded-xl" required step="0.01" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Horas Extras</label>
                  <input type="number" value={formState.overtimeHours || ''} onChange={e => handleInputChange('overtimeHours', parseFloat(e.target.value))} className="w-full p-3 border rounded-xl" step="0.1" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Ad. Noturno (H)</label>
                  <input type="number" value={formState.nightHours || ''} onChange={e => handleInputChange('nightHours', parseFloat(e.target.value))} className="w-full p-3 border rounded-xl" step="0.1" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg mt-4">
                {editingId ? 'Salvar Alterações' : 'Calcular e Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {history.length > 0 && (
        <div ref={reportRef} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-xl font-bold">Folha Analítica</h2>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm">Imprimir</button>
            </div>
          </div>
          <PayrollTable
            history={history}
            isPublic={isPublic}
            onEdit={(e, item) => { setFormState(item.input); setEditingId(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onDelete={(e, id) => onDeleteEmployee(id)}
            onCopySummary={(e, summary, id) => { navigator.clipboard.writeText(summary); setCopiedSummaryId(id); setTimeout(() => setCopiedSummaryId(null), 2000); }}
            onReceipt={setReceiptItem}
            onIAHolerite={() => alert('Gerando holerite com IA...')}
            formatCurrency={formatCurrency}
            generateSmartSummary={generateSmartSummary}
            copiedId={copiedSummaryId}
          />
        </div>
      )}
    </div>
  );
};
