
import React from 'react';

interface PayrollPeriodSelectorProps {
    year: number;
    month: number;
    onChangeYear: (year: number) => void;
    onChangeMonth: (month: number) => void;
    isDarkMode?: boolean;
}

export const PayrollPeriodSelector: React.FC<PayrollPeriodSelectorProps> = ({
    year, month, onChangeYear, onChangeMonth, isDarkMode
}) => {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

    return (
        <div className={`flex items-center gap-3 p-2 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'} no-print`}>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Período:</span>
                <select
                    value={month}
                    onChange={e => onChangeMonth(parseInt(e.target.value))}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-700'} hover:border-indigo-500`}
                >
                    {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <select
                    value={year}
                    onChange={e => onChangeYear(parseInt(e.target.value))}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-700'} hover:border-indigo-500`}
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div className="w-px h-6 bg-slate-300 mx-1"></div>

            <button
                onClick={() => {
                    const now = new Date();
                    onChangeYear(now.getFullYear());
                    onChangeMonth(now.getMonth() + 1);
                }}
                className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all uppercase tracking-tighter"
            >
                Hoje
            </button>
        </div>
    );
};
